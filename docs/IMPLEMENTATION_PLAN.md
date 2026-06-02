# Project Implementation Roadmap

This document outlines the phased engineering roadmap, validation checklists, risk mitigations, and success criteria for deploying AI Hiring OS.

---

## Phase 1: Authentication & Tenant Foundation

### Objectives
Establish a secure, multi-tenant baseline with user schemas and authentication isolation guards.

### Tasks
*   Integrate Supabase Auth API libraries.
*   Define the PostgreSQL `companies` and `users` tables.
*   Implement JWT verification layers in the backend.
*   Enforce `company_id` row-isolation filters on all backend endpoints.

### Deliverables
*   Fully functional signup and login endpoints.
*   Verified CORS configurations.
*   Dynamic database migration scripts.

### Dependencies
*   Supabase cloud services and operational API credentials.

### Risks & Mitigations
*   *Risk*: JWT signature validation latency.
*   *Mitigation*: Implement local, in-memory caching of public keys to enable instant JWT signature checks.

### Validation Checklist
- [x] Signups generate a valid database record with a `company_id`.
- [x] Requests without active auth header are rejected with `401 Unauthorized`.
- [x] Accessing cross-tenant data returns a `403 Forbidden` error.

### Success Criteria
*   100% of user routes require a valid JWT, and cross-tenant queries are blocked.

---

## Phase 2: Job Vacancy Listings

### Objectives
Build out job posting and management tools with multi-role access controls.

### Tasks
*   Create the `jobs` database table and schemas.
*   Define CRUD route handlers in the backend.
*   Implement RBAC guards: only `Admin` and `HR` roles can create or modify listings.

### Deliverables
*   REST API endpoints under `/jobs` for CRUD operations.
*   Interactive job directory UI in the React frontend.

### Dependencies
*   Completed Phase 1 database connections.

### Risks & Mitigations
*   *Risk*: Database query slowdowns as job listings grow.
*   *Mitigation*: Define indexes on `company_id` to keep query speeds fast.

### Validation Checklist
- [x] HR and Admin users can create, update, and delete jobs.
- [x] Employee roles are blocked from posting new jobs.
- [x] Job listings are isolated to the active company tenant.

### Success Criteria
*   Successful CRUD operations on jobs with correct RBAC enforcement.

---

## Phase 3: Resume Screening Pipeline

### Objectives
Build a high-performance, asynchronous pipeline to upload and parse resumes.

### Tasks
*   Define the `resumes` and `ai_scores` database tables.
*   Build drag-and-drop resume upload interfaces in the frontend.
*   Implement asynchronous background worker threads to parse PDFs using Gemini and OpenAI APIs.

### Deliverables
*   Robust PDF file parser with automatic storage upload.
*   AI scoring engine returning weighted skills match scores.

### Dependencies
*   Operational Gemini and OpenAI API keys.

### Risks & Mitigations
*   *Risk*: Large PDF files causing network timeouts.
*   *Mitigation*: Handle file uploads asynchronously, using status polling on the client side.

### Validation Checklist
- [x] Multiple PDFs can be uploaded simultaneously.
- [x] AI analysis generates skills matches and gap analyses.
- [x] System handles API timeouts gracefully by falling back to local pre-compiled templates.

### Success Criteria
*   Successfully parsed resumes ranked by AI matching scores within 15 seconds of upload.

---

## Phase 4: Core HRMS Modules

### Objectives
Extend the platform with internal workforce management modules, including Employee Directories, Attendance logs, and Performance reviews.

### Tasks
*   Define `employees`, `attendance_records`, and `performance_reviews` tables.
*   Build role-aware pages for Employee Directories, Attendance, and Performance.
*   Implement automatic attendance status logic based on clock-out timestamps.

### Deliverables
*   Dynamic paginated employee directory grid.
*   Star-rating employee review component.
*   Interactive clock-in/out attendance widgets.

### Dependencies
*   Completed tenant isolation and user profile databases.

### Risks & Mitigations
*   *Risk*: Employees clocking in multiple times a day.
*   *Mitigation*: Enforce a unique database constraint on the combination of `(employee_id, date)`.

### Validation Checklist
- [x] Employees can clock in and out once per day.
- [x] Attendance status changes dynamically based on hours worked.
- [x] Managers can submit performance reviews for their team.

### Success Criteria
*   Accurate and isolated attendance logs and performance evaluations across multiple roles.

---

## Phase 5: Voice-Enabled AI Interview Assistant

### Objectives
Implement asynchronous screening tools using voice-to-text inputs and automated AI scorecards.

### Tasks
*   Create the `interview_sessions` database table.
*   Build a dynamic Q&A interview wizard in the frontend.
*   Integrate browser speech recognition APIs with real-time text fallbacks.
*   Implement LLM-based transcript evaluation for multi-dimensional scorecards.

### Deliverables
*   Interactive interview screen with live recording indicators and pulse animations.
*   AI interview analysis tab inside the candidate drawer.

### Dependencies
*   Browser-native webkitSpeechRecognition support (Chrome/Edge).

### Risks & Mitigations
*   *Risk*: Unstable speech-to-text transcription in noisy environments.
*   *Mitigation*: Provide real-time text input fields as a manual backup at all times.

### Validation Checklist
- [x] Custom questions are generated from resumes and job descriptions.
- [x] Speech input is accurately converted to text in real-time.
- [x] AI interview evaluation computes structured scorecards.

### Success Criteria
*   Complete interview-to-scorecard flow, saving transcripts and recommendations to candidate profiles.

---

## Phase 6: Automated Testing & Auditing

### Objectives
Ensure long-term stability and security through automated test suites.

### Tasks
*   Author end-to-end integration tests in Python.
*   Write unit tests for business logic, validation rules, and RBAC guards.
*   Implement automated security audits for row-level tenant isolation.

### Deliverables
*   Test suites verifying multi-role actions and data security.
*   Automated test execution scripts (`run_tests.py` and `test_phase5.py`).

### Dependencies
*   Local database instance configured with test credentials.

### Risks & Mitigations
*   *Risk*: Test data polluting production environments.
*   *Mitigation*: Implement automated setup and tear-down scripts to clean the database after test runs.

### Validation Checklist
- [x] All integration tests pass successfully.
- [x] Security checks block cross-tenant database access.
- [x] Auth token expiration logic functions correctly.

### Success Criteria
*   100% pass rate on core tests, confirming secure tenant separation and RBAC policies.

---

## Phase 7: Deployment

### Objectives
Deploy the application to secure, reliable cloud infrastructure.

### Tasks
*   Dockerize the FastAPI application.
*   Configure CI/CD pipelines for automated frontend and backend deployments.
*   Set up production-grade PostgreSQL databases.

### Deliverables
*   Live production frontend URL (e.g., Vercel) and backend API endpoint (e.g., Render).

### Dependencies
*   Cloud provider accounts.

### Risks & Mitigations
*   *Risk*: Connection pool exhaustion under high traffic.
*   *Mitigation*: Implement connection pooling tools like PgBouncer.

### Validation Checklist
- [x] Live application handles traffic without service interruptions.
- [x] Production databases enforce secure tenant isolation.
- [x] CORS policies block unauthorized external domains.

### Success Criteria
*   A secure, fully functional, multi-tenant deployment running with minimal latency.

---

## Phase 8: Future Enhancements

### Objectives
Detail future iterations and expansion plans for the AI Hiring OS platform.

### Planned Features
*   **Automatic OCR Scanning**: Parse photo-based resume documents accurately.
*   **Direct Outlook & Google Calendar Integrations**: Synchronize schedules for interviews seamlessly.
*   **External Payroll Payment Integrations**: Connect approved payroll records to accounting systems and bank transfer APIs.
*   **Interactive Coding Sandbox**: Add programming screens directly inside the technical interview wizard.

---

## Phase 9: Payroll & HRMS Completion Layer

### Objectives
Close the core HRMS payroll requirement with a usable end-to-end payroll MVP.

### Delivered Features
*   Payroll database model with tenant isolation, employee relationship, period uniqueness, and indexed queries.
*   Payroll generation for one employee or all active employees.
*   Attendance-derived gross salary, deductions, net salary, and payroll status workflow.
*   HR/Admin approval and mark-paid actions.
*   Manager read-only payroll overview.
*   Employee payroll history and payslip view.
*   PDF-ready payslip output through browser print/save.
*   AI payroll summary with Gemini/HF/template fallback.
