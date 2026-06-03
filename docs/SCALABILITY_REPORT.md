# Scalability Report

## Scope

This report documents the concurrency baseline framework for AI Hiring OS. It does not claim a 5000-user load test. The implemented load test validates the architecture path for authenticated HRMS/recruiting workflows and provides a repeatable script for staged testing.

## Load Test Tooling

- Tool: Locust `2.32.5`
- Test file: `load_tests/locustfile.py`
- Fixture: `load_tests/sample_resume.pdf`
- Required environment:

```bash
set LOCUST_EMAIL=<hr-or-admin-email>
set LOCUST_PASSWORD=<password>
set LOCUST_JOB_ID=<optional-job-id>
```

## Covered Flows

| Flow | Endpoint |
|---|---|
| Login | `POST /auth/login` |
| Candidate listing | `GET /jobs/{job_id}/candidates` |
| Resume upload | `POST /jobs/{job_id}/upload-resumes` |
| Payroll retrieval | `GET /payroll` |

## Run Plan

Run these against the deployed backend, not a laptop dev server:

```bash
python -m locust -f load_tests/locustfile.py --host https://ai-hiring-os.duckdns.org --headless -u 100 -r 10 -t 5m --csv load_tests/results/100_users
python -m locust -f load_tests/locustfile.py --host https://ai-hiring-os.duckdns.org --headless -u 250 -r 25 -t 5m --csv load_tests/results/250_users
python -m locust -f load_tests/locustfile.py --host https://ai-hiring-os.duckdns.org --headless -u 500 -r 50 -t 5m --csv load_tests/results/500_users
```

## Verification Performed

The Locust test definition was validated with:

```bash
python -m locust -f load_tests/locustfile.py --list
```

Result: `AIHiringOSUser` was discovered successfully.

## Architecture Scaling Analysis

FastAPI scales well here because the backend is async, request handlers are lightweight, and slow AI work is separated from most request/response flows. The next production scaling step is moving resume and interview processing from `BackgroundTasks` to durable workers.

PostgreSQL scales for this workload because HRMS data is relational, tenant-scoped, indexed by company and period, and paginated. The most important future tuning items are query plans for dashboards, connection pool limits, read replicas for analytics, and materialized aggregates.

Supabase scales the managed database/auth/storage layers with pooled PostgreSQL connections and object storage. The app must still control API concurrency, avoid long transactions, and use the Supabase service-role key only on the backend.

React scales on the frontend because the app is a static bundle, CDN-deployable, and role-specific pages only fetch the data they need. WebSockets now reduce repeated polling while retaining polling fallback on critical pages.

## Remaining Scaling Work

- Run and archive the 100/250/500-user CSV results against production.
- Add durable queue workers for AI resume/interview processing.
- Add API rate limits for public application upload and auth.
- Add structured metrics and alerting.
