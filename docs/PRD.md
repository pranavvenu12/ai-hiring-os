# Product Requirements Document

## 1. Product Summary

AI Hiring OS is a multi-tenant recruiting and HRMS SaaS product. It supports the full flow from company onboarding and job creation to resume screening, AI interviews, employee records, attendance, performance reviews, and payroll.

The implemented product targets four roles: Admin, HR, Manager, and Employee. The product does not currently include bank payout integrations, external job board integrations, calendar integrations, or durable queue infrastructure.

## 2. Users

| Persona | Goals | Current Implementation |
|---|---|---|
| Admin | Own company workspace, manage HR operations | Uses HR dashboard and all HR-level APIs |
| HR Recruiter | Create jobs, upload resumes, screen candidates, run interviews, manage employees/payroll | Jobs, candidates, AI interviews, employees, payroll |
| Manager | Review candidates, monitor team attendance/performance, view payroll overview | Manager dashboard, candidates, attendance team view, performance team view, payroll read-only |
| Employee | Clock in/out, view company details, reviews, payslips | Employee dashboard, attendance, performance, payroll, settings |

## 3. Implemented Functional Requirements

### 3.1 Authentication and Company Access

| Requirement | Implementation |
|---|---|
| Login | `POST /auth/login` authenticates through Supabase Auth |
| Signup | `POST /auth/signup` creates/relinks Supabase user and local user |
| Company registration | HR/Admin can create company; Manager/Employee signup requires an existing company name |
| Session | JWT is stored in browser local storage and sent through Axios bearer headers |
| Current user | `GET /me` resolves the local user from the Supabase UID/email |

### 3.2 Recruitment

| Requirement | Implementation |
|---|---|
| Job posting | HR/Admin create jobs; Admin/HR/Manager list jobs |
| Bulk resume screening | HR/Admin upload multiple PDF resumes to a job |
| Resume extraction | PyMuPDF extracts text in a FastAPI background task |
| Resume evaluation | AI scoring runs after extraction and stores score/explanation/skills |
| Candidate pool | Candidates are listed per job with score data |

### 3.3 AI Features

| Feature | Implementation |
|---|---|
| Resume scoring | Skill, semantic, and overall score persisted in `ai_scores` |
| Resume summaries | AI explanation and summary-style candidate details |
| Skill gap analysis | Matched and missing skills stored in `ai_scores` |
| AI interview questions | Gemini/HF/template generated interview questions |
| AI interview evaluation | Scores transcript for technical, communication, confidence, and recommendation |
| Payroll insight | Payroll record stores an AI/template summary |

### 3.4 HRMS

| Module | Implementation |
|---|---|
| Employee data management | Employee directory, CRUD for HR/Admin, team/self restrictions |
| Attendance | Clock-in/out, total hours, status derivation, own/team/company views |
| Payroll | Attendance-derived payroll records, approval, paid status, payslip view |
| Performance | Manager reviews, employee history, team and company analytics |

### 3.5 Dashboards

| Dashboard | Data Included |
|---|---|
| HR/Admin | Recruitment stats, HRMS stats, payroll stats, recent jobs, company profile, candidates |
| Manager | High-potential candidates, team attendance, team rating, payroll overview |
| Employee | Profile, attendance summary, performance summary, latest payslip, company profile |

## 4. Non-Functional Requirements

| Area | Requirement | Current Implementation |
|---|---|---|
| Security | Tenant isolation | Backend filters business data by `company_id` |
| Authorization | Role-based access | FastAPI `require_roles`, frontend protected routes, sidebar filtering |
| Scalability | Support growth | Async FastAPI, async SQLAlchemy, indexed columns, pagination in list endpoints |
| Availability | Always-on backend | EC2 Docker Compose deployment path |
| Responsiveness | Mobile UI | Sidebar drawer, responsive grids, mobile auth/landing/dashboard improvements |
| Maintainability | Clear modules | Models/schemas/services/routes split by domain |

## 5. Product Gaps

| Gap | Impact |
|---|---|
| No bank payroll integration | Payroll can be marked paid but not actually transferred |
| No durable worker queue | Resume evaluation background work is not retryable after process failure |
| No formal migration history | Auto-create tables works for demos but is not ideal for controlled production schema changes |
| No load-test evidence | 5000+ user support is architecture-level, not proven by benchmarks |
| No external job board integration | Candidate sourcing remains internal/manual upload |

## 6. Success Metrics

| Metric | How It Can Be Measured |
|---|---|
| Resume screening time | Time from upload to completed AI score |
| Interview automation | Number of AI interviews completed without manual scheduling |
| Attendance adoption | Daily clock-in/out completion rate |
| Payroll readiness | Percentage of employees with generated and approved payroll |
| HR efficiency | Jobs, candidates, employees, payroll handled from one dashboard |
# Enterprise Readiness Addendum

## Voice AI Interviews

The interview workflow now supports recorded candidate audio uploaded to AssemblyAI. The platform stores the generated transcript, voice analytics, and AssemblyAI audio URL with the interview session. Browser speech recognition remains as a fallback when AssemblyAI or device recording is unavailable.

## Real-Time Processing

Tenant-scoped FastAPI WebSockets publish live events for resume uploads, resume processing, AI score generation, interview completion, payroll generation, and payroll status updates. Candidate, interview, payroll, and notification views can update without page refresh while retaining polling fallback.

## Advanced Payroll

Payroll generation now persists salary components: basic salary, allowances, bonuses, manual deductions, and attendance deductions. Gross and net salary are generated from these components and shown in payroll register, payslip detail, analytics, and employee dashboard history.
