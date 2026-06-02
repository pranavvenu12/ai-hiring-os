# Product Requirements Document (PRD)

## 1. Executive Summary
AI Hiring OS is a comprehensive multi-tenant SaaS application designed to revolutionize corporate talent acquisition and employee management by unifying recruitment pipelines, automated resume screening, voice-enabled AI interviews, and modern core HRMS features (Employee Profiles, Attendance, Payroll, Performance Reviews) within a secure, isolated tenant architecture. 

By utilizing artificial intelligence at key stages of the employee lifecycle, AI Hiring OS dramatically reduces time-to-hire, removes human bias from initial screens, simplifies attendance and performance management, and consolidates fragmented tools into a single high-performance premium portal.

---

## 2. Problem Statement
Enterprise recruitment and HR administration are currently plagued by major operational inefficiencies:
*   **Fractured Toolchains**: Companies utilize separate platforms for applicant tracking (ATS), voice screening, employee databases, time-sheets, and performance appraisals. This results in data silos and security vulnerabilities.
*   **Manual Resume Overhead**: HR staff spend hundreds of hours manually sorting through resumes, resulting in delayed processing and missed top talent.
*   **Subjective Evaluations**: Initial candidate screening is highly prone to unconscious bias, inconsistency, and scheduling logistics.
*   **Security & Compliance Gaps**: Traditional platforms lack granular multi-tenant isolation, exposing sensitive employee records, credentials, and contracts to possible data leaks.

---

## 3. Target Audience
*   **HR & Recruitment Teams**: Seek automated pipelines to screen resumes, trigger interviews, track candidates, and manage employee directories.
*   **Hiring Managers**: Require direct insights into candidate screening metrics, quick team performance review templates, and daily attendance logs.
*   **Employees**: Demand simple workspaces to clock in/out, view feedback, manage profiles, and review goals.
*   **Small & Medium Enterprises (SMEs)**: Looking for an affordable, consolidated SaaS workspace combining recruitment and HRMS without the overhead of enterprise-level platforms.

---

## 4. Product Vision
To build a state-of-the-art "Hire-to-Retain" workspace. A single platform that guides a person from a prospective applicant to a fully integrated employee, continuously evaluated, developed, and managed through intelligent metrics, voice interactions, and absolute tenant security.

---

## 5. Business Goals
*   **Time-to-Hire Reduction**: Decrease the screening-to-offer window by at least 60% through automated resume scanning and asynchronous AI interview evaluations.
*   **Operational Cost Minimization**: Consolidate recruitment and HR administrative costs by replacing 3-4 specialized tools with one premium platform.
*   **Retention Improvement**: Boost internal mobility and employee satisfaction by implementing transparent, continuous manager reviews and performance scoring.
*   **SaaS Growth**: Establish a scalable subscription architecture that isolates tenants perfectly at the database level.

---

## 6. Functional Requirements

### 6.1 Authentication & Isolation
*   **Supabase Auth Integration**: Secure JWT email/password signup and login.
*   **Tenant Binding**: Every user account must bind to a unique `company_id`. Strict multi-tenant isolation prevents cross-organization data viewing.
*   **Role-Based Security (RBAC)**: Supports roles (`Admin`, `HR`, `Manager`, `Employee`) that limit screen views and backend endpoint authorizations.

### 6.2 Job Management
*   **Job Posting Engine**: Creation, deletion, and editing of job positions with detailed listings including descriptions, requirements, and salary.
*   **Multi-tenant Filtering**: Listings are query-restricted to the active company tenant.

### 6.3 Resume Upload & Parsing Pipeline
*   **Multi-file Drag-and-Drop**: Supports batch uploading of candidate resumes in `.pdf` format.
*   **Automated Semantic Screening**: Parses candidate documents against targeted job specifications, extracting skills, work history, and overall matches.

### 6.4 AI Candidate Scoring & Summaries
*   **Three-Tier Scoring Matrix**:
    *   *Skill Match Score*: Percentage match against technical prerequisites.
    *   *Semantic Relevance Score*: Syntactic check against role context and experience levels.
    *   *Overall AI Match Score*: Weighted aggregation of technical fit and team chemistry.
*   **Explanations Engine**: Provides recruiters with a text explanation summarizing why the candidate was assigned their particular score.

### 6.5 Employee Directory & Profiles
*   **Dynamic Directory**: Paginated profile card grids filterable by search term, department, and employment status.
*   **Detailed Drawer**: Clickable drawers showing key info, including manager chains, contact lines, joining details, and roles.
*   **HR Write Privilege**: Only HR and Admins can create or update employee records.

### 6.6 Attendance Management
*   **Daily Clock-In/Out Validation**: Restricts check-ins to once per day. Calculates active hours on clock-out.
*   **Automatic Status Assignment**: Derives status based on hours worked (`Present` for ≥8 hours, `Half Day` for 4-8 hours, `Absent` for <4 hours).
*   **Manager & HR Dashboards**: Managers see today's team status. HR accesses company-wide attendance averages and metrics.

### 6.7 Performance Reviews
*   **Appraisal Scorecards**: Managers submit star-based evaluations covering strengths, improvements, and comments for direct reports.
*   **Company Metrics**: HR gains high-level company performance analytics, identifying high-performing departments and top talent.

### 6.8 AI Interview Assistant
*   **Setup Flow**: Select a candidate, define the role, choose interview types (Technical, Behavioral, General), and launch a customized screening session.
*   **Voice Q&A Interface**: Uses browser-native speech-to-text to capture answers, building real-time interactive transcripts.
*   **Multi-Dimensional Scorecard**: AI assesses transcripts, generating scores for technical depth, communication, and confidence.
*   **Shortlist Drawer Tab**: Updates candidate profiles dynamically, appending historical AI interview logs to help recruiters evaluate candidates.

### 6.9 Payroll Management
*   **Payroll Generation**: HR/Admin users generate monthly payroll for one employee or all active employees in the company.
*   **Attendance-Based Calculation**: Payroll calculates working days, present days, half days, absent days, gross salary, deductions, and net salary from attendance records.
*   **Approval Workflow**: Payroll records move from `generated` to `approved` to `paid`.
*   **Role-Based Access**: Managers receive read-only payroll analytics. Employees can only view their own payroll history and payslips.
*   **Payslip Output**: Payslips include company, employee, department, attendance summary, gross salary, deductions, net salary, status, and AI summary.

---

## 7. Non-Functional Requirements

### 7.1 Scalability
*   The architecture must easily support horizontal scaling of FastAPI app instances.
*   Database tables must scale efficiently, leveraging indexes on common query parameters like `company_id`.

### 7.2 Security & Compliance
*   Strict multi-tenant security filters: Every SQLAlchemy query must filter by `company_id`.
*   All user actions must validate against Supabase JWT tokens.

### 7.3 Performance
*   AI operations (resume parsing, interview evaluations) must run asynchronously to prevent request timeouts.
*   The frontend dashboard should maintain sub-100ms render speeds by using optimized states and React rendering techniques.

### 7.4 Availability
*   Maintain 99.9% uptime by leveraging reliable cloud providers (e.g., Supabase, Render, Vercel).

---

## 8. User Personas

```
+------------------------------------+------------------------------------+
|               SARAH                |               MARCUS               |
|            HR Director             |        Engineering Manager         |
|                                    |                                    |
| * Goal: Streamline screening of    | * Goal: Appraise developers, track |
|   hundreds of incoming resumes and |   attendance, review candidates.   |
|   speed up early interviews.       |                                    |
| * Pain Point: Fragmented tools,    | * Pain Point: Wastes valuable time |
|   manual scheduling, coordination  |   conducting repetitive technical  |
|   delays.                          |   screening calls.                 |
+------------------------------------+------------------------------------+
```

---

## 9. User Stories
*   **As an HR Recruiter**, I want to upload a batch of PDF resumes for a job so that I can automatically see an AI-evaluated match ranking list.
*   **As a Manager**, I want to submit quarterly performance reviews for my team members so that I can track their career growth over time.
*   **As an Employee**, I want to easily clock in and out from my portal and check my logged hours so that I don't need to use a separate timesheet tool.
*   **As a Recruiter**, I want candidates to take an asynchronous voice-activated AI interview screening so that I don't have to schedule initial 30-minute calls manually.

---

## 10. Success Metrics
| Metric | Baseline | Target Goal |
| :--- | :--- | :--- |
| **Time to Screen** | 3 days per batch | < 5 minutes |
| **User Retention** | 40% monthly return | > 85% return rate |
| **Platform Consolidations** | 4 active tools | 1 single workspace |
| **API Response Time** | 1200ms average | < 200ms (cached) |

---

## 11. Future Enhancements
*   **Advanced Talent Pool Sourcing**: Integrations with LinkedIn and external job boards to import candidates with a single click.
*   **Interactive Coding Sandbox**: An in-browser coding environment within the AI Interview screen for technical candidates.
*   **External Payroll Payment Rails**: Connect approved payroll records to bank transfer or accounting systems.
