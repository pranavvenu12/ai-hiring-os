# Backend Audit

## Validation

| Check | Result |
| --- | --- |
| `python -m compileall backend/app` | PASS |
| Live Render backend `/health` | PASS |
| Live DuckDNS backend `/health` | PASS |
| Live `/agent/ask` route on Render | PASS |
| Live adaptive interview route on Render | PASS |
| Live `/agent/ask` route on DuckDNS | PASS |
| Live adaptive interview route on DuckDNS | PASS |

## Route Surface

The live backend exposes 51 OpenAPI routes, including:

- Auth: `/auth/signup`, `/auth/login`
- User/profile: `/me`, `/users`, `/ask-ai`
- Jobs/candidates/public applications: `/jobs`, `/jobs/public`, `/jobs/public/{job_id}/apply`
- Resume upload/scoring: `/jobs/{job_id}/upload-resumes`, `/jobs/{job_id}/candidates`
- Shortlist/interview bootstrap: `/jobs/candidates/{resume_id}/shortlist`
- Interviews: `/interviews/start`, `/interviews/{session_id}/next-question`, `/interviews/public/{session_id}/next-question`
- HRMS: `/employees`, `/attendance`, `/performance`, `/payroll`
- Agentic AI: `/agent/ask`
- Realtime: WebSocket route under realtime module

## RBAC

| Area | Status |
| --- | --- |
| Jobs list/create | PASS |
| Candidate list | PASS |
| Resume upload | PASS |
| Shortlist | PASS |
| HR interview start | PASS |
| Employee directory | PASS |
| Attendance self/team/company | PASS |
| Performance self/team/company | PASS |
| Payroll self/company/admin actions | PASS |
| Recruiter Copilot | PASS |

## Tenant Isolation

Tenant isolation is consistently based on `company_id`. Database integrity snapshot found:

- `users_without_company`: 0
- `jobs_without_company`: 0
- `employees_without_company`: 0
- `interviews_without_resume`: 0

## Security Notes

- Service-role Supabase client is used only server-side.
- Public candidate routes expose only interview-session-specific data.
- Agent tools are read-only.
- SMTP email sending is optional and environment-driven.
- Hardcoded Groq default was removed during this audit.

## Issues Fixed

- Shortlist now returns an absolute public interview URL and email delivery status.
- Optional SMTP-backed interview invitation service added.
- Groq API key default removed from code.

## Remaining Risks

- No durable background worker queue; resume evaluation still uses FastAPI background tasks.
- No production log inspection was possible without server/hosting console access.
- SMTP env vars are not configured, so email sending is implemented but skipped at runtime.
