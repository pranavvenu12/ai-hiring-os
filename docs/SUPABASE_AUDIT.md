# Supabase Audit

## Verified Components

| Component | Status | Evidence |
| --- | --- | --- |
| Supabase Auth reachable with service role | PASS | Admin user listing succeeded |
| Supabase Storage reachable | PASS | Bucket listing succeeded |
| Storage bucket `resumes` exists | PASS | `bucket_exists: true` |
| Database reachable | PASS | Async SQLAlchemy queries succeeded |
| JourneySync Auth users | PASS | 9 Auth users listed |
| JourneySync `users` rows | PASS | 9 rows |
| JourneySync `employees` rows | PASS | 9 rows |

## Database Counts

| Table | Count |
| --- | ---: |
| companies | 3 |
| users | 14 |
| jobs | 2 |
| resumes | 3 |
| ai_scores | 3 |
| employees | 21 |
| attendance_records | 48 |
| performance_reviews | 9 |
| interview_sessions | 7 |
| payroll_records | 21 |
| agent_sessions | 5 |
| agent_actions | 14 |
| interview_agent_history | 5 |

## RLS / Policies

RLS policy definitions were not introspected from Supabase dashboard metadata in this local audit. The application currently enforces tenant isolation in FastAPI and uses the service role server-side for Auth/Storage operations.

## Service Role Usage

Used in:

- JWT validation through Supabase `get_user`
- Admin user management in audit/demo scripts
- Resume storage upload
- Storage bucket inspection

## Storage

| Check | Status |
| --- | --- |
| Bucket name | `resumes` |
| Bucket exists | PASS |
| Demo resume physical URL | PASS |
| Demo resume DB URL | PASS |

## Risks

- Storage bucket public/read policy should be reviewed in Supabase dashboard before production.
- RLS database policies were not fully verified from dashboard metadata.
- Service role must remain backend-only and never be exposed to frontend.
