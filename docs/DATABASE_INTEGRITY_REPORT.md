# Database Integrity Report

## Snapshot

Generated from `backend/scripts/final_audit_snapshot.py`.

## Table Counts

| Table | Count |
| --- | ---: |
| companies | 3 |
| users | 14 |
| jobs | 2 |
| resumes | 3 |
| ai_scores | 3 |
| employees | 21 |
| attendance_records | 48 |
| performance_reviews | 9 |
| interview_sessions | 7 |
| payroll_records | 21 |
| agent_sessions | 5 |
| agent_actions | 14 |
| interview_agent_history | 5 |

## Orphan Checks

| Check | Count |
| --- | ---: |
| users_without_company | 0 |
| jobs_without_company | 0 |
| resumes_without_job | 0 |
| ai_scores_without_resume | 0 |
| employees_without_company | 0 |
| attendance_without_employee | 0 |
| payroll_without_employee | 0 |
| performance_without_employee | 0 |
| interviews_without_resume | 0 |

## Duplicate Checks

| Check | Count |
| --- | ---: |
| duplicate_user_emails | 0 |
| duplicate_employee_company_emails | 0 |
| duplicate_ai_scores_per_resume | 0 |
| duplicate_payroll_periods | 0 |

## Relationship Validation

| Relationship | Status |
| --- | --- |
| Candidate/Resume -> AI Score | PASS |
| Resume -> Job | PASS |
| Candidate/Resume -> Interview | PASS |
| Employee -> Attendance | PASS |
| Employee -> Payroll | PASS |
| Employee -> Performance | PASS |

## JourneySync Demo Data

| Item | Count |
| --- | ---: |
| JourneySync users | 9 |
| JourneySync employees | 9 |
| JourneySync jobs | 1 |
| JourneySync resumes | 1 |
| JourneySync interviews | 1 |

## Result

Database integrity is demo-ready. No orphan or duplicate records were detected.
