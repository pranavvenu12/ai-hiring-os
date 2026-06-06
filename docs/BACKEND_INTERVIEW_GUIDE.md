# Backend Interview Guide

This guide is written for defending the AI Hiring OS backend in an interview. It explains the actual implementation and gives ready answers for likely backend questions.

## 1. One-Minute Backend Pitch

AI Hiring OS uses FastAPI with async SQLAlchemy, Supabase Postgres, Supabase Auth, and Supabase Storage. Supabase Auth handles identity, while the local `users` table controls app roles and tenant membership. Every major business module is tenant-scoped by `company_id`. The backend supports public candidate applications, resume storage, PDF extraction, AI resume scoring, shortlisting, public AI interviews, employee management, attendance, performance, payroll, realtime WebSocket updates, and a read-only recruiter copilot agent.

## 2. Request Lifecycle

Authenticated request lifecycle:

1. Frontend sends bearer token from Supabase Auth.
2. FastAPI route depends on `CurrentUser`.
3. `CurrentUser` calls `verify_jwt`.
4. `verify_jwt` validates the token with Supabase.
5. Backend resolves local `User` by `supabase_uid` or email.
6. Route checks role with `require_roles` or inline role checks.
7. Route checks tenant by comparing records to `current_user.company_id`.
8. Service function performs business logic.
9. SQLAlchemy session commits through `get_db`.
10. Response schema/data is returned.

Public candidate request lifecycle:

1. Candidate calls public job or public interview route.
2. No Supabase JWT is required.
3. Backend validates job/session ID.
4. Data is still tied to tenant through job/session company ID.
5. Resume/interview records are stored under the relevant company.

## 3. Authentication and RBAC

Supabase Auth stores passwords and issues JWTs. The backend stores app-level users in the `users` table.

Why both are needed:

- Supabase Auth knows who can login.
- Backend `users` knows which company the user belongs to.
- Backend `users` knows whether the user is admin, HR, manager, or employee.

`get_current_user` is the bridge:

- It validates the token.
- It resolves the local app user.
- It syncs Supabase UID by email if needed.
- It rejects tokens that do not map to a local app user.

RBAC:

- `admin`: highest role.
- `hr`: HR operations, hiring, payroll.
- `manager`: team and hiring read/write in selected areas.
- `employee`: own profile, own attendance, own payroll, own performance.

Tenant isolation:

- Most business queries include `company_id`.
- Routes also check ownership after fetching records.
- Admin can sometimes view all companies/users.
- HR/manager/employee are limited to their own company.

## 4. Database Design

Core tables:

- `companies`: tenant organizations.
- `company_profiles`: optional tenant metadata.
- `users`: app users linked to Supabase Auth.
- `jobs`: job postings.
- `resumes`: candidate applications.
- `ai_scores`: resume scoring results.
- `employees`: employee profiles.
- `attendance_records`: daily attendance.
- `performance_reviews`: review records.
- `payroll_records`: monthly payroll.
- `interview_sessions`: AI interview state and results.
- `agent_sessions`: recruiter copilot sessions.
- `agent_actions`: individual copilot tool traces.
- `interview_agent_history`: adaptive interview trace.

Important constraints:

- One AI score per resume: `ai_scores.resume_id` unique.
- One attendance record per employee per date.
- One payroll record per employee per month/year.
- One employee code unique per company.
- User email unique.
- Supabase UID unique.

## 5. Resume and AI Scoring Deep Dive

Public apply endpoint:

```text
POST /jobs/public/{job_id}/apply
```

Implemented behavior:

1. Validates job exists and is open.
2. Validates uploaded file is a non-empty PDF.
3. Uploads file to Supabase Storage bucket `resumes`.
4. Stores generated public URL in `resumes.file_url`.
5. Creates resume row with candidate name, email, phone.
6. Publishes `resume.uploaded`.
7. Starts background extraction.
8. Extracts text using PyMuPDF.
9. Updates `resumes.extracted_text`.
10. Publishes `resume.processed`.
11. Runs evaluation pipeline.
12. Stores result in `ai_scores`.
13. Publishes `ai_score.generated`.

AI scoring pipeline:

- `evaluation_service.run_full_evaluation` coordinates everything.
- `scoring_service.calculate_deterministic_scores` always runs.
- `ai_service.generate_ai_insights` tries Gemini, Groq, and Hugging Face.
- If LLM scoring fails, deterministic fallback is used.
- `ai_score_service.create_or_update_ai_score` persists final score.

Deterministic score:

- `skill_match_score`: overlap between job keywords and resume keywords.
- `semantic_score`: token Jaccard similarity.
- `score`: `0.6 * skill_match_score + 0.4 * semantic_score`.

## 6. Shortlist to Public Interview Flow

Endpoint:

```text
POST /jobs/candidates/{resume_id}/shortlist
```

Flow:

1. Fetch resume by ID.
2. Fetch resume job.
3. Verify job belongs to current user's company.
4. Set `resume.hiring_status = "shortlisted"`.
5. Find existing interview session for this candidate.
6. If none exists, call `interview_service.start_interview`.
7. Start interview in `in_progress`.
8. Generate first adaptive question.
9. Store question trace in `interview_agent_history`.
10. Build public URL:

```text
{FRONTEND_BASE_URL}/public-interview/{session_id}
```

11. Call `email_service.send_interview_invite`.
12. Return URL and email status.

Important:

- Candidate does not need an account.
- Public route uses session ID as access token.
- If SMTP is missing, email is skipped but the interview URL is still returned.

## 7. Public Candidate Interview

Backend public endpoints:

```text
GET  /interviews/public/{session_id}
POST /interviews/public/{session_id}/answer
POST /interviews/public/{session_id}/voice-answer
POST /interviews/public/{session_id}/voice-fallback
POST /interviews/public/{session_id}/next-question
POST /interviews/public/{session_id}/complete
```

What happens:

- Candidate loads interview details.
- Candidate answers current question.
- Backend appends answer to transcript.
- Candidate requests next adaptive question.
- Backend generates next question from job, resume, transcript, skill gaps, and voice metrics.
- Candidate completes interview.
- Backend evaluates transcript and stores final scorecard.

Why this exists:

- Candidates applying from careers page are not employees.
- They do not have Supabase Auth accounts.
- The public interview URL lets them complete interviews without logging in.

## 8. AI Interview Agent

Files:

- `services/interview_service.py`
- `services/interview_ai_service.py`
- `models/agent.py`

Adaptive behavior:

- Initial question is deterministic and resume-aware.
- Next questions use LLM prompt when provider is configured.
- If LLM fails, fallback questions cover project deep dive, problem solving, behavioral, scalability, and leadership.
- Every generated question is saved in `interview_agent_history`.

Evaluation behavior:

- LLM returns:
  - `ai_summary`
  - `technical_score`
  - `communication_score`
  - `confidence_score`
  - `overall_score`
  - `recommendation`
  - strengths
  - areas for improvement
- Template evaluation is used as fallback.
- Voice metrics can override communication/confidence/fluency values.

## 9. Voice Interview Processing

File:

- `services/assemblyai_service.py`

Flow:

1. Backend receives audio.
2. Audio is uploaded to AssemblyAI.
3. Backend creates transcription job.
4. Backend polls until complete.
5. Transcript text is returned.
6. Metrics are calculated:
   - word count
   - duration
   - speaking pace
   - filler words
   - filler word rate
   - communication score
   - confidence score
   - fluency score
7. `interview_service.submit_voice_answer` stores transcript and metrics.

Fallback:

- Browser speech-recognition text can be submitted through `voice-fallback`.
- Backend calculates derived voice metrics even without AssemblyAI.

## 10. Recruiter Copilot Agent

Endpoint:

```text
POST /agent/ask
```

Files:

- `routes/agent.py`
- `services/agent_service.py`
- `services/agent_tools.py`
- `models/agent.py`

How it works:

1. User sends a natural language message.
2. `agent_service._plan_tools` chooses tools from keywords.
3. Tools execute through `TOOL_REGISTRY`.
4. Every tool call is saved as `AgentAction`.
5. Final answer is composed from tool outputs.
6. `AgentSession` stores message, answer, tools, suggestions, and status.
7. Realtime events are published.

Tools:

- `list_jobs`: jobs and candidate counts.
- `get_job_details`: one job's full details.
- `list_candidates`: candidate score list.
- `get_candidate_profile`: candidate resume, score, interview summary.
- `compare_candidates`: ranking by resume and interview score.
- `recommend_shortlist`: advisory shortlist and manual review buckets.
- `get_interview_results`: interview scores and recommendations.
- `get_employee_stats`: employee, attendance, performance snapshot.
- `get_payroll_summary`: payroll totals and status counts.

Safety:

- Agent tools are read-only.
- Agent cannot shortlist, reject, hire, approve payroll, mark paid, or edit employees.
- Suggested actions require human/recruiter action.

## 11. Payroll Deep Dive

Files:

- `routes/payroll.py`
- `services/payroll_service.py`
- `models/payroll.py`

Payroll generation:

- Admin/HR passes employee, month, year, salary values.
- Service validates employee belongs to company.
- Service calculates working days for the month.
- Service counts attendance records.
- Service calculates salary and deductions.
- Service creates or updates monthly payroll row.
- Service can generate an AI summary if an AI provider is configured.

Access:

- Admin/HR can generate, approve, mark paid.
- Manager can list company payroll but cannot mutate.
- Employee can view only own payroll.

Status transitions:

- `generated` can become `approved`.
- `approved` can become `paid`.
- Invalid transitions raise errors.

## 12. Realtime System

Endpoint:

```text
WebSocket /ws?token=<supabase_access_token>
```

How it works:

1. WebSocket receives token in query string.
2. Backend validates token with Supabase.
3. Backend resolves local user.
4. Connection is stored by company ID.
5. Services publish events to a company.
6. Only connections in that company receive the event.

Important service:

- `realtime_service.manager`

Events:

- resume upload/processed
- AI score generated
- interview started/completed
- next question generated
- agent started/tool called/completed

## 13. File-by-File Backend Explanation

### App and package files

- `backend/app/__init__.py`: package marker.
- `backend/app/main.py`: app construction, lifespan, CORS, router registration, root endpoint.
- `backend/app/api/__init__.py`: API package marker.
- `backend/app/api/routes/__init__.py`: routes package marker.
- `backend/app/core/__init__.py`: core package marker.
- `backend/app/db/__init__.py`: database package marker.
- `backend/app/auth/__init__.py`: auth package marker.
- `backend/app/models/__init__.py`: imports all models so SQLAlchemy metadata sees them.
- `backend/app/schemas/__init__.py`: schemas package marker.
- `backend/app/services/__init__.py`: services package marker.

### Core/auth/db files

- `core/config.py`: environment config and async database URL normalization.
- `core/security.py`: role enum and role hierarchy.
- `db/base.py`: SQLAlchemy declarative base.
- `db/session.py`: async engine, async session factory, `get_db`.
- `auth/supabase_auth.py`: Supabase clients, JWT verification, signup, login.
- `api/deps.py`: current user dependency and role guards.

### Route files

- `routes/health.py`: health check.
- `routes/auth.py`: login/signup and onboarding rules.
- `routes/users.py`: current user, user listing, user creation, dashboard AI.
- `routes/companies.py`: company list/create/get/update.
- `routes/jobs.py`: jobs, public jobs, applications, resume upload, candidate list, shortlist, job status.
- `routes/employees.py`: employee CRUD and role-specific employee listing.
- `routes/attendance.py`: clock in/out, own/team/company attendance.
- `routes/performance.py`: reviews and performance analytics.
- `routes/payroll.py`: payroll generation, list, own payroll, approval, paid marking.
- `routes/interviews.py`: authenticated and public AI interview flows.
- `routes/realtime.py`: tenant-scoped WebSocket.
- `routes/agent.py`: recruiter copilot endpoint.

### Model files

- `models/company.py`: tenant table.
- `models/company_profile.py`: optional company metadata.
- `models/user.py`: local app user linked to Supabase Auth.
- `models/job.py`: job posting.
- `models/resume.py`: candidate resume/application.
- `models/ai_score.py`: resume AI score.
- `models/employee.py`: employee profile and manager hierarchy.
- `models/attendance.py`: daily attendance.
- `models/performance.py`: review records.
- `models/payroll.py`: monthly payroll.
- `models/interview.py`: AI interview sessions.
- `models/agent.py`: agent and adaptive interview trace tables.

### Schema files

- `schemas/auth.py`: token/login/auth response.
- `schemas/user.py`: user payloads.
- `schemas/company.py`: company payloads.
- `schemas/job.py`: job payloads.
- `schemas/resume.py`: resume output.
- `schemas/candidate.py`: candidate plus score output.
- `schemas/employee.py`: employee payloads.
- `schemas/attendance.py`: attendance responses.
- `schemas/performance.py`: review and analytics responses.
- `schemas/payroll.py`: payroll request/response contracts.
- `schemas/interview.py`: interview request/response contracts.
- `schemas/agent.py`: copilot request/response contracts.

### Service files

- `services/user_service.py`: local user lookup, list, create, Supabase UID sync.
- `services/company_service.py`: company lookup/create/update and profile flattening.
- `services/job_service.py`: create, get, list tenant jobs.
- `services/resume_service.py`: create resume, update extracted text, list candidates with scores.
- `services/storage_service.py`: uploads PDFs to Supabase bucket `resumes`.
- `services/extraction_service.py`: extracts PDF text with PyMuPDF.
- `services/scoring_service.py`: deterministic keyword/Jaccard scoring.
- `services/ai_service.py`: resume AI scoring and dashboard AI search provider calls.
- `services/ai_score_service.py`: create/update/read `ai_scores`.
- `services/evaluation_service.py`: orchestrates resume scoring pipeline.
- `services/interview_service.py`: interview session creation, answer handling, voice handling, completion, adaptive next question, analytics.
- `services/interview_ai_service.py`: interview question generation, adaptive question generation, evaluation, provider fallback, template fallback.
- `services/assemblyai_service.py`: AssemblyAI transcription and voice metrics.
- `services/email_service.py`: SMTP interview invite with safe skipped status when SMTP missing.
- `services/employee_service.py`: employee CRUD, employee code generation, auto profile creation, team lookup.
- `services/attendance_service.py`: clock in/out and attendance analytics.
- `services/performance_service.py`: review creation and performance analytics.
- `services/payroll_service.py`: salary calculation, payroll generation/list/status transitions, AI summaries.
- `services/realtime_service.py`: WebSocket connection manager and event publishing.
- `services/agent_service.py`: copilot planning, tool execution, trace persistence, answer composition.
- `services/agent_tools.py`: tenant-scoped read-only tool registry.

### Script/test files

- `scripts/init_db.py`: create DB tables.
- `scripts/check_db_phase3.py`: phase 3 table checks.
- `scripts/create_test_pdfs.py`: PDF fixture helper.
- `scripts/seed_journeysync_employees.py`: JourneySync employee seeding.
- `scripts/demo_readiness_audit.py`: demo data audit and repair.
- `scripts/final_audit_snapshot.py`: final health/report snapshot.
- `tests/run_tests.py`: general backend verification.
- `tests/verify_all.py`: full validation suite.
- `tests/test_phase3.py`: AI pipeline tests.
- `tests/test_phase5.py`: HRMS module tests.
- `tests/audit_phase2.py`: phase 2 audit.
- `tests/audit_phase3_final.py`: phase 3 final audit.
- `tests/audit_resume.pdf`: PDF test fixture.

## 14. 50 Backend Interview Questions and Answers

1. What backend framework is used?
Answer: FastAPI.

2. What database layer is used?
Answer: Async SQLAlchemy with asyncpg.

3. What database is used?
Answer: Supabase Postgres.

4. What handles authentication?
Answer: Supabase Auth handles identity and JWTs.

5. Why is there also a local `users` table?
Answer: To store app role, company tenant, active status, and Supabase UID mapping.

6. How is a user authenticated on a protected route?
Answer: The backend reads the bearer token, validates it with Supabase, then resolves the local user.

7. What is `CurrentUser`?
Answer: A FastAPI dependency alias that returns the authenticated local `User`.

8. How is RBAC implemented?
Answer: With `Role`, `ROLE_HIERARCHY`, `require_roles`, `require_min_role`, and route-level checks.

9. What roles exist?
Answer: admin, hr, manager, employee.

10. How is tenant isolation enforced?
Answer: By filtering and checking records against `current_user.company_id`.

11. Can employees see all jobs?
Answer: No. `GET /jobs` rejects employees.

12. Can candidates login?
Answer: Public candidates do not need accounts.

13. How does a candidate apply?
Answer: Through `POST /jobs/public/{job_id}/apply`.

14. Where are resumes stored?
Answer: Supabase Storage bucket `resumes`.

15. What path is used for resume files?
Answer: `{company_id}/{uuid}.{extension}`.

16. Where is the resume URL stored?
Answer: `resumes.file_url`.

17. How is resume text extracted?
Answer: PyMuPDF reads PDF bytes in `extraction_service.extract_text_from_pdf`.

18. Is extraction synchronous?
Answer: It is scheduled as a FastAPI background task after the resume row is created.

19. How is a candidate scored?
Answer: Deterministic scoring plus optional LLM scoring, then persisted to `ai_scores`.

20. What AI providers are used for resume scoring?
Answer: Gemini first, Groq second, Hugging Face third.

21. What happens if all AI providers fail?
Answer: Deterministic fallback score is used.

22. What is deterministic score based on?
Answer: Keyword overlap and token Jaccard similarity.

23. What table stores AI scores?
Answer: `ai_scores`.

24. Can there be multiple AI score rows for one resume?
Answer: No, `resume_id` is unique.

25. What happens when a candidate is shortlisted?
Answer: Resume status becomes `shortlisted`, an interview session is created if needed, and an interview URL is returned.

26. Does shortlist always send email?
Answer: It attempts email, but if SMTP is missing it returns `smtp_not_configured` and still returns the link.

27. What is the public interview URL?
Answer: `{FRONTEND_BASE_URL}/public-interview/{session_id}`.

28. What backend route powers the public interview page?
Answer: `/interviews/public/{session_id}` and related public answer/complete/next-question routes.

29. Does the public interview require auth?
Answer: No.

30. What table stores interview sessions?
Answer: `interview_sessions`.

31. Where are adaptive question traces stored?
Answer: `interview_agent_history`.

32. What starts an interview?
Answer: `interview_service.start_interview`.

33. What status does a new interview use?
Answer: `in_progress`.

34. How does next question generation work?
Answer: It uses job description, resume text, transcript, skill gaps, voice metrics, and provider fallback.

35. What limits adaptive interviews?
Answer: `generate_next_question` defaults to `max_questions=5`.

36. How is voice interview transcription done?
Answer: AssemblyAI upload and transcription APIs.

37. What if AssemblyAI is unavailable?
Answer: Browser voice fallback can submit transcript text and derived metrics.

38. What payroll table is used?
Answer: `payroll_records`.

39. How does payroll avoid duplicate monthly records?
Answer: Unique constraint on employee, month, and year.

40. Who can approve payroll?
Answer: Admin and HR.

41. Can managers mark payroll as paid?
Answer: No.

42. What creates employee codes?
Answer: `_generate_employee_code` in `employee_service.py`.

43. Can an employee be hard deleted?
Answer: The route soft-deletes by setting status to `terminated`.

44. How is duplicate attendance prevented?
Answer: Unique constraint on employee and attendance date plus service check.

45. How is attendance status derived?
Answer: 8 or more hours present, 4 to under 8 half day, under 4 absent.

46. What does the realtime WebSocket use for auth?
Answer: Supabase JWT token in query string.

47. How are realtime messages tenant-scoped?
Answer: Connections are grouped by `company_id`.

48. Is the recruiter copilot allowed to modify records?
Answer: No, it is read-only and advisory.

49. Where are copilot traces stored?
Answer: `agent_sessions` and `agent_actions`.

50. What is the biggest backend design principle?
Answer: Keep auth identity external in Supabase, enforce tenant and role rules inside the backend.
