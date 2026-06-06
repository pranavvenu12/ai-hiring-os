# Backend Interview Cheatsheet

## Stack

- Framework: FastAPI
- DB ORM: async SQLAlchemy
- DB driver: asyncpg
- Database: Supabase Postgres
- Auth: Supabase Auth
- Storage: Supabase Storage
- Resume parsing: PyMuPDF
- AI providers: Gemini, Groq, Hugging Face Router
- Voice transcription: AssemblyAI
- Realtime: FastAPI WebSocket

## Main Files

- App entry: `backend/app/main.py`
- Config: `backend/app/core/config.py`
- Roles: `backend/app/core/security.py`
- DB session: `backend/app/db/session.py`
- Auth helpers: `backend/app/auth/supabase_auth.py`
- Current user/RBAC: `backend/app/api/deps.py`
- Routes: `backend/app/api/routes`
- Models: `backend/app/models`
- Schemas: `backend/app/schemas`
- Business logic: `backend/app/services`

## Request Flow

```text
Frontend -> FastAPI route -> Pydantic schema -> CurrentUser/RBAC -> service -> SQLAlchemy -> Supabase Postgres -> response
```

## Auth Flow

```text
Supabase JWT -> verify_jwt -> local users lookup -> role/company_id checks -> endpoint logic
```

Key answer:

> Supabase Auth proves identity. The backend `users` table proves application role and tenant membership.

## Roles

- `admin`: top-level access.
- `hr`: hiring, employees, attendance analytics, payroll.
- `manager`: team views and selected hiring actions.
- `employee`: own profile, own attendance, own performance, own payroll.

## Tenant Isolation

Most records are scoped by `company_id`.

Typical check:

```python
if record.company_id != current_user.company_id:
    raise HTTPException(status_code=404)
```

Admin is the exception in selected company/user listing paths.

## Core Tables

- `companies`: tenant.
- `company_profiles`: optional tenant details.
- `users`: app user role and company.
- `jobs`: job posting.
- `resumes`: candidate application.
- `ai_scores`: resume score.
- `employees`: employee profile.
- `attendance_records`: clock-in/out.
- `performance_reviews`: employee reviews.
- `payroll_records`: salary records.
- `interview_sessions`: AI interview.
- `agent_sessions`: copilot conversation.
- `agent_actions`: copilot tool trace.
- `interview_agent_history`: adaptive interview question trace.

## Candidate Apply Flow

```text
GET /jobs/public
GET /jobs/public/{job_id}
POST /jobs/public/{job_id}/apply
```

Backend work:

1. Validate open job.
2. Validate PDF.
3. Upload to Supabase Storage bucket `resumes`.
4. Insert `resumes` row.
5. Extract PDF text in background.
6. Store extracted text.
7. Run AI evaluation.
8. Store `ai_scores`.
9. Candidate appears in dashboard.

## Resume AI Score

Files:

- `evaluation_service.py`
- `scoring_service.py`
- `ai_service.py`
- `ai_score_service.py`

Provider order:

```text
Gemini -> Groq -> Hugging Face -> deterministic fallback
```

Deterministic scoring:

```text
final = 30% skills + 25% embeddings + 20% RAG evidence + 10% role context + 10% resume evidence + 5% phrase evidence
```

This is not plain Jaccard similarity. The fallback scorer uses skill aliases, negation-aware skill matching, sentence embeddings, cosine similarity, RAG-style chunk evidence, role/domain context, resume evidence, and learning-to-rank weighting. LLM providers can still override this with structured reasoning when configured.

## Shortlist Flow

Endpoint:

```text
POST /jobs/candidates/{resume_id}/shortlist
```

What it does:

- Sets `resumes.hiring_status = shortlisted`.
- Creates `interview_sessions` row if missing.
- Generates first adaptive question.
- Returns public interview link.
- Attempts email invite.

Public URL:

```text
{FRONTEND_BASE_URL}/public-interview/{session_id}
```

If SMTP is not configured:

- Email is not sent.
- Backend returns `smtp_not_configured`.
- Interview URL still works.

## Public Interview Flow

```text
GET  /interviews/public/{session_id}
POST /interviews/public/{session_id}/answer
POST /interviews/public/{session_id}/next-question
POST /interviews/public/{session_id}/complete
```

Voice routes:

```text
POST /interviews/public/{session_id}/voice-answer
POST /interviews/public/{session_id}/voice-fallback
```

Key answer:

> Candidate interviews are public session-link based because candidates do not have accounts.

## Authenticated Interview Admin Flow

```text
POST /interviews/start
POST /interviews/{session_id}/answer
POST /interviews/{session_id}/next-question
POST /interviews/{session_id}/complete
GET  /interviews/{session_id}
GET  /interviews/company/analytics
```

HR/admin can administer interviews from dashboard. Candidate should use public interview page.

## Interview AI

Question generation:

```text
initial adaptive question -> answer -> next adaptive question -> complete -> evaluation
```

Adaptive context:

- job description
- resume text
- transcript
- missing skills
- voice metrics

Max questions:

- default `5`

Evaluation stores:

- technical score
- communication score
- confidence score
- fluency score
- overall score
- recommendation
- summary
- final agent report

## Voice Metrics

AssemblyAI gives transcript. Backend calculates:

- word count
- duration
- speaking pace
- filler words
- filler word rate
- communication score
- confidence score
- fluency score

Browser fallback route can store transcript text without AssemblyAI.

## Employee Module

Files:

- `employees.py`
- `employee_service.py`
- `employee.py`

Access:

- HR/admin: all employees.
- Manager: self and direct reports.
- Employee: own profile.

Employee code:

```text
EMP-0001, EMP-0002, ...
```

Delete behavior:

- Soft delete: status becomes `terminated`.

## Attendance Module

Clock endpoints:

```text
POST /attendance/clock-in
POST /attendance/clock-out
GET  /attendance/me
GET  /attendance/team
GET  /attendance/company
```

Status rules:

- `>= 8` hours: present
- `>= 4` hours: half_day
- `< 4` hours: absent

Duplicate prevention:

- Unique employee/date constraint.

## Performance Module

Endpoints:

```text
POST /performance
GET  /performance/me
GET  /performance/team
GET  /performance/company
```

Rules:

- Employees cannot create reviews.
- Managers can review only direct reports.
- HR/admin can view company analytics.

## Payroll Module

Endpoints:

```text
POST /payroll/generate
POST /payroll/generate-all
GET  /payroll
GET  /payroll/me
GET  /payroll/{payroll_id}
PUT  /payroll/{payroll_id}/approve
PUT  /payroll/{payroll_id}/mark-paid
```

Rules:

- Admin/HR generate and approve.
- Managers read company payroll.
- Employees read own payslips.

Duplicate prevention:

- Unique employee/month/year.

## Realtime

Endpoint:

```text
WS /ws?token=<supabase_access_token>
```

Flow:

```text
verify token -> resolve user -> connect to company channel -> receive company events
```

Event examples:

- `resume.uploaded`
- `resume.processed`
- `ai_score.generated`
- `interview.started`
- `interview.completed`
- `next_question_generated`
- `agent_started`
- `agent_tool_called`
- `agent_completed`

## Agentic AI

Endpoint:

```text
POST /agent/ask
```

It is agentic because:

- It plans tool calls from a natural language message.
- It executes multiple tenant-scoped tools.
- It records tool traces.
- It composes recommendations from retrieved data.

It is safe because:

- Tools are read-only.
- It cannot mutate hiring/payroll/employee records.
- It returns suggested actions only.

Tools:

- `list_jobs`
- `get_job_details`
- `list_candidates`
- `get_candidate_profile`
- `compare_candidates`
- `recommend_shortlist`
- `get_interview_results`
- `get_employee_stats`
- `get_payroll_summary`

## Common Cross Answers

Why FastAPI?

> It gives async APIs, dependency injection, automatic docs, Pydantic validation, and clean route/service separation.

Why async SQLAlchemy?

> The backend has I/O-heavy work: DB queries, Supabase, AI providers, AssemblyAI, and WebSocket flows.

Why Supabase Auth plus local users?

> Supabase handles secure auth; local users handle business role and tenant logic.

How do candidates interview without login?

> They use the public interview session link generated during shortlist.

What happens if AI is down?

> Resume scoring falls back to deterministic scoring, and interviews fall back to template questions/evaluation.

Can the agent shortlist automatically?

> No. It recommends only. Actual shortlist is a separate authenticated route.

What is the biggest risk?

> Public interview links are bearer-style session IDs. For production, add expiry, signed tokens, and rate limiting.

## Demo Explanation for HR vs Candidate Interview

If the interview is opened from the HR dashboard, HR is administering/simulating the interview. If the candidate is actually attending, they should use:

```text
/public-interview/{session_id}
```

The backend route behind that page is:

```text
/interviews/public/{session_id}
```

The link is returned by the shortlist endpoint.
