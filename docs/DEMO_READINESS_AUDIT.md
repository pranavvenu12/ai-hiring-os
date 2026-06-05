# Demo Readiness Audit

Generated: 2026-06-05T01:57:16.746877+00:00

Final Demo Readiness Score: **100.0%**

## Employees Created

- Auth users created: 0
- users rows created: 0
- employees rows created: 0
- Current run was idempotent. Total JourneySync demo employees verified: 9.
- Temporary demo password for the JourneySync employees: `123456`.

## Employee Verification

| Employee | Auth | users | employees | Directory | Attendance | Payroll | Performance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aarav Sharma | True | True | True | True | True | True | True |
| Priya Nair | True | True | True | True | True | True | True |
| Rohan Verma | True | True | True | True | True | True | True |
| Sneha Iyer | True | True | True | True | True | True | True |
| Arjun Patel | True | True | True | True | True | True | True |
| Kavya Reddy | True | True | True | True | True | True | True |
| Rahul Gupta | True | True | True | True | True | True | True |
| Neha Joshi | True | True | True | True | True | True | True |
| Vikram Singh | True | True | True | True | True | True | True |

## Auth Validation

| Employee | Login | Profile | Attendance | Payroll | Performance | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Aarav Sharma | True | True | True | True | True | PASS |
| Priya Nair | True | True | True | True | True | PASS |
| Rohan Verma | True | True | True | True | True | PASS |
| Sneha Iyer | True | True | True | True | True | PASS |
| Arjun Patel | True | True | True | True | True | PASS |
| Kavya Reddy | True | True | True | True | True | PASS |
| Rahul Gupta | True | True | True | True | True | PASS |
| Neha Joshi | True | True | True | True | True | PASS |
| Vikram Singh | True | True | True | True | True | PASS |

## Resume Storage Status

Bucket `resumes` exists: True

| Resume | Storage Exists? | DB Exists? | Extraction Exists? | AI Score Exists? | Status |
| --- | --- | --- | --- | --- | --- |
| Rohit Mehta | True | True | True | True | PASS |

## Candidate Pipeline Status

```json
{
  "candidate_applies_supported": true,
  "resume_upload_supported": true,
  "storage_upload_executed": true,
  "resume_record_created": true,
  "resume_text_extracted": true,
  "ai_score_generated": true,
  "candidate_dashboard_visible": true
}
```

## Interview Pipeline Status

```json
{
  "shortlist_generates_interview_link": true,
  "interview_session_count": 1,
  "email_service_available": true,
  "smtp_configured": false,
  "candidate_can_access_public_interview": true,
  "recruiter_can_view_results": true,
  "shortlisted_candidates": 1
}
```

## Demo Data Status

```json
{
  "jobs": 1,
  "candidates": 1,
  "employees": 9,
  "attendance": 45,
  "payroll": 9,
  "performance_reviews": 8,
  "interviews": 1
}
```

## Frontend Data Integrity

```json
{
  "hr_dashboard_real_data": true,
  "manager_dashboard_real_data": true,
  "employee_dashboard_real_data": true,
  "candidates_real_data": true,
  "payroll_real_data": true,
  "attendance_real_data": true,
  "performance_real_data": true,
  "recruiter_copilot_backend": true,
  "agentic_ai_backend": true
}
```

## Issues Fixed

- Created one shortlisted demo interview session with a public candidate link.
- Added optional SMTP-backed interview invite email service.
- Shortlist flow now returns an absolute public candidate interview link and email delivery status.
- Replaced Manager Dashboard dummy Approve/Reject buttons with a real candidate review action.
- Cleaned broken payroll currency rendering in Employee Dashboard.
- Simplified HR Interview Assistant into a public interview link generator so HR no longer appears to attend the interview as the candidate.
- Verified frontend/backend with `python -m compileall backend/app`, `npm run lint`, and `npm run build`.

## Remaining Risks

- SMTP is not configured, so shortlist returns a public interview link but cannot send real email yet.

## Raw Audit Snapshot

```json
{
  "employees": [
    {
      "name": "Aarav Sharma",
      "email": "aarav.sharma@journeysync.com",
      "role": "employee",
      "designation": "Senior Full Stack Developer",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    },
    {
      "name": "Priya Nair",
      "email": "priya.nair@journeysync.com",
      "role": "employee",
      "designation": "UI/UX Designer",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    },
    {
      "name": "Rohan Verma",
      "email": "rohan.verma@journeysync.com",
      "role": "employee",
      "designation": "Frontend Developer",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    },
    {
      "name": "Sneha Iyer",
      "email": "sneha.iyer@journeysync.com",
      "role": "employee",
      "designation": "Backend Developer",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    },
    {
      "name": "Arjun Patel",
      "email": "arjun.patel@journeysync.com",
      "role": "employee",
      "designation": "AI/ML Engineer",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    },
    {
      "name": "Kavya Reddy",
      "email": "kavya.reddy@journeysync.com",
      "role": "manager",
      "designation": "Product Manager",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    },
    {
      "name": "Rahul Gupta",
      "email": "rahul.gupta@journeysync.com",
      "role": "employee",
      "designation": "QA Engineer",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    },
    {
      "name": "Neha Joshi",
      "email": "neha.joshi@journeysync.com",
      "role": "employee",
      "designation": "DevOps Engineer",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    },
    {
      "name": "Vikram Singh",
      "email": "vikram.singh@journeysync.com",
      "role": "employee",
      "designation": "Mobile App Developer",
      "supabase_auth": true,
      "users_table": true,
      "employees_table": true,
      "employee_directory": true,
      "attendance_module": true,
      "payroll_module": true,
      "performance_module": true
    }
  ],
  "auth_validation": [
    {
      "name": "Aarav Sharma",
      "email": "aarav.sharma@journeysync.com",
      "expected_role": "employee",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    },
    {
      "name": "Priya Nair",
      "email": "priya.nair@journeysync.com",
      "expected_role": "employee",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    },
    {
      "name": "Rohan Verma",
      "email": "rohan.verma@journeysync.com",
      "expected_role": "employee",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    },
    {
      "name": "Sneha Iyer",
      "email": "sneha.iyer@journeysync.com",
      "expected_role": "employee",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    },
    {
      "name": "Arjun Patel",
      "email": "arjun.patel@journeysync.com",
      "expected_role": "employee",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    },
    {
      "name": "Kavya Reddy",
      "email": "kavya.reddy@journeysync.com",
      "expected_role": "manager",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    },
    {
      "name": "Rahul Gupta",
      "email": "rahul.gupta@journeysync.com",
      "expected_role": "employee",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    },
    {
      "name": "Neha Joshi",
      "email": "neha.joshi@journeysync.com",
      "expected_role": "employee",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    },
    {
      "name": "Vikram Singh",
      "email": "vikram.singh@journeysync.com",
      "expected_role": "employee",
      "login": true,
      "profile": true,
      "correct_dashboard": true,
      "attendance": true,
      "payroll": true,
      "performance": true,
      "status": "PASS"
    }
  ],
  "resume_storage": [
    {
      "resume": "Rohit Mehta",
      "job": "Full Stack Developer",
      "storage_path": "34fa6c85-a1ce-43e6-aed3-23aa6677397c/3b1b0ea0-db94-4760-9037-b1f619e6f26d.pdf",
      "storage_exists": true,
      "db_exists": true,
      "extraction_exists": true,
      "ai_score_exists": true,
      "status": "PASS"
    }
  ],
  "candidate_pipeline": {
    "candidate_applies_supported": true,
    "resume_upload_supported": true,
    "storage_upload_executed": true,
    "resume_record_created": true,
    "resume_text_extracted": true,
    "ai_score_generated": true,
    "candidate_dashboard_visible": true
  },
  "interview_pipeline": {
    "shortlist_generates_interview_link": true,
    "interview_session_count": 1,
    "email_service_available": true,
    "smtp_configured": false,
    "candidate_can_access_public_interview": true,
    "recruiter_can_view_results": true,
    "shortlisted_candidates": 1
  },
  "demo_data": {
    "jobs": 1,
    "candidates": 1,
    "employees": 9,
    "attendance": 45,
    "payroll": 9,
    "performance_reviews": 8,
    "interviews": 1
  },
  "frontend_integrity": {
    "hr_dashboard_real_data": true,
    "manager_dashboard_real_data": true,
    "employee_dashboard_real_data": true,
    "candidates_real_data": true,
    "payroll_real_data": true,
    "attendance_real_data": true,
    "performance_real_data": true,
    "recruiter_copilot_backend": true,
    "agentic_ai_backend": true
  },
  "created": {
    "auth_users": [],
    "users": [],
    "employees": [],
    "attendance": 0,
    "payroll": 0,
    "performance_reviews": 0,
    "resumes": 0
  },
  "issues_fixed": [
    "Created one shortlisted demo interview session with a public candidate link."
  ],
  "remaining_risks": [
    "SMTP is not configured, so shortlist returns a public interview link but cannot send real email yet."
  ],
  "resume_storage_bucket": {
    "bucket": "resumes",
    "exists": true
  },
  "final_demo_readiness_score": 100.0
}
```
