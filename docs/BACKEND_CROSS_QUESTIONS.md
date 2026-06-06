# Backend Cross Questions

These are harder interview questions based on the current AI Hiring OS backend code. They focus on design tradeoffs, weaknesses, and how to defend or improve the implementation.

## 1. Why do you use Supabase Auth instead of storing passwords yourself?

Supabase Auth handles password security, token issuing, refresh sessions, email confirmation, and provider-level auth concerns. The backend avoids password hashing and only stores app-level identity data in `users`.

## 2. If Supabase Auth validates the user, why does the backend still query the `users` table?

The JWT proves the person is authenticated. It does not prove the user's company, HR role, manager role, employee profile, or app-specific active status. The local `users` table supplies those business permissions.

## 3. What prevents an HR from one company from reading another company's candidates?

Routes compare records against `current_user.company_id`. Example: candidate list first checks that the job belongs to the current company. Shortlist fetches the resume, then the job, then checks the job company.

## 4. Is tenant isolation enforced at the database level or app level?

Currently it is mostly app-level tenant isolation through route and service filters. Supabase/Postgres RLS is not the main enforcement layer in this backend because the app connects through SQLAlchemy and service-role style credentials.

## 5. What would you improve for stronger tenant isolation?

Add database-level Row Level Security policies or dedicated tenant-aware query helpers, require all service queries to include `company_id`, and add tests that attempt cross-company access for every route.

## 6. Why do public candidate routes not require auth?

Candidates applying from a careers page do not have employee accounts. The app uses a public session-link model so the candidate can complete an interview with only the unique session URL.

## 7. What is the security risk of public interview links?

The `session_id` works like a bearer token. If leaked, someone else could open the interview. Production hardening should add signed invite tokens, expiry, one-time usage, rate limiting, and maybe candidate email verification.

## 8. How does the backend ensure public job applications are valid?

`apply_to_public_job` checks job existence, status `open`, `open_until` not expired, PDF file extension, and non-empty file content before storage and DB insertion.

## 9. What happens if resume extraction fails?

The background worker catches exceptions and prints the failure. The resume row may exist with no extracted text, and AI scoring may not complete. A production improvement would persist extraction status and retry metadata.

## 10. Why does deterministic scoring always run even when AI providers exist?

It provides a baseline and fallback. If Gemini, Groq, or Hugging Face fails, the system can still produce a score and keep the demo usable.

## 11. Is the deterministic scoring semantically strong?

Yes, it is now meaningfully stronger than plain keyword/Jaccard matching. It uses skill aliases, negation-aware matching, sentence embeddings, cosine similarity, RAG-style resume/JD evidence chunks, role/domain context, resume evidence, and learning-to-rank weighting. The remaining production work is named entity extraction, recruiter-labeled calibration, bias checks, and score versioning.

## 12. Why does AI scoring store a single row per resume?

The model has a unique `resume_id`, so one resume has one current score. This simplifies dashboards. A production system might add score versions or audit history.

## 13. What prevents duplicate employee attendance records?

Two layers: service logic checks today's existing record before clock-in, and the database has a unique constraint on `(employee_id, attendance_date)`.

## 14. What happens if two clock-in requests race?

The service check can race, but the database unique constraint should reject one insert. A production version should catch the integrity error and return a clean duplicate clock-in message.

## 15. Why does `get_db` commit after every request?

It centralizes transaction handling. If the route succeeds, changes are committed. If an exception occurs, changes are rolled back. Some services also commit internally, which works but is less clean.

## 16. What is one transaction-management weakness?

Some services call `db.commit()` internally while `get_db` also commits at the end. This can make transaction boundaries less obvious. A cleaner pattern is routes own commits or a unit-of-work service owns commits consistently.

## 17. Why does the backend disable asyncpg prepared statement caching?

Supabase/Render PgBouncer-style pooled connections can break prepared statements. Disabling statement caching and using randomized prepared statement names avoids pooler conflicts.

## 18. Why use FastAPI BackgroundTasks for resume extraction?

It lets the upload endpoint return quickly while extraction and scoring continue after the response. For production scale, a queue like Celery, RQ, or a managed worker would be more reliable.

## 19. What happens if the server restarts during a background task?

FastAPI background tasks are in-process. A restart could lose the task. Production should use a durable job queue.

## 20. How does shortlisting connect to the interview system?

The shortlist endpoint updates candidate status, then creates an `InterviewSession` if the candidate does not already have one. It returns the public interview link.

## 21. Does shortlisting require email to be configured?

No. Email is optional. If SMTP settings are missing, `email_service` returns `smtp_not_configured` and the backend still returns the interview URL.

## 22. Why is the recruiter copilot called agentic AI?

It does not just answer with a single prompt. It plans which tools to call, executes multiple tools, records action traces, and composes an answer with suggested next actions.

## 23. Is the recruiter copilot allowed to mutate data?

No. Its tools are explicitly read-only. It can recommend shortlist or interview actions but cannot perform them.

## 24. Why is read-only agent design useful for hiring?

Hiring decisions are sensitive. A read-only agent reduces risk by keeping humans responsible for shortlist, rejection, payroll, and hiring decisions.

## 25. How are agent actions audited?

`AgentSession` stores the full user message, answer, tools used, and suggestions. `AgentAction` stores each tool call, inputs, outputs, and reasoning.

## 26. What is the difference between recruiter copilot and adaptive interview agent?

Recruiter copilot is a dashboard agent that queries HR/hiring data. Adaptive interview agent generates candidate interview questions and stores question-level traces in `interview_agent_history`.

## 27. How does the adaptive interview know what to ask next?

It uses job description, resume text, previous transcript, skill gaps from `ai_scores`, and voice metrics from `interview_metrics`.

## 28. What prevents adaptive interview from running forever?

`generate_next_question` has `max_questions=5` by default and returns `should_continue=False` when enough answers are collected.

## 29. How does the interview evaluation handle unavailable AI providers?

It falls back to template evaluation based on answer length and completion, then calculates scores and recommendation.

## 30. What is a production concern with AI-generated scores?

Bias, explainability, hallucination, and inconsistency. The current system mitigates this partly by storing explanations and requiring human review, but production would need model evaluation, bias testing, versioning, and audit controls.

## 31. What route should candidates use for interviews?

Frontend:

```text
/public-interview/{session_id}
```

Backend:

```text
/interviews/public/{session_id}
```

They should not use the HR dashboard interview admin UI.

## 32. How does payroll use attendance?

Payroll service counts present, half-day, absent, and working days for the month. It uses those counts to calculate gross salary, deductions, and net salary.

## 33. How does payroll prevent duplicate monthly salary records?

The database has a unique constraint on `(employee_id, month, year)`.

## 34. What status transition does payroll enforce?

Generated payroll can be approved. Approved payroll can be marked paid. Invalid status movements raise errors.

## 35. Can an employee see another employee's payroll?

No. `GET /payroll/{payroll_id}` checks tenant first, then checks `employee.user_id == current_user.id` for employee role.

## 36. Why are managers allowed to view payroll list?

The current route allows admin, HR, and manager for `GET /payroll`. The route comment says managers are read-only. This is a product choice and could be restricted if payroll privacy requirements are stricter.

## 37. Does the app create employee profiles automatically?

Yes. Signup creates/links employee profiles for manager/employee roles, and `employee_service.get_employee_by_user_id` can auto-create a profile if missing.

## 38. What is the risk of auto-creating employee profiles?

It can hide data setup issues and create generic department/designation values. It improves demo reliability but production may require HR approval for employee records.

## 39. Why does `main.py` run `create_all` and manual `ALTER TABLE` statements?

It is a demo/dev convenience to keep the database compatible without requiring Alembic migrations. Production should use Alembic migrations.

## 40. What is a weakness of `create_all` in production?

It creates missing tables but does not fully manage schema evolution, constraint changes, data migrations, or rollback history.

## 41. How does WebSocket auth work?

The client sends `token` query param. Backend verifies the Supabase JWT, resolves the local user, and connects the socket under the user's company ID.

## 42. What happens if WebSocket token is missing or invalid?

The backend closes the connection with code `1008`.

## 43. How are realtime events tenant-scoped?

`RealtimeManager` stores active sockets by company ID. `publish_event(company_id, type, payload)` sends only to that company's sockets.

## 44. What happens if an AI provider returns invalid JSON?

Provider parsing raises an exception. The caller catches provider failure and moves to the next provider or fallback.

## 45. Why does the prompt ask for JSON only?

The backend parses model output into structured fields for scores, summaries, skills, questions, and recommendations.

## 46. What is the difference between schemas and models?

Models define database tables and relationships. Schemas define API request and response payloads.

## 47. Why are services separate from routes?

Routes handle HTTP, auth, validation, and response shape. Services hold reusable business logic and DB operations.

## 48. What would you add for better observability?

Structured logging, request IDs, background job status rows, AI provider latency metrics, WebSocket connection counts, and error tracking.

## 49. What would you add for better testing?

Route-level integration tests for every RBAC branch, public candidate E2E flow, storage mocking, AI fallback tests, and race-condition tests for attendance/payroll uniqueness.

## 50. What would you change before enterprise production?

Add Alembic migrations, durable job queue, signed public interview tokens, rate limiting, RLS or stricter tenant enforcement helpers, audit logs for mutations, model versioning, bias evaluation, and full CI tests.

## 30 Advanced Cross Questions

1. Why is app-level tenant isolation not enough for high-security SaaS?
Answer: A missed `company_id` filter can leak data. DB-level RLS adds defense in depth.

2. How would you add signed public interview links?
Answer: Store invite token hash, expiry, and used status, then require the signed token in public routes.

3. How would you retry failed resume extraction?
Answer: Add extraction status columns or a jobs table, persist attempts/errors, and process with a durable worker.

4. How would you version AI scores?
Answer: Add `ai_score_runs` with provider, model, prompt version, raw output, normalized score, and created_at.

5. How would you reduce AI hallucination?
Answer: Strict JSON schema, short context windows, provider fallback, deterministic validation, and human review.

6. How would you avoid fake semantic scoring?
Answer: Do not present plain word overlap as semantic AI. Use hybrid scoring now, then add embeddings, named entity extraction, RAG evidence, recruiter-labeled evaluation, and calibration for a production-grade claim.

7. How would you secure resume URLs?
Answer: Use private bucket with signed URLs rather than public URLs.

8. How would you handle malicious PDF uploads?
Answer: File size limits, MIME sniffing, virus scanning, sandboxed extraction, and rejected encrypted PDFs.

9. How would you make email sending reliable?
Answer: Queue email jobs, persist delivery status, retry failures, and use a transactional provider API.

10. How would you prevent candidate interview spam?
Answer: Rate limit public routes by token/IP, add session expiry, and lock session after completion.

11. What if two recruiters shortlist the same candidate simultaneously?
Answer: Current code rechecks existing interview session. Stronger design would add uniqueness or transactional lock on candidate interview session creation.

12. What if the same candidate applies twice?
Answer: Current code permits separate resume rows. A production system could deduplicate by job/email or let recruiters merge candidates.

13. Why are manager hiring permissions debatable?
Answer: Managers can create/list jobs and shortlist in current code. Some companies may want HR-only shortlisting.

14. What could go wrong with service-level commits?
Answer: A service commit can persist partial state before later route logic fails.

15. How would you normalize interview transcript?
Answer: Create `interview_answers` table instead of storing transcript as JSONB arrays.

16. Why use JSONB for questions and metrics?
Answer: It is flexible for evolving AI output without migrations, but less normalized for analytics.

17. When should JSONB be replaced by relational tables?
Answer: When querying individual answers, metrics, or question categories becomes frequent.

18. How would you test RBAC?
Answer: Create users for each role and assert allowed/forbidden outcomes for every route.

19. How would you test tenant isolation?
Answer: Create two companies, cross-use IDs, and assert 404/403 on every cross-tenant read/write.

20. How would you add audit logs for mutations?
Answer: Add `audit_logs` table with actor, company, action, target type/id, before/after, IP, created_at.

21. Why is `SUPABASE_SERVICE_ROLE_KEY` sensitive?
Answer: It can bypass normal Supabase restrictions. It must never be exposed to frontend.

22. Why does CORS include Vercel URL by default?
Answer: To keep production frontend requests accepted even if env CORS list is incomplete.

23. What could be improved in health checks?
Answer: Add DB connectivity, Supabase Storage status, AI provider status, and version/commit info.

24. How would you handle large resumes?
Answer: Enforce file size, limit extracted text, chunk extraction, and store text summaries.

25. How would you prevent prompt injection from resumes?
Answer: Treat resume text as untrusted data, isolate instructions, use structured extraction, and validate model output.

26. How would you explain AI fairness?
Answer: Scores are advisory, not final decisions. Human review is required, and production needs bias audits.

27. Why should payroll agent tools be read-only?
Answer: Payroll mutations are high-risk financial operations and should require explicit human action.

28. How would you scale WebSockets?
Answer: Use Redis pub/sub or managed realtime service so events reach sockets across multiple app instances.

29. What is the deployment caveat with in-memory WebSocket manager?
Answer: It only knows sockets connected to the same process. Multi-instance deployment needs shared pub/sub.

30. What is the best one-line architecture defense?
Answer: The backend separates identity, tenant authorization, business services, AI workflows, and audit traces so demo features work while preserving human control over sensitive decisions.
