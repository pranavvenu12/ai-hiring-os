# Application Flow Architecture

## 1. Authentication and Role Routing

```mermaid
sequenceDiagram
    actor User
    participant SPA as React SPA
    participant API as FastAPI
    participant SB as Supabase Auth
    participant DB as PostgreSQL

    User->>SPA: Submit login/signup
    SPA->>API: POST /auth/login or /auth/signup
    API->>SB: Authenticate or create auth user
    API->>DB: Sync local user/company/employee profile
    API-->>SPA: JWT or signup response
    SPA->>SPA: Store JWT and user in localStorage
    SPA->>API: GET /me with Bearer token
    API-->>SPA: User role and company
    SPA->>SPA: Route to role dashboard
```

## 2. Resume Screening Flow

```mermaid
sequenceDiagram
    actor HR
    participant SPA
    participant API
    participant Storage as Supabase Storage
    participant DB as PostgreSQL
    participant AI as AI Fallback Chain

    HR->>SPA: Upload one or more PDF resumes for a job
    SPA->>API: POST /jobs/{job_id}/upload-resumes
    API->>Storage: Store PDF
    API->>DB: Create resume metadata
    API-->>SPA: 202 accepted
    API->>API: BackgroundTasks extracts PDF text
    API->>AI: Evaluate resume against job
    AI-->>API: Scores, explanation, matched/missing skills
    API->>DB: Store AI score
    SPA->>API: GET /jobs/{job_id}/candidates
    API-->>SPA: Candidate ranking
```

## 3. AI Interview Flow

```mermaid
sequenceDiagram
    actor HR
    actor Candidate
    participant SPA
    participant API
    participant AI as Gemini/HF/Template
    participant DB

    HR->>SPA: Select candidate, job, interview type
    SPA->>API: POST /interviews/start
    API->>AI: Generate 5 questions
    API->>DB: Create interview session
    API-->>SPA: Questions and session id
    loop Each question
        Candidate->>SPA: Speak answer
        SPA->>SPA: Browser speech recognition creates text
        SPA->>API: POST /interviews/{id}/answer
        API->>DB: Append transcript
    end
    SPA->>API: POST /interviews/{id}/complete
    API->>AI: Evaluate transcript
    API->>DB: Store scores and recommendation
    API-->>SPA: AI scorecard
```

## 4. Attendance Flow

```mermaid
flowchart TD
    Employee[Employee] --> ClockIn[POST /attendance/clock-in]
    ClockIn --> Record[Create attendance record]
    Employee --> ClockOut[POST /attendance/clock-out]
    ClockOut --> Hours[Calculate total hours]
    Hours --> Status{Hours}
    Status -->|>= 8| Present[present]
    Status -->|4 to 8| Half[half_day]
    Status -->|< 4| Absent[absent]
```

## 5. Payroll Flow

```mermaid
sequenceDiagram
    actor HR
    actor Employee
    participant SPA
    participant API
    participant DB
    participant AI

    HR->>SPA: Open Payroll
    SPA->>API: GET /payroll?month=&year=
    API->>DB: Read company payroll
    HR->>SPA: Generate payroll
    SPA->>API: POST /payroll/generate or /generate-all
    API->>DB: Fetch employee and attendance
    API->>API: Calculate gross, deductions, net
    API->>AI: Generate payroll insight
    API->>DB: Upsert payroll record
    HR->>API: PUT /payroll/{id}/approve
    HR->>API: PUT /payroll/{id}/mark-paid
    Employee->>SPA: Open My Payroll
    SPA->>API: GET /payroll/me
    API-->>SPA: Own payslip history
```

## 6. Performance Flow

```mermaid
flowchart LR
    Manager[Manager] --> Select[Select team member]
    Select --> Review[Submit rating, strengths, improvements, comments]
    Review --> API[POST /performance]
    API --> Guard[Verify reviewer/tenant access]
    Guard --> DB[(performance_reviews)]
    Employee[Employee] --> Own[GET /performance/me]
    HR[HR/Admin] --> Company[GET /performance/company]
```

## 7. Tenant Isolation Flow

```mermaid
flowchart TD
    Request[Authenticated request] --> JWT[Verify JWT]
    JWT --> User[Load local user]
    User --> Company[Resolve company_id]
    Company --> Query[Append company_id filter]
    Query --> DB[(Database)]
    DB --> Response[Return isolated data]
```
