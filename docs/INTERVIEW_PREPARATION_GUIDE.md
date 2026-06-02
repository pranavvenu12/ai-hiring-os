# Interview Preparation Guide

## 1. Elevator Pitch

### 30 Seconds

AI Hiring OS is a multi-tenant AI recruiting and HRMS platform. It lets companies create jobs, bulk-screen resumes with AI, run browser voice-based AI interviews, manage employees, track attendance, generate payroll from attendance, and review performance through role-specific dashboards.

### 1 Minute

AI Hiring OS solves the fragmentation between recruitment tools and HRMS tools. HR can create jobs, upload resumes, get AI match scores, and run AI interviews. Once candidates become employees, the same system supports employee records, attendance, performance reviews, and payroll. The backend is FastAPI with Supabase PostgreSQL/Auth/Storage, and the frontend is React/Vite with role-based dashboards.

### 3 Minutes

The product is designed for companies that need a complete hiring-to-HR workflow. It starts with tenant-aware signup, where HR/Admin creates the company and employees/managers can only join registered companies. HR creates jobs and uploads resumes in bulk. The backend stores files in Supabase Storage, extracts PDF text with PyMuPDF, and evaluates candidates through an AI fallback chain using Gemini, HuggingFace, or templates. HR can also run AI interviews with generated questions, browser speech recognition, transcript storage, and AI evaluation. For HRMS, the app includes employees, attendance, performance reviews, and payroll. Payroll is calculated from attendance and supports approval, paid status, payslip view, and AI payroll summaries.

### 5 Minutes

Add architecture details: React/Vite SPA, FastAPI API, SQLAlchemy async, Supabase Auth JWTs, PostgreSQL schema with `company_id`, RBAC roles, EC2 Docker backend, Vercel frontend, and AI fallback chain. Emphasize that the product is a functional MVP with honest gaps: no bank payout integration, no durable worker queue, and no formal migration history yet.

## 2. Why This Project?

Companies often use separate tools for ATS, resume screening, interviews, attendance, performance, and payroll. AI Hiring OS demonstrates how those workflows can be unified into one tenant-isolated platform with AI assistance.

## 3. Business Value

| Value | Explanation |
|---|---|
| Faster screening | Bulk resume upload and AI scoring reduce manual review |
| Better early interviews | AI interview workflow captures transcript and scorecard |
| HRMS consolidation | Employees, attendance, performance, payroll in one place |
| Role-specific UX | HR, manager, and employee dashboards reduce clutter |
| SaaS readiness | Tenant isolation supports multiple companies |

## 4. Technical Questions and Answers

| Question | Strong Answer |
|---|---|
| Why FastAPI? | It supports async APIs, Pydantic validation, Python AI/PDF libraries, and automatic OpenAPI docs. |
| Why PostgreSQL? | HRMS data is relational. Companies, employees, jobs, payroll, and reviews need joins and constraints. |
| How is tenant isolation handled? | The backend resolves `company_id` from the authenticated user and applies company filters and ownership checks before returning data. |
| How does AI fallback work? | The service tries Gemini first, HuggingFace second, and deterministic template fallback last. |
| Is the AI interview truly voice-based? | It uses browser-native speech recognition to capture spoken answers as text, then evaluates the transcript with AI. |
| How does payroll work? | Payroll reads attendance for the period and calculates deductions for absent and half days before storing net salary. |

## 5. Architecture Questions

| Question | Strong Answer |
|---|---|
| How would you support 5000+ users? | Keep FastAPI stateless, scale containers horizontally, use Supabase pooler, indexes, pagination, and add queues/caching/load tests. |
| What is the biggest architecture risk? | Background resume processing is not durable yet; a queue would be needed for production reliability. |
| Why not Firebase? | Firebase is good for realtime apps, but this domain needs relational joins, constraints, and reporting; PostgreSQL fits better. |
| Why not Django? | Django is strong but heavier. This app is API-first and benefits from FastAPI's async and Pydantic model style. |

## 6. AI Questions

| Question | Strong Answer |
|---|---|
| What are the AI features? | Resume scoring, resume summaries, skill gaps, candidate recommendations, AI interview questions, transcript evaluation, payroll summaries. |
| How do you control bad AI output? | The prompts request structured JSON where needed, and the app falls back to templates if provider output fails. |
| Does AI replace HR? | No. It automates early screening and summarizes signals; HR still owns decisions. |

## 7. HRMS Questions

| Question | Strong Answer |
|---|---|
| Does it satisfy core HRMS? | Yes at MVP level: employee data, attendance, payroll, and performance are implemented. |
| Is payroll production-grade? | It is an internal payroll workflow MVP. It does not integrate with bank payouts or tax systems. |
| Why attendance-driven payroll? | It creates a clear link between time records and salary deductions, which is easy to explain and audit. |

## 8. Security Questions

| Question | Strong Answer |
|---|---|
| How are passwords handled? | Supabase Auth handles password authentication; the backend does not store passwords. |
| How do roles work? | Backend routes use `require_roles`; frontend routes and sidebar also enforce role-aware navigation. |
| What would you improve? | Add automated RBAC tests, rotate exposed secrets, use a secret manager, and add CSP/XSS hardening because tokens are in localStorage. |

## 9. Deployment Questions

| Question | Strong Answer |
|---|---|
| Where is it deployed? | Frontend is configured for Vercel. Backend has an EC2 Docker deployment path. Supabase hosts DB/Auth/Storage. |
| Why EC2? | It keeps the FastAPI backend always on without depending on free-tier sleep behavior. |
| What is the deployment risk? | Manual EC2 deployment can drift; CI/CD should be added. |

## 10. Difficult Questions

| Question | Suggested Answer |
|---|---|
| Is this really scalable or just a demo? | It is architected for scale but not load-tested. The honest next step is load testing, queueing, caching, and observability. |
| Why are migrations missing? | The current demo uses SQLAlchemy auto-create. Production should use Alembic migration scripts. |
| Is browser speech recognition enough? | It is enough for an MVP voice interaction. Production may need provider-backed speech-to-text for consistency. |
| Does payroll comply with real payroll law? | No. It is an HRMS payroll calculation/workflow MVP, not tax/statutory compliance software. |
