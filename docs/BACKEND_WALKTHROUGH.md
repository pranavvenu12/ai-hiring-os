# AI Hiring OS Backend Walkthrough

This document is based on the current backend code under `backend/app`, `backend/scripts`, and `backend/tests`. It explains how the backend is actually structured and how requests move through authentication, tenant isolation, storage, AI scoring, interviews, payroll, realtime events, and the recruiter copilot agent.

## 1. Backend Architecture

AI Hiring OS uses a FastAPI backend with async SQLAlchemy and Supabase services.

Main runtime path:

1. Client calls a REST endpoint or WebSocket endpoint.
2. FastAPI route validates request payload with Pydantic schemas.
3. Authenticated routes use `CurrentUser` from `app/api/deps.py`.
4. `CurrentUser` verifies the Supabase JWT and resolves the app user from the local `users` table.
5. Routes enforce role and tenant rules.
6. Services execute business logic using an async SQLAlchemy session.
7. SQLAlchemy persists to Supabase Postgres.
8. Supabase Storage stores resume files.
9. AI services call Gemini, Groq, or Hugging Face when configured, then fall back to deterministic/template logic.
10. Realtime events are published to tenant-scoped WebSocket connections where relevant.

The backend is not only CRUD. It has these major domains:

- Authentication and onboarding
- Multi-tenant company and user management
- Jobs and public candidate applications
- Resume storage, extraction, and AI scoring
- Candidate shortlisting and public AI interview flow
- Employee directory
- Attendance
- Performance reviews
- Payroll generation and approval
- Realtime updates
- Read-only recruiter copilot agent
- Demo/audit scripts

## 2. Folder Structure

```text
backend/
  app/
    main.py
    api/
      deps.py
      routes/
    auth/
      supabase_auth.py
    core/
      config.py
      security.py
    db/
      base.py
      session.py
    models/
    schemas/
    services/
  scripts/
  tests/
```

### `backend/app/main.py`

This is the FastAPI application entry point.

What it does:

- Creates the `FastAPI` app with title, version, docs path, redoc path, and lifespan.
- Imports all routers and registers them.
- Adds CORS middleware using `settings.cors_origins_list`.
- Defines root endpoint `/`.
- On startup, imports `app.models` so SQLAlchemy registers every model.
- Calls `Base.metadata.create_all`.
- Runs several `ALTER TABLE ADD COLUMN IF NOT EXISTS` statements for columns added after the original schema.
- Creates a unique lower-case company-name index.
- Creates the employee company-code uniqueness constraint if missing.
- Disposes the DB engine on shutdown.

Important startup migrations in this file:

- `jobs.department`
- `jobs.location`
- `jobs.employment_type`
- `jobs.salary_range`
- `jobs.open_until`
- `jobs.status`
- `interview_sessions.interview_transcript`
- `interview_sessions.interview_metrics`
- `interview_sessions.audio_url`
- `interview_sessions.fluency_score`
- `resumes.hiring_status`
- `resumes.email`
- `resumes.phone`
- payroll salary breakdown columns

Registered routers:

- `health`
- `auth`
- `users`
- `companies`
- `jobs`
- `employees`
- `attendance`
- `performance`
- `interviews`
- `payroll`
- `realtime`
- `agent`

Interview answer:

> `main.py` boots the backend, creates the DB metadata during startup for demo convenience, applies compatibility migrations, configures CORS, and registers every API router.

## 3. Core Configuration

### `backend/app/core/config.py`

Defines `Settings`, loaded from `.env` using `pydantic-settings`.

Important environment variables:

- `APP_NAME`
- `APP_ENV`
- `DEBUG`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL`
- `AI_GEMINI_KEY`
- `AI_GROQ_KEY`
- `AI_HF_KEY`
- `AI_HF_BASE_URL`
- `AI_HF_MODEL`
- `ASSEMBLYAI_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `FRONTEND_BASE_URL`
- `CORS_ORIGINS`

Important properties:

- `cors_origins_list`: splits `CORS_ORIGINS` and always includes the Vercel frontend.
- `is_production`: true when `APP_ENV == "production"`.
- `async_database_url`: converts Postgres URLs to `postgresql+asyncpg://`, removes unsupported query params like `sslmode` and `pgbouncer`, and adds `prepared_statement_cache_size=0`.

Why `async_database_url` matters:

- The backend uses async SQLAlchemy with asyncpg.
- Supabase pooler URLs often include PgBouncer behavior.
- Prepared statement caching can break with PgBouncer, so the backend disables it.

### `backend/app/core/security.py`

Defines app roles and hierarchy.

Roles:

- `admin`
- `hr`
- `manager`
- `employee`

Hierarchy:

- employee = 1
- manager = 2
- hr = 3
- admin = 4

This file does not hash passwords. Passwords are handled by Supabase Auth.

## 4. Database Layer

### `backend/app/db/base.py`

Defines:

```python
class Base(DeclarativeBase):
    pass
```

Every SQLAlchemy model inherits from this `Base`.

### `backend/app/db/session.py`

Creates:

- `engine` using `create_async_engine`
- `AsyncSessionLocal`
- `get_db` FastAPI dependency

Important details:

- Uses `settings.async_database_url`.
- Enables `pool_pre_ping`.
- Uses `pool_size=10` and `max_overflow=20`.
- In production, passes `ssl: require`.
- Disables asyncpg statement caching.
- Uses a random prepared statement name function to avoid PgBouncer collisions.
- `get_db` yields a session, commits on success, rolls back on exception, and closes the session.

Interview answer:

> Database writes are coordinated by `get_db`. The dependency commits after the route finishes and rolls back if the route raises.

## 5. Authentication and Authorization

### `backend/app/auth/supabase_auth.py`

This file integrates Supabase Auth.

Main functions:

- `get_supabase_client()`: returns cached service-role Supabase client.
- `get_anon_client()`: returns cached anon-key Supabase client.
- `verify_jwt(token)`: validates token by calling Supabase `auth.get_user(token)` and returns `TokenPayload`.
- `sign_up_with_email(email, password)`: uses anon signup, then tries service-role email confirmation.
- `sign_in_with_email(email, password)`: signs in with Supabase email/password and returns access token, refresh token, and user.

Important distinction:

- Supabase Auth stores login identity and password.
- Local `users` table stores app role, company, active status, and local tenant identity.

### `backend/app/api/deps.py`

This file is the dependency layer for auth and RBAC.

Main parts:

- `bearer_scheme = HTTPBearer(auto_error=False)`
- `get_current_user`
- `CurrentUser`
- `require_roles`
- `require_min_role`

`get_current_user` flow:

1. Reads bearer token from `Authorization`.
2. Calls `verify_jwt`.
3. Looks up local `User` by `supabase_uid`.
4. If not found and token has email, looks up by email.
5. If found by email, syncs `supabase_uid`.
6. Raises 401 if no local app user exists.
7. Returns the local `User`.

`require_roles`:

- Allows only explicitly listed roles.

`require_min_role`:

- Uses `ROLE_HIERARCHY`.
- Allows users at or above the required role.

Interview answer:

> Supabase validates identity, but the backend enforces authorization by resolving a local `User` and checking `role` and `company_id`.

## 6. Data Models

### `backend/app/models/company.py`

Table: `companies`

Purpose:

- Represents a tenant organization.

Important fields:

- `id`
- `name`
- `created_at`

Relationships:

- `users`
- `jobs`
- `payroll_records`
- `profile`

### `backend/app/models/company_profile.py`

Table: `company_profiles`

Purpose:

- Stores optional editable company profile details separate from the core tenant row.

Important fields:

- `company_id`
- `industry`
- `website`
- `location`
- `employee_count_range`
- `contact_email`
- `description`
- `updated_at`

Relationship:

- `company`

### `backend/app/models/user.py`

Table: `users`

Purpose:

- Stores application user records linked to Supabase Auth and a company.

Important fields:

- `id`
- `email`
- `name`
- `role`
- `company_id`
- `supabase_uid`
- `is_active`
- `created_at`

Key constraints:

- `email` is unique.
- `supabase_uid` is unique.

Relationship:

- `company`

### `backend/app/models/job.py`

Table: `jobs`

Purpose:

- Stores job postings created by HR/admin/manager users.

Important fields:

- `id`
- `title`
- `description`
- `department`
- `location`
- `employment_type`
- `salary_range`
- `open_until`
- `status`
- `created_by`
- `company_id`
- `created_at`

Relationships:

- `company`
- `resumes`

### `backend/app/models/resume.py`

Table: `resumes`

Purpose:

- Stores candidate application and resume metadata.

Important fields:

- `id`
- `job_id`
- `candidate_name`
- `file_url`
- `extracted_text`
- `email`
- `phone`
- `hiring_status`
- `created_at`

Relationship:

- `job`

Important:

- Candidates are not app users.
- Public applicants have no Supabase account.
- Candidate interview access is based on public `session_id` route.

### `backend/app/models/ai_score.py`

Table: `ai_scores`

Purpose:

- Stores resume scoring result.

Statuses:

- `pending`
- `processing`
- `completed`
- `failed`

Important fields:

- `resume_id`
- `score`
- `skill_match_score`
- `semantic_score`
- `explanation`
- `summary`
- `matched_skills`
- `missing_skills`
- `status`
- `created_at`

Key constraint:

- `resume_id` is unique, so each resume has one current score row.

### `backend/app/models/employee.py`

Table: `employees`

Purpose:

- Stores employee profile inside a tenant.

Important fields:

- `company_id`
- `user_id`
- `employee_code`
- `full_name`
- `email`
- `phone`
- `department`
- `designation`
- `manager_id`
- `joining_date`
- `employment_type`
- `status`
- `profile_photo`
- `created_at`

Enums:

- `EmploymentType`: full_time, part_time, contract, intern
- `EmployeeStatus`: active, inactive, terminated

Key constraint:

- Unique `(company_id, employee_code)`.

Relationships:

- `company`
- `user`
- `manager`
- `direct_reports`
- `payroll_records`

### `backend/app/models/attendance.py`

Table: `attendance_records`

Purpose:

- Tracks employee clock-in and clock-out records.

Important fields:

- `employee_id`
- `company_id`
- `clock_in`
- `clock_out`
- `total_hours`
- `attendance_date`
- `status`

Status values:

- `present`
- `half_day`
- `absent`

Key constraint:

- Unique `(employee_id, attendance_date)`, so a user cannot clock in twice for the same day.

### `backend/app/models/performance.py`

Table: `performance_reviews`

Purpose:

- Stores employee performance reviews.

Important fields:

- `employee_id`
- `reviewer_id`
- `company_id`
- `rating`
- `strengths`
- `improvements`
- `comments`
- `review_date`
- `created_at`

Relationships:

- `employee`
- `reviewer`

### `backend/app/models/payroll.py`

Table: `payroll_records`

Purpose:

- Stores monthly payroll records derived from attendance and salary inputs.

Status values:

- `draft`
- `generated`
- `approved`
- `paid`

Important fields:

- `company_id`
- `employee_id`
- `month`
- `year`
- `base_salary`
- `basic_salary`
- `allowances`
- `bonuses`
- `manual_deductions`
- `attendance_deductions`
- `present_days`
- `half_days`
- `absent_days`
- `working_days`
- `gross_salary`
- `deductions`
- `net_salary`
- `status`
- `ai_summary`
- `generated_at`
- `approved_at`
- `created_at`
- `updated_at`

Key constraint:

- Unique `(employee_id, month, year)`.

Indexes:

- `company_id`, `year`, `month`
- `employee_id`, `year`, `month`
- `company_id`, `status`

### `backend/app/models/interview.py`

Table: `interview_sessions`

Purpose:

- Stores AI interview sessions, questions, answers, voice metrics, and evaluation.

Important fields:

- `candidate_id`
- `job_id`
- `company_id`
- `interview_type`
- `status`
- `questions`
- `transcript`
- `interview_transcript`
- `interview_metrics`
- `audio_url`
- `ai_summary`
- `technical_score`
- `communication_score`
- `confidence_score`
- `fluency_score`
- `overall_score`
- `recommendation`
- `created_at`

Interview types:

- `technical`
- `behavioral`
- `general`

Statuses:

- `pending`
- `in_progress`
- `completed`

Recommendations:

- `strong_hire`
- `hire`
- `consider`
- `reject`

### `backend/app/models/agent.py`

Tables:

- `agent_sessions`
- `agent_actions`
- `interview_agent_history`

Purpose:

- Stores explainable traces for recruiter copilot and adaptive interview behavior.

`AgentSession`:

- One agent conversation/task.
- Stores `company_id`, `user_id`, message, answer, tools used, suggested actions, status.

`AgentAction`:

- One tool call inside an agent session.
- Stores tool name, input, output, reasoning.

`InterviewAgentHistory`:

- One question-level trace in adaptive interviews.
- Stores question, answer, reasoning, next action, metadata.

## 7. Schemas

Schemas live in `backend/app/schemas`.

They are Pydantic request and response contracts. They do not access the database.

Important schema files:

- `agent.py`: `AgentAskRequest`, `AgentAskResponse`, `AgentToolTrace`.
- `attendance.py`: attendance output and summary response contracts.
- `auth.py`: `TokenPayload`, `LoginRequest`, `AuthResponse`.
- `candidate.py`: candidate response enriched with AI scores.
- `company.py`: company create/update/output contracts.
- `employee.py`: employee create/update/list/output contracts.
- `interview.py`: interview start, answer, browser voice fallback, session output, analytics.
- `job.py`: job create/output/public output contracts.
- `payroll.py`: payroll generation, output, list, status update contracts.
- `performance.py`: review creation and analytics contracts.
- `resume.py`: resume output contract.
- `user.py`: user output/create/update contracts.
- `__init__.py`: package marker.

Interview answer:

> Models define database tables. Schemas define API payloads. Services contain business logic. Routes wire HTTP to services.

## 8. Route Catalog

### Health

`GET /health`

- File: `backend/app/api/routes/health.py`
- Public.
- Returns status, service, version, timestamp.

### Auth

`POST /auth/login`

- File: `backend/app/api/routes/auth.py`
- Body: email and password.
- Calls Supabase sign-in.
- Syncs `supabase_uid` to local user when possible.
- Returns access token and refresh token.

`POST /auth/signup`

- File: `backend/app/api/routes/auth.py`
- Body: name, email, password, role, company name, designation.
- Validates tenant rules.
- Employees/managers can only join existing companies.
- HR/admin can create company when needed.
- Creates or relinks Supabase Auth user.
- Creates or updates local user.
- Creates or links employee profile for manager/employee roles.

### Users

`GET /me`

- Auth required.
- Returns current local user.

`GET /users`

- Auth required.
- Admin sees all users.
- Other roles see only users in current company.

`POST /users`

- Admin/HR only.
- Non-admins can only create users in their own company.

`POST /ask-ai`

- Auth required.
- Sends dashboard context to `ai_service.query_dashboard_ai`.
- Used for topbar AI search style answers.

### Companies

`GET /companies`

- Admin sees all companies.
- Non-admin sees only own company.

`POST /companies`

- Admin only.
- Creates tenant company.

`GET /companies/{company_id}`

- Admin can view any.
- Non-admin can view only own company.

`PUT /companies/{company_id}`

- Admin/HR only.
- HR can edit only own company.

### Jobs and Candidates

`POST /jobs`

- Admin/HR/Manager.
- Creates job for current company.

`GET /jobs`

- Admin/HR/Manager.
- Employee is forbidden.
- Lists tenant jobs.

`GET /jobs/public`

- Public.
- Lists open jobs across companies.
- Used by candidate careers page.

`GET /jobs/public/{job_id}`

- Public.
- Fetches one open public job.

`POST /jobs/public/{job_id}/apply`

- Public.
- Candidate uploads PDF resume and metadata.
- Uploads resume to Supabase Storage.
- Creates `resumes` row.
- Publishes `resume.uploaded`.
- Schedules extraction background task.
- Background task extracts PDF text, updates resume, publishes `resume.processed`, then runs AI evaluation.

`POST /jobs/{job_id}/upload-resumes`

- Admin/HR only.
- Bulk PDF upload for authenticated recruiters.
- Same storage/extraction/evaluation pipeline as public apply.

`GET /jobs/{job_id}/candidates`

- Admin/HR/Manager.
- Employee forbidden.
- Returns resumes joined with AI scores.

`POST /jobs/candidates/{resume_id}/shortlist`

- Admin/HR/Manager.
- Verifies candidate belongs to current tenant.
- Sets `hiring_status = "shortlisted"`.
- Creates interview session if none exists.
- Builds public interview URL from `FRONTEND_BASE_URL`.
- Sends invite if SMTP is configured.
- Returns `interview_url` and `email_status`.

`PATCH /jobs/{job_id}/status`

- Admin/HR/Manager.
- Sets job status to `open` or `closed`.

### Employees

`POST /employees`

- Admin/HR only.
- Creates employee in current company.

`GET /employees`

- HR/admin: all company employees.
- Manager: self plus direct reports.
- Employee: own profile.

`GET /employees/departments`

- Auth required.
- Distinct department names for current company.

`GET /employees/{employee_id}`

- HR/admin: any employee in company.
- Manager: self or direct reports.
- Employee: own profile only.

`PUT /employees/{employee_id}`

- Admin/HR only.
- Updates employee in current company.

`DELETE /employees/{employee_id}`

- Admin/HR only.
- Soft-deletes by setting status to terminated.

### Attendance

`POST /attendance/clock-in`

- Any authenticated user with employee profile.
- Creates today's attendance record.
- Rejects duplicate clock-in.

`POST /attendance/clock-out`

- Any authenticated user with employee profile.
- Calculates hours and status.

`GET /attendance/me`

- Current employee attendance plus today's state.

`GET /attendance/team`

- Manager/HR/Admin.
- Returns attendance for manager direct reports.

`GET /attendance/company`

- Admin/HR only.
- Company-wide attendance summary.

### Performance

`POST /performance`

- Manager/HR/Admin.
- Employee forbidden.
- Manager can review only direct reports.

`GET /performance/me`

- Current employee reviews and average rating.

`GET /performance/team`

- Manager/HR/Admin.
- Returns reviews for manager team.

`GET /performance/company`

- Admin/HR only.
- Returns company performance analytics.

### Payroll

`POST /payroll/generate`

- Admin/HR only.
- Generates one employee payroll record.

`POST /payroll/generate-all`

- Admin/HR only.
- Generates payroll for all active employees.

`GET /payroll`

- Admin/HR/Manager.
- Lists company payroll.
- Managers are read-only.

`GET /payroll/me`

- Current employee payroll history.

`GET /payroll/{payroll_id}`

- Tenant check.
- Employee can only access own payslip.

`PUT /payroll/{payroll_id}/approve`

- Admin/HR only.
- Moves generated payroll to approved.

`PUT /payroll/{payroll_id}/mark-paid`

- Admin/HR only.
- Moves approved payroll to paid.

### Interviews

`POST /interviews/start`

- Admin/HR only.
- Creates interview session for candidate and job.
- Starts adaptive interview with first question.

`POST /interviews/{session_id}/answer`

- Admin/HR only.
- Records text answer.

`POST /interviews/{session_id}/voice-answer`

- Admin/HR only.
- Sends audio to AssemblyAI and stores transcript/voice metrics.

`POST /interviews/{session_id}/voice-fallback`

- Admin/HR only.
- Stores browser speech-recognition transcript and derived metrics.

`POST /interviews/{session_id}/complete`

- Admin/HR only.
- Evaluates interview and stores scorecard.

`POST /interviews/{session_id}/next-question`

- Admin/HR only.
- Generates next adaptive question.

`GET /interviews/{session_id}`

- Admin/HR/Manager.
- Employee forbidden.
- Returns interview details.

`GET /interviews/candidate/{candidate_id}`

- Admin/HR/Manager.
- Returns candidate interview sessions.

`GET /interviews/company/analytics`

- Admin/HR only.
- Returns company interview analytics.

Public candidate interview routes:

- `GET /interviews/public/{session_id}`
- `POST /interviews/public/{session_id}/answer`
- `POST /interviews/public/{session_id}/voice-answer`
- `POST /interviews/public/{session_id}/voice-fallback`
- `POST /interviews/public/{session_id}/complete`
- `POST /interviews/public/{session_id}/next-question`

These public routes do not require candidate accounts. The `session_id` acts as the invitation link token.

### Agentic AI

`POST /agent/ask`

- Admin/HR/Manager only.
- Calls read-only recruiter copilot.
- Uses tenant-scoped tools.
- Persists agent session and actions.
- Publishes agent realtime events.

### Realtime

`WebSocket /ws?token=...`

- Validates Supabase JWT.
- Resolves local user.
- Connects WebSocket to that user's `company_id`.
- Used for tenant-scoped realtime updates.

## 9. Resume Pipeline

Candidate public apply flow:

1. Candidate opens public job.
2. Candidate submits name, email, phone, and PDF resume.
3. `jobs.py` validates job exists, status is open, deadline not expired, and file is PDF.
4. `storage_service.upload_resume` uploads bytes to Supabase Storage bucket `resumes`.
5. Storage path is `{company_id}/{uuid}.{extension}`.
6. Public file URL is generated and stored in `resumes.file_url`.
7. `resume_service.create_resume` inserts resume row.
8. `realtime_service.publish_event` sends `resume.uploaded`.
9. Background task `_process_resume_extraction` extracts PDF text with PyMuPDF.
10. Extracted text is stored in `resumes.extracted_text`.
11. Realtime event `resume.processed` is published.
12. `evaluation_service.run_full_evaluation` starts scoring.
13. `ai_scores.status` moves to `processing`.
14. Deterministic score is calculated.
15. LLM score is attempted through Gemini, Groq, then Hugging Face.
16. If LLM fails, deterministic fallback is used.
17. `ai_scores` row is saved as `completed` or `failed`.
18. Realtime event `ai_score.generated` is published.
19. Candidate appears in dashboard through `GET /jobs/{job_id}/candidates`.

## 10. Shortlist to Interview Flow

Current implemented flow:

1. Candidate applies publicly.
2. Resume is stored, extracted, and scored.
3. Recruiter clicks shortlist.
4. Backend sets `resumes.hiring_status = "shortlisted"`.
5. Backend checks for existing `InterviewSession`.
6. If no session exists, `interview_service.start_interview` creates one.
7. Interview session starts in `in_progress`.
8. First adaptive question is generated.
9. `interview_agent_history` stores first question trace.
10. Backend creates public interview URL: `{FRONTEND_BASE_URL}/public-interview/{session.id}`.
11. Backend attempts email invite through SMTP.
12. If SMTP is not configured, response includes `smtp_not_configured` and still returns the public URL.
13. Candidate uses public interview page without login.
14. Public interview routes submit answers, voice answers, next-question requests, and completion.
15. Recruiter sees results through authenticated interview endpoints and analytics.

Important answer for "Why is HR attending candidate interview?":

> The authenticated HR dashboard can simulate/administer an interview, but real guest candidates use the public interview URL returned by shortlist. The public route is `/public-interview/{session_id}` on the frontend and `/interviews/public/{session_id}` on the backend.

## 11. AI Systems

### Resume AI Scoring

Files:

- `services/evaluation_service.py`
- `services/scoring_service.py`
- `services/ai_service.py`
- `services/ai_score_service.py`

Flow:

- Deterministic baseline always runs.
- Gemini is primary if configured.
- Groq is backup if configured.
- Hugging Face Router is backup if configured.
- If no provider works, deterministic scoring is persisted.

Deterministic scoring:

- Tokenizes resume and job description.
- Extracts simple keyword sets.
- Calculates skill overlap.
- Calculates token Jaccard similarity.
- Final score is 60 percent skill match and 40 percent semantic overlap.

### Interview AI

Files:

- `services/interview_service.py`
- `services/interview_ai_service.py`
- `services/assemblyai_service.py`

Question generation:

- First question uses `generate_initial_adaptive_question`.
- Next questions use `generate_adaptive_question`.
- Providers follow Gemini -> Groq -> Hugging Face -> template fallback.

Evaluation:

- AI returns summary, technical score, communication score, confidence score, overall score, recommendation, strengths, and improvements.
- If provider fails, `_get_template_evaluation` scores based on answer length and completion.

Voice analysis:

- AssemblyAI transcribes audio.
- Metrics include word count, duration, speaking pace, filler words, communication score, confidence score, and fluency score.
- Browser speech fallback can also produce derived metrics.

### Dashboard AI Search

File:

- `services/ai_service.py`

Endpoint:

- `POST /ask-ai`

It answers based only on dashboard context sent by the frontend.

### Recruiter Copilot Agent

Files:

- `routes/agent.py`
- `services/agent_service.py`
- `services/agent_tools.py`
- `models/agent.py`

Agent characteristics:

- Read-only.
- Tenant-scoped.
- Uses explicit tool registry.
- Persists session and tool traces.
- Returns suggestions, not final hiring actions.
- Publishes realtime events.

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

Safety policy:

- The agent cannot hire, reject, approve payroll, pay payroll, or mutate records.
- It recommends human-reviewed next steps.

## 12. HRMS Modules

### Employees

Files:

- `routes/employees.py`
- `services/employee_service.py`
- `models/employee.py`

Important behavior:

- Employee code is generated as `EMP-0001`, `EMP-0002`, etc. per company.
- `get_employee_by_user_id` auto-creates an employee profile for a user if missing.
- HR/admin can see all company employees.
- Managers see self and direct reports.
- Employees see own profile only.

### Attendance

Files:

- `routes/attendance.py`
- `services/attendance_service.py`
- `models/attendance.py`

Important behavior:

- One attendance record per employee per day.
- Clock out derives status:
  - `>= 8` hours: present
  - `>= 4` hours: half_day
  - `< 4` hours: absent
- HR/admin can view company analytics.
- Managers can view team attendance.
- Employees can view own attendance.

### Performance

Files:

- `routes/performance.py`
- `services/performance_service.py`
- `models/performance.py`

Important behavior:

- Employees cannot submit reviews.
- Managers can review only direct reports.
- HR/admin can review company employees.
- Company analytics calculate average rating, top performers, department performance, and recent reviews.

### Payroll

Files:

- `routes/payroll.py`
- `services/payroll_service.py`
- `models/payroll.py`

Important behavior:

- Payroll is attendance-linked.
- Admin/HR generate and approve payroll.
- Managers can view company payroll but not mutate it.
- Employees can view only own payslips.
- Status transitions enforce valid movement.

## 13. Realtime

Files:

- `routes/realtime.py`
- `services/realtime_service.py`

Flow:

1. Client opens `/ws?token=<supabase_access_token>`.
2. Backend verifies Supabase token.
3. Backend resolves local app user.
4. WebSocket is stored under the user's company ID.
5. Domain services publish events by company ID.
6. Only sockets for that tenant receive the event.

Events used in current code:

- `resume.uploaded`
- `resume.processed`
- `ai_score.generated`
- `interview.started`
- `interview.completed`
- `next_question_generated`
- `agent_started`
- `agent_tool_called`
- `agent_completed`

## 14. Scripts

### `backend/scripts/init_db.py`

Initializes database metadata by calling `Base.metadata.create_all`.

### `backend/scripts/check_db_phase3.py`

Checks presence of phase 3 related tables through psycopg2.

### `backend/scripts/create_test_pdfs.py`

Creates minimal PDF fixtures for tests.

### `backend/scripts/seed_journeysync_employees.py`

Seeds JourneySync employees into Supabase Auth, `users`, and `employees`.

### `backend/scripts/demo_readiness_audit.py`

Performs demo data verification and repair:

- JourneySync company
- Demo employees
- Supabase Auth users
- Local users
- Employee profiles
- Attendance
- Payroll
- Performance
- Demo job
- Demo candidate/resume
- Resume storage audit
- Candidate pipeline audit
- Interview session audit
- Auth validation
- Demo health report

It writes `docs/DEMO_READINESS_AUDIT.md`.

### `backend/scripts/final_audit_snapshot.py`

Generates final audit counts and health snapshot for docs.

## 15. Tests and Audit Utilities

### `backend/tests/run_tests.py`

General test runner covering health, auth, multitenancy, RBAC, and data.

### `backend/tests/verify_all.py`

Full verification script for DB validation, employees, attendance, performance, AI interview flow, and security validation.

### `backend/tests/test_phase3.py`

Tests phase 3 AI scoring pipeline.

### `backend/tests/test_phase5.py`

Tests phase 5 HRMS modules.

### `backend/tests/audit_phase2.py`

Audit script for job creation, resume upload, extraction, edge cases, tenant isolation, RBAC, and storage.

### `backend/tests/audit_phase3_final.py`

Final phase 3 audit around auth, AI pipeline, and reporting.

### `backend/tests/audit_resume.pdf`

PDF fixture used by audit tests.

## 16. Key Interview Explanation

The backend is multi-tenant because most domain tables have `company_id`, the current user is resolved from a Supabase JWT into a local `User`, and routes/services filter operations by `current_user.company_id`. Role logic is enforced with `Role` and `require_roles`. Candidate public apply is unauthenticated, but resumes are linked to a job, and jobs are linked to a company. The candidate interview link is public because candidates do not have accounts. The recruiter copilot is agentic in the limited sense that it plans tool calls, executes tenant-scoped read-only tools, stores traces, and suggests actions, but it does not mutate HR or hiring state.
