# Judge Questions and Answers

This guide prepares concise, honest answers for product, technical, AI, architecture, and HRMS evaluation.

## Priority Questions

### Q: Why is Voice AI not fully conversational?

Strong answer: The current MVP uses browser speech recognition to capture spoken candidate answers, then evaluates the transcript with AI. This proves the recruitment workflow and scoring logic without adding realtime audio infrastructure. A production version would add realtime speech-to-speech conversation, streaming transcription, and voice activity detection.

### Q: Have you tested 5000 users?

Strong answer: Not with formal load testing yet. The system is architected for scale through React on Vercel, FastAPI async APIs, PostgreSQL/Supabase, tenant-scoped data models, pagination, and Docker deployment. The next production step is k6 or Locust load testing, connection pooling validation, autoscaling, and queue-based background processing.

### Q: How is the system architected for scale?

Strong answer: The frontend is stateless and CDN deployable. The backend is a containerized FastAPI service with async database access. PostgreSQL stores normalized tenant-scoped data. Heavy resume evaluation is separated from request-response flow through background tasks. The design can evolve to queues, autoscaling, and read replicas without changing the product model.

### Q: Why did you use polling instead of WebSockets?

Strong answer: Polling is enough for MVP reliability and simplicity because resume scoring is asynchronous but not millisecond-critical. WebSockets add operational complexity. For production, scoring events would move to queues and WebSockets or SSE would push status updates to recruiters.

### Q: Why is payroll not enterprise-complete?

Strong answer: The MVP focuses on HRMS workflow coverage: attendance-based payroll generation, approvals, paid status, payslips, and AI summaries. Statutory payroll requires country-specific PF, ESI, tax, bank payout, and audit compliance, which is production scope rather than hackathon scope.

### Q: How do candidates enter the system?

Strong answer: Candidates use the public careers portal at `/careers`. They search jobs, view details, submit their profile, and upload a PDF resume. The application creates a candidate record using the existing resume model and automatically triggers extraction, AI scoring, summaries, skill-gap analysis, and recruiter dashboard visibility.

### Q: What would Phase 2 of this product look like?

Strong answer: Phase 2 would add company-specific careers pages, candidate status tracking, durable AI job queues, WebSocket scoring updates, formal load testing, compliance payroll modules, richer analytics, audit logs, and enterprise SSO.

## Product Questions

1. Q: What problem does AI Hiring OS solve?  
   A: It unifies recruiting AI and core HRMS workflows so teams do not need separate tools for resume screening, interviews, employees, attendance, performance, and payroll.
2. Q: Who are the users?  
   A: HR/Admin, Managers, Employees, and public candidates.
3. Q: What is the main user journey?  
   A: HR posts a job, candidates apply, AI screens resumes, HR interviews candidates, and employee workflows continue in the HRMS.
4. Q: What makes it different from an ATS?  
   A: It continues beyond hiring into employee management, attendance, performance, and payroll.
5. Q: What makes it different from a normal HRMS?  
   A: It includes AI recruiting, resume scoring, skill gaps, AI interviews, and candidate recommendations.
6. Q: Why include payroll in a hiring product?  
   A: The hackathon requires complete HRMS functionality, and payroll closes the employee lifecycle.
7. Q: Can candidates apply without logging in?  
   A: Yes, the public careers portal supports unauthenticated job applications.
8. Q: Can employees apply internally?  
   A: Not as a separate internal mobility workflow yet; employees are HRMS users and candidates are public applicants.
9. Q: What is the most demo-worthy feature?  
   A: Candidate application to automatic AI resume scoring and recruiter dashboard visibility.
10. Q: What is the second strongest feature?  
    A: AI interview assistant with voice input and AI-generated evaluation.
11. Q: What is the HR value?  
    A: Faster screening, better structured candidate comparison, and reduced manual resume review.
12. Q: What is the manager value?  
    A: Managers can review candidates, team attendance, performance, and payroll visibility.
13. Q: What is the employee value?  
    A: Employees get self-service attendance, performance history, payroll history, and company details.
14. Q: What is the admin value?  
    A: Admins can manage company-wide hiring and HRMS data.
15. Q: How do you prevent clutter?  
    A: Role-specific dashboards only show relevant workflows.
16. Q: Is the UI mobile responsive?  
    A: Yes, dashboard tables and forms use responsive layouts and mobile-specific cards where needed.
17. Q: Why add a public portal late?  
    A: It closes the candidate-entry gap and makes the recruitment workflow end-to-end.
18. Q: Can companies customize branding?  
    A: Not yet; company-specific branding is a future feature.
19. Q: Can candidates track application status?  
    A: Not yet; Phase 2 would add a candidate status portal.
20. Q: Does the product replace HR?  
    A: No, it automates early screening and supports decision-making.
21. Q: What decisions remain human-owned?  
    A: Shortlisting, interviewing judgment, hiring decisions, performance reviews, and payroll approvals.
22. Q: Is it suitable for small companies?  
    A: Yes, the workflow works for small teams and can scale upward.
23. Q: Is it suitable for enterprises?  
    A: It is an MVP foundation; enterprise use needs compliance, audit, SSO, load testing, and queues.
24. Q: What is the core metric improved?  
    A: Time-to-shortlist and consistency of candidate evaluation.
25. Q: What data does HR see first?  
    A: Open jobs, candidates, AI scores, recent applications, employee and HRMS summaries.
26. Q: What data does a manager see first?  
    A: High-potential candidates, team attendance, performance signals, and payroll overview.
27. Q: What data does an employee see first?  
    A: Own profile, attendance, performance, payroll, and company information.
28. Q: Why use AI in payroll?  
    A: To summarize payroll trends and exceptions, not to make final payment decisions.
29. Q: Why use AI in interviews?  
    A: To standardize early evaluation and generate structured scorecards.
30. Q: Why use AI in resume screening?  
    A: Resume volume is high and keyword-only filtering misses context.
31. Q: What happens after a candidate applies?  
    A: Resume is stored, extracted, scored, summarized, and listed for recruiters.
32. Q: Can HR upload resumes manually too?  
    A: Yes, HR can bulk upload resumes directly under a job.
33. Q: Does the portal duplicate resume upload?  
    A: No, it reuses the same backend pipeline.
34. Q: What is the product risk?  
    A: AI output quality and enterprise compliance depth.
35. Q: How is AI risk controlled?  
    A: AI is advisory, uses structured outputs where possible, and has deterministic fallbacks.
36. Q: What is the MVP boundary?  
    A: Demonstrate end-to-end HR workflow, not complete enterprise compliance.
37. Q: Why is this relevant to FWC?  
    A: It matches the exact theme: future HR management with AI-powered solutions.
38. Q: What are the core HRMS modules?  
    A: Employees, attendance, payroll, and performance.
39. Q: What are the core recruitment modules?  
    A: Jobs, public applications, resume screening, candidate review, and AI interviews.
40. Q: Is the product multi-tenant?  
    A: Yes, records are scoped by company.
41. Q: How do managers join a company?  
    A: They sign up using an already registered company name.
42. Q: How do employees join a company?  
    A: Same as managers, through registered company validation.
43. Q: Can unregistered companies be used by employees?  
    A: No, they receive a clear company-not-registered message.
44. Q: Can HR create a company?  
    A: Yes, HR/Admin signup can register the company.
45. Q: Why no bank payroll?  
    A: Bank payout is enterprise integration scope, not hackathon core.
46. Q: Why no tax payroll?  
    A: Tax rules are country-specific and should not be faked in an MVP.
47. Q: Why no WebSocket live updates?  
    A: Polling is adequate for demo and simpler to operate reliably.
48. Q: What would you improve first?  
    A: Durable queues for AI processing and candidate status tracking.
49. Q: What is the final product story?  
    A: From candidate application to AI screening to HRMS employee lifecycle.
50. Q: Would this be usable tomorrow?  
    A: It is usable as a pilot MVP, not a fully compliant enterprise HR suite.

## Technical Questions

1. Q: What is the frontend stack?  
   A: React, Vite, Tailwind CSS, Framer Motion, Axios.
2. Q: What is the backend stack?  
   A: FastAPI, SQLAlchemy async, Pydantic, PostgreSQL/Supabase.
3. Q: Why FastAPI?  
   A: It supports async APIs, Python AI libraries, strong typing, and automatic OpenAPI docs.
4. Q: Why React?  
   A: It is well suited for role-based dashboards and interactive workflows.
5. Q: How is authentication handled?  
   A: Supabase Auth issues JWTs that the backend verifies.
6. Q: How is RBAC enforced?  
   A: Protected frontend routes and backend role dependencies.
7. Q: Is backend RBAC enough without frontend checks?  
   A: Yes, backend checks are the source of truth.
8. Q: How is tenant isolation handled?  
   A: Company-scoped data uses `company_id` and backend checks current user company.
9. Q: How are resumes stored?  
   A: PDF files are uploaded to Supabase Storage.
10. Q: Where is resume metadata stored?  
    A: Existing resume records store job, candidate name, file URL, extracted text, and timestamps.
11. Q: How does public apply avoid duplicate systems?  
    A: It creates the same resume/candidate record used by HR uploads.
12. Q: How is PDF text extracted?  
    A: Through the existing extraction service, then stored on the resume record.
13. Q: How is AI scoring triggered?  
    A: Background processing runs extraction and then full evaluation.
14. Q: What happens if AI provider fails?  
    A: The service falls back to deterministic/template scoring.
15. Q: How are API errors handled on frontend?  
    A: Axios interceptors normalize responses and auth failures.
16. Q: How is CORS handled?  
    A: FastAPI CORS middleware uses configured allowed origins.
17. Q: How is deployment handled?  
    A: Vercel for frontend and Dockerized backend on AWS EC2.
18. Q: How are environment variables handled?  
    A: Backend and frontend `.env` files configure API, Supabase, and AI providers.
19. Q: What database is used?  
    A: PostgreSQL through Supabase.
20. Q: Are migrations implemented?  
    A: Not formally; the MVP uses SQLAlchemy metadata creation.
21. Q: What is a production improvement?  
    A: Alembic migrations.
22. Q: How are routes protected?  
    A: React protected routes plus FastAPI role guards.
23. Q: How is current user resolved?  
    A: JWT is verified and mapped to a local user record.
24. Q: How does signup work?  
    A: Supabase user is created, company is validated/created, and local user is stored.
25. Q: How are employees linked to users?  
    A: Signup creates or links employee records for managers and employees.
26. Q: How do dashboards fetch data?  
    A: They call role-appropriate backend APIs.
27. Q: Why use polling for candidates?  
    A: AI scoring is asynchronous but demo-scale, so polling is reliable and simple.
28. Q: How would you add queues?  
    A: Move background tasks to Celery/RQ/SQS and store job states.
29. Q: How would you add WebSockets?  
    A: Emit scoring events from workers and subscribe dashboards by company/job.
30. Q: How do file uploads work?  
    A: Multipart form upload to FastAPI, then Supabase Storage.
31. Q: How are public endpoints safe?  
    A: They expose only job postings and application submission, not internal HR data.
32. Q: Is public apply tenant-aware?  
    A: Yes, the job determines company ID for storage and candidate association.
33. Q: Can public users view candidates?  
    A: No, candidate views require authenticated roles.
34. Q: Can employees view jobs?  
    A: Employees do not currently access recruiter job management.
35. Q: Why not Next.js?  
    A: Vite React is simpler for this SPA and matches the build needs.
36. Q: How are icons handled?  
    A: Lucide React.
37. Q: How is mobile handled?  
    A: Responsive grids, mobile drawers, and mobile cards.
38. Q: How is dark mode handled?  
    A: Persisted theme context and global compatibility CSS.
39. Q: How are notifications built?  
    A: Topbar aggregates recent jobs and candidates.
40. Q: How is AI search built?  
    A: Topbar reads dashboard-accessible data and returns contextual summaries.
41. Q: How are payroll records calculated?  
    A: Attendance counts drive gross, deductions, and net salary.
42. Q: How are payroll approvals protected?  
    A: Backend payroll routes enforce role permissions.
43. Q: What is the biggest technical debt?  
    A: Lack of formal migrations and durable background workers.
44. Q: What is the second biggest technical debt?  
    A: No formal load testing yet.
45. Q: How would you monitor production?  
    A: Add structured logs, metrics, health checks, alerts, and error tracking.
46. Q: How would you secure tokens better?  
    A: Move from localStorage to secure HTTP-only cookies.
47. Q: How would you handle rate limits?  
    A: Add API throttling on public apply and auth endpoints.
48. Q: How would you handle spam applications?  
    A: CAPTCHA, rate limits, file scanning, and duplicate detection.
49. Q: How would you test this?  
    A: API tests for RBAC, tenant isolation, upload flow, and payroll calculations.
50. Q: What is production readiness level?  
    A: Demo/pilot MVP, with clear roadmap to production hardening.

## AI Questions

1. Q: What AI features exist?  
   A: Resume scoring, summaries, skill gaps, candidate recommendations, AI interviews, interview scoring, payroll summaries, and AI dashboard search.
2. Q: Which AI providers are used?  
   A: Gemini and Hugging Face fallback paths.
3. Q: Are models trained from scratch?  
   A: No, pretrained models/APIs are used, which the hackathon allows.
4. Q: How is resume scoring done?  
   A: Deterministic matching plus AI-generated insights.
5. Q: What is skill-gap analysis?  
   A: Matched and missing skills are compared against the job description.
6. Q: What is candidate recommendation?  
   A: AI score and explanation guide recruiter prioritization.
7. Q: How does AI interview work?  
   A: Questions are generated from job and resume context, answers are captured, then AI scores the transcript.
8. Q: Is voice input AI?  
   A: Speech recognition captures voice; AI evaluates the resulting transcript.
9. Q: How do you handle hallucination?  
   A: AI output is advisory and paired with deterministic scoring.
10. Q: Are AI scores final decisions?  
    A: No, HR owns hiring decisions.
11. Q: Can AI be biased?  
    A: Yes, so production would need bias testing and explainability controls.
12. Q: What data goes to AI?  
    A: Resume text, job description, and relevant transcript text.
13. Q: Is personal data protected?  
    A: Tenant isolation exists, but production needs stricter privacy controls.
14. Q: What happens when AI is unavailable?  
    A: Template fallback keeps the workflow functional.
15. Q: Why use LLMs?  
    A: They summarize and reason over unstructured resumes and interviews.
16. Q: Why keep deterministic scoring?  
    A: It provides stable baseline scoring and fallback reliability.
17. Q: How are interview scores generated?  
    A: AI evaluates technical, communication, confidence, and overall dimensions.
18. Q: How is payroll AI used?  
    A: It summarizes payroll records and attendance-driven insights.
19. Q: How is AI dashboard search used?  
    A: It answers questions about visible dashboard data.
20. Q: What is the most mature AI flow?  
    A: Resume screening because it has extraction, scoring, summary, and skill gaps.
21. Q: What is the least mature AI flow?  
    A: Realtime voice conversation, because current voice is transcript capture.
22. Q: What AI improvement comes next?  
    A: Streaming interview assistant with follow-up questions.
23. Q: How would you evaluate AI quality?  
    A: Compare scores against recruiter labels and track shortlist outcomes.
24. Q: How would you reduce cost?  
    A: Cache extracted text, batch evaluation, and use fallback models.
25. Q: How would you improve explainability?  
    A: Store evidence snippets from resumes for every score.

## Architecture Questions

1. Q: What is the architecture style?  
   A: SPA frontend, REST API backend, PostgreSQL data layer, external AI/storage/auth services.
2. Q: Is it monolithic or microservices?  
   A: Modular monolith, appropriate for MVP speed.
3. Q: Why modular monolith?  
   A: It reduces deployment complexity while keeping service boundaries clear.
4. Q: What are the main modules?  
   A: Auth, companies, jobs, resumes, AI scoring, interviews, employees, attendance, performance, payroll.
5. Q: How are tenants separated?  
   A: Company ID scoping across records and backend authorization checks.
6. Q: How does public apply fit tenant isolation?  
   A: Application is attached to the selected job's company.
7. Q: How would this scale to many tenants?  
   A: Index company-scoped queries, add connection pooling, cache aggregates, and autoscale API.
8. Q: What is stateless?  
   A: Frontend and API request handling are stateless except database/storage.
9. Q: What is stateful?  
   A: PostgreSQL, Supabase Auth, Supabase Storage.
10. Q: How are background jobs handled?  
    A: FastAPI background tasks in MVP.
11. Q: What is the future background architecture?  
    A: Durable queues and separate worker processes.
12. Q: How are APIs documented?  
    A: FastAPI OpenAPI docs plus repository docs.
13. Q: How is deployment split?  
    A: Vercel frontend, AWS EC2 backend.
14. Q: How is routing handled?  
    A: React Router on frontend, FastAPI routers on backend.
15. Q: How is company data fetched?  
    A: Authenticated users call company-scoped endpoints.
16. Q: How are public jobs fetched?  
    A: Public jobs endpoint returns safe posting fields only.
17. Q: How is security enforced?  
    A: JWT verification, role checks, tenant checks, route protection.
18. Q: What needs production hardening?  
    A: Rate limiting, secure cookies, CSP, queueing, migrations, monitoring.
19. Q: What is the biggest scaling concern?  
    A: AI processing and database connection limits.
20. Q: How would you solve AI processing scale?  
    A: Queue jobs and run worker replicas.
21. Q: How would you solve dashboard scale?  
    A: Pagination, cached aggregates, and optimized indexes.
22. Q: How would you solve file scale?  
    A: Object storage lifecycle rules and file scanning.
23. Q: How would you solve analytics scale?  
    A: Materialized views or reporting warehouse.
24. Q: Why REST not GraphQL?  
    A: REST is simpler and enough for the required workflows.
25. Q: Why PostgreSQL not MongoDB?  
    A: HRMS data is relational and benefits from constraints and joins.

## HRMS Questions

1. Q: What HRMS modules exist?  
   A: Employee management, attendance, performance, payroll, company settings.
2. Q: Is employee data management implemented?  
   A: Yes, with employee directory and role-scoped visibility.
3. Q: Is attendance implemented?  
   A: Yes, clock in/out, hours, status, and history.
4. Q: Is performance implemented?  
   A: Yes, reviews, ratings, team/company views.
5. Q: Is payroll implemented?  
   A: Yes, attendance-driven generation, approval, paid status, payslip, AI summary.
6. Q: Is payroll statutory-compliant?  
   A: No, it is workflow-complete MVP payroll, not legal payroll compliance.
7. Q: Can employees see their own payroll?  
   A: Yes.
8. Q: Can managers see payroll?  
   A: Managers have payroll overview access according to role permissions.
9. Q: Can HR manage employees?  
   A: Yes.
10. Q: Can managers review performance?  
    A: Yes.
11. Q: Can employees review others?  
    A: No.
12. Q: Can HR see company attendance?  
    A: Yes.
13. Q: Can employees see company attendance?  
    A: No, they see their own attendance.
14. Q: What is the employee lifecycle?  
    A: Signup/profile, attendance, performance, payroll history.
15. Q: How are managers represented?  
    A: As manager-role users with employee profiles.
16. Q: How are HR users represented?  
    A: As HR/Admin users with company management permissions.
17. Q: What is missing from HRMS?  
    A: Leave management, compliance payroll, benefits, documents, and onboarding workflows.
18. Q: Are those missing hackathon-critical?  
    A: No, the PDF core modules are covered.
19. Q: What is the HRMS risk?  
    A: Payroll compliance depth and enterprise audit requirements.
20. Q: What is the HRMS strength?  
    A: It links hiring and employee operations in one tenant-aware product.
21. Q: Can HR update company settings?  
    A: Yes.
22. Q: Can managers view company settings?  
    A: Yes, read-only.
23. Q: Can employees view company settings?  
    A: Yes, read-only where applicable.
24. Q: Does HRMS connect to recruitment?  
    A: Yes, candidates and employees are in the same tenant platform.
25. Q: What is Phase 2 HRMS?  
    A: Leave, onboarding, documents, compliance payroll, audit logs, and analytics.
