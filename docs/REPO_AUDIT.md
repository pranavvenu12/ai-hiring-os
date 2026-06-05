# Repository Audit

## Scope

Audited tracked files, app source, scripts, tests, docs, deployment files, and assets.

## KEEP

| Path | Reason |
| --- | --- |
| `backend/app/**` | Active FastAPI application code |
| `frontend/src/**` | Active React application code |
| `backend/scripts/demo_readiness_audit.py` | Idempotent demo data and readiness audit utility |
| `backend/scripts/final_audit_snapshot.py` | Final database/Supabase integrity snapshot utility |
| `backend/scripts/init_db.py` | Simple table initialization utility |
| `backend/scripts/seed_journeysync_employees.py` | Narrow JourneySync employee seed helper retained for reference |
| `backend/tests/**` | Runtime verification and security test scripts |
| `backend/test_files/*.pdf` | Resume upload/extraction test fixtures |
| `load_tests/**` | Locust load testing assets |
| `docs/*.md` | Architecture, deployment, audit, and judge-prep documentation |
| `frontend/public/favicon.png` | Active favicon |
| `render.yaml`, `frontend/vercel.json`, `docker-compose.aws.yml`, `backend/Dockerfile` | Deployment configuration |

## ARCHIVE

| Path | Reason |
| --- | --- |
| `backend/tests/audit_phase2.py`, `backend/tests/audit_phase3_final.py`, `backend/tests/test_phase3.py`, `backend/tests/test_phase5.py` | Useful historical verification scripts; can move to `archive/tests/` after FWC submission |
| `backend/test_files/broken.pdf`, `backend/test_files/scanned.pdf` | Negative/edge fixtures; keep until post-demo cleanup |
| Older phase docs such as `docs/IMPLEMENTATION_PLAN.md` | Useful context but less important than final audit docs |

## DELETE

No files were deleted during this audit. Nothing was identified as safe to remove before the hackathon without risking traceability or demo fallback.

## Issues Found

- A hardcoded Groq API key default existed in `backend/app/core/config.py`.
- Vercel deployed frontend bundle still contains the configured API URL `https://ai-hiring-os.duckdns.org`.
- Multiple historical test/audit scripts exist. They are not harmful, but should be archived after submission.

## Issues Fixed

- Removed the hardcoded Groq key default. Groq is now environment-driven.

## Recommendation

Do not delete files before FWC evaluation. Archive historical tests and older phase docs only after the demo.
