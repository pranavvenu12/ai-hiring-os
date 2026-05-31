# Application Flow Architecture

This document maps the user journeys, authentication loops, dynamic data queries, and AI processing pipelines within AI Hiring OS using structured visual flows.

---

## 1. Authentication Flow

This flow handles user registration, company binding, secure sign-in, and role-based redirect routes.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Candidate
    participant SPA as React Frontend
    participant Supabase as Supabase Auth
    participant API as FastAPI Backend

    User->>SPA: Enters Credentials & Clicks Submit
    SPA->>Supabase: oauth/signin (email + password)
    Supabase-->>SPA: Returns Session + Signed JWT
    SPA->>API: GET /me (Headers: Bearer JWT)
    API->>API: Validates Signature & Decodes Payload
    API-->>SPA: Returns User Profile (role, company_id)
    SPA->>SPA: Stores State & Redirects to Guarded Router
```

---

## 2. Recruitment & Resume Screening Flow

HR professionals can upload resumes and trigger the AI candidate scoring pipeline.

```mermaid
graph TD
    HR[HR Specialist] -->|1. Creates Position| JobsPage[Jobs Directory]
    JobsPage -->|2. Clicks Upload Resumes| Dropzone[Drag & Drop PDF Portal]
    Dropzone -->|3. Sends PDF File| API[FastAPI Upload Route]
    
    subgraph Asynchronous Backend Worker
        API -->|4. Saves File| Storage[Supabase S3 Bucket]
        API -->|5. Triggers Parsing| AIProcessor[Extraction Service]
        AIProcessor -->|6. Call Gemini/OpenAI| LLM[LLM Parser Chain]
        LLM -->|7. Parses JSON Metrics| Scorecard[AI Score Engine]
        Scorecard -->|8. Saves Record| DB[(PostgreSQL database)]
    end

    DB -->|9. Poll Status (200)| SPA[React Candidates Board]
    SPA -->|10. Display AI Scores & Explanation| HR
```

---

## 3. Employee Portal Flow (Attendance & Performance)

This flow maps daily employee clock-in/out procedures and how their performance scorecards are reviewed.

```mermaid
graph LR
    subgraph Employee Portal
        Emp[Employee User] -->|Clock-in| ClockIn[POST /attendance/clock-in]
        Emp -->|Clock-out| ClockOut[POST /attendance/clock-out]
        Emp -->|View Review| PerfMe[GET /performance/me]
    end

    subgraph Backend Validation
        ClockIn -->|Verify Once Per Day| DB1[(PostgreSQL)]
        ClockOut -->|Calculate Hours worked| DB1
        PerfMe -->|Filter reviews by Employee ID| DB1
    end
```

---

## 4. Manager Portal Flow (Appraisal Scorecard)

This flow illustrates how managers review their team's performance and log continuous appraisals.

```mermaid
graph TD
    Manager[Manager User] -->|1. Opens Team Dashboard| Dashboard[Manager Dashboard]
    Dashboard -->|2. Selects Team Member| Profile[Team Member Profile]
    Profile -->|3. Clicks Submit Performance Review| Drawer[Appraisal Drawer Form]
    
    Drawer -->|4. Input Strengths, Comments, Rating 1-5| PostReview[POST /performance]
    PostReview -->|5. Verify target is a direct report| DB[(PostgreSQL)]
    DB -->|6. Save review with manager_id| DB
    DB -->|7. Return success code 201| Manager
```

---

## 5. End-to-End AI Interview Flow

The full workflow of setting up and completing an AI-conducted voice screening session.

```mermaid
sequenceDiagram
    autonumber
    actor HR as Recruiter / HR
    actor Cand as Candidate
    participant SPA as React Frontend
    participant API as FastAPI Backend
    participant LLM as LLM Engine (Gemini/OpenAI)

    HR->>SPA: Selects Candidate & Job, Clicks "Start AI Interview"
    SPA->>API: POST /interviews/start {candidate_id, job_id, type}
    API->>LLM: Generate 5 Contextual Interview Questions
    LLM-->>API: Returns 5 customized questions JSON
    API-->>SPA: Load setup complete, Return Session ID
    
    Note over Cand, SPA: Interview Screen Launches
    
    loop Dynamic Q&A Loop
        SPA->>Cand: Display Question Card
        Cand->>SPA: Speaks Answer into Microphone
        SPA->>SPA: Browser WebkitSpeechRecognition parses Audio
        SPA->>Cand: Displays Real-time Response Text
        Cand->>SPA: Clicks "Submit Answer"
        SPA->>API: POST /interviews/{id}/answer {index, text}
    end

    SPA->>API: POST /interviews/{id}/complete
    API->>LLM: Evaluate full Q&A Transcript against Job Details
    LLM-->>API: Return scorecard (Technical, Comm, Confidence, Overall) + Summary
    API-->>SPA: Display dynamic Evaluation Dashboard to Recruiter
```

---

## 6. Multi-Tenant Row Isolation Flow

To prevent data leaks, the system enforces multi-tenant row isolation across all database queries.

```mermaid
graph TD
    UserA[Client Tenant A] -->|1. Request /employees| Server[FastAPI Server]
    UserB[Client Tenant B] -->|2. Request /employees| Server
    
    Server -->|3. Extract Tenant ID A| QueryA["SELECT * FROM employees WHERE company_id = 'TENANT-A-UUID'"]
    Server -->|4. Extract Tenant ID B| QueryB["SELECT * FROM employees WHERE company_id = 'TENANT-B-UUID'"]
    
    QueryA --> DB[(Shared PostgreSQL Database)]
    QueryB --> DB
    
    DB -->|5. Return isolated records| Server
    Server -->|6. Return Client A data| UserA
    Server -->|7. Return Client B data| UserB
```
