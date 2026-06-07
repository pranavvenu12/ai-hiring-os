# Project Walkthrough

## Landing Page

| Item | Details |
|---|---|
| Purpose | Public introduction and entry to auth |
| User | Public |
| Data Source | Static content/assets |
| Actions | Navigate to login/signup, mobile menu |
| APIs | None |
| Security | Redirects authenticated users to dashboard |

## Login

| Item | Details |
|---|---|
| Purpose | Sign into company workspace |
| User | Existing user |
| Data Source | Supabase Auth through backend |
| Actions | Submit email/password, show/hide password, back link |
| APIs | `POST /auth/login`, `GET /me` |
| Security | Stores JWT and user locally; redirects by role |

## Signup

| Item | Details |
|---|---|
| Purpose | Register HR/Admin company or join existing company |
| User | New Admin/HR/Manager/Employee |
| Data Source | Supabase Auth, companies, users, employees |
| Actions | Choose role, enter company, create account |
| APIs | `POST /auth/signup` |
| Security | Employee/Manager company name must already exist |

## HR Dashboard

| Item | Details |
|---|---|
| Purpose | Company overview for HR/Admin |
| User | Admin, HR |
| Data Source | Jobs, candidates, employees, attendance, performance, interviews, payroll, company |
| Actions | Navigate to jobs, settings, payroll, candidates |
| APIs | `/jobs`, `/companies/{id}`, `/employees`, `/attendance/company`, `/performance/company`, `/interviews/company/analytics`, `/payroll` |

## Manager Dashboard

| Item | Details |
|---|---|
| Purpose | Manager review workspace |
| User | Manager |
| Data Source | Jobs/candidates, team attendance, team performance, payroll summary |
| Actions | View candidates, view payroll, review team status |
| APIs | `/jobs`, `/jobs/{id}/candidates`, `/attendance/team`, `/performance/team`, `/payroll` |
| Security | Payroll is read-only |

## Employee Dashboard

| Item | Details |
|---|---|
| Purpose | Employee self-service |
| User | Employee |
| Data Source | Company, self employee record, attendance, performance, payroll |
| Actions | Navigate to attendance, settings, payroll |
| APIs | `/companies/{id}`, `/employees`, `/attendance/me`, `/performance/me`, `/payroll/me` |
| Security | Employee sees own data only |

## Jobs

| Item | Details |
|---|---|
| Purpose | Manage/list job postings |
| User | Admin, HR, Manager |
| Data Source | Jobs table |
| Actions | Create job, view jobs |
| APIs | `GET /jobs`, `POST /jobs` |
| Security | Employee blocked; create restricted to HR/Admin |

## Candidates

| Item | Details |
|---|---|
| Purpose | View screened candidates and upload resumes |
| User | Admin, HR, Manager |
| Data Source | Jobs, resumes, AI scores, Candidate Intelligence, interview sessions |
| Actions | Upload resumes, select job, review ATS analysis, inspect explicit/inferred skills, review project/GitHub/portfolio signals, view interview history |
| APIs | `/jobs`, `/jobs/{id}/upload-resumes`, `/jobs/{id}/candidates`, `/interviews/candidate/{id}` |
| Security | Upload restricted to HR/Admin |

## AI Interview

| Item | Details |
|---|---|
| Purpose | Run AI-assisted screening interviews |
| User | Admin, HR |
| Data Source | Jobs, candidates, interview sessions |
| Actions | Start interview, record spoken answer, submit answer, complete evaluation |
| APIs | `/interviews/start`, `/interviews/{id}/answer`, `/interviews/{id}/complete`, `/interviews/company/analytics` |
| Business Logic | Browser speech recognition captures text; backend AI evaluates transcript |

## Employees

| Item | Details |
|---|---|
| Purpose | Employee directory and HR employee management |
| User | Admin, HR, Manager |
| Data Source | Employees table |
| Actions | Search, filter, create employee |
| APIs | `/employees`, `/employees/departments`, `POST /employees` |
| Security | Manager team/self read, HR/Admin write |

## Attendance

| Item | Details |
|---|---|
| Purpose | Time tracking and attendance analytics |
| User | All roles |
| Data Source | Attendance records |
| Actions | Clock in, clock out, view history/team/company |
| APIs | `/attendance/clock-in`, `/attendance/clock-out`, `/attendance/me`, `/attendance/team`, `/attendance/company` |
| Business Logic | Status derived from total hours |

## Performance

| Item | Details |
|---|---|
| Purpose | Employee reviews and analytics |
| User | All roles |
| Data Source | Performance reviews |
| Actions | Manager submits review; users view relevant reviews |
| APIs | `POST /performance`, `/performance/me`, `/performance/team`, `/performance/company` |
| Security | Managers review direct reports; HR/Admin company view |

## Payroll

| Item | Details |
|---|---|
| Purpose | Generate and view attendance-driven payroll |
| User | All roles |
| Data Source | Payroll records, employees, attendance |
| Actions | Generate, approve, mark paid, view payslip, print PDF |
| APIs | `/payroll`, `/payroll/me`, `/payroll/generate`, `/payroll/generate-all`, `/payroll/{id}/approve`, `/payroll/{id}/mark-paid` |
| Security | HR/Admin write, Manager read-only, Employee own only |

## Settings

| Item | Details |
|---|---|
| Purpose | Company profile settings |
| User | All roles |
| Data Source | Company/company profile |
| Actions | Edit company details where permitted |
| APIs | `GET /companies/{id}`, `PUT /companies/{id}` |
| Security | Managers/Employees see view-only fields |
