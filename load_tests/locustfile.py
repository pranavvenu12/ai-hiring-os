"""
AI Hiring OS — Comprehensive Load Test
=======================================

Simulates realistic multi-role user behavior across all critical business flows.

User Distribution:
  40% Employees  — Attendance, Payroll self-service, Profile
  30% HR         — Jobs, Candidates, Dashboard, Recruiter Copilot
  20% Managers   — Candidate review, Interview review, Performance, Team
  10% Recruiters — Agentic AI, Interview scheduling, Candidate analysis

Required environment variables:
  LOCUST_HR_EMAIL       — HR user email
  LOCUST_HR_PASSWORD    — HR user password
  LOCUST_EMP_EMAIL      — Employee user email (rotated from pool)
  LOCUST_EMP_PASSWORD   — Employee user password
  LOCUST_MGR_EMAIL      — Manager user email
  LOCUST_MGR_PASSWORD   — Manager user password

Optional:
  LOCUST_JOB_ID           — Job ID to use for candidate listing
  LOCUST_PAYROLL_MONTH    — Month for payroll queries (1-12)
  LOCUST_PAYROLL_YEAR     — Year for payroll queries

Usage:
  python -m locust -f load_tests/locustfile.py \\
    --host http://localhost:8000 \\
    --headless -u 100 -r 10 -t 5m \\
    --csv load_tests/results/100_users
"""

from __future__ import annotations

import os
import random
from pathlib import Path

from locust import HttpUser, TaskSet, between, task, events

# ---------------------------------------------------------------------------
# Demo user pool (JourneySync company — verified in demo readiness audit)
# ---------------------------------------------------------------------------

_DEMO_PASSWORD = os.getenv("LOCUST_EMP_PASSWORD", "123456")
_HR_EMAIL = os.getenv("LOCUST_HR_EMAIL", "hr@journeysync.com")
_HR_PASSWORD = os.getenv("LOCUST_HR_PASSWORD", "123456")
_MGR_EMAIL = os.getenv("LOCUST_MGR_EMAIL", "kavya.reddy@journeysync.com")
_MGR_PASSWORD = os.getenv("LOCUST_MGR_PASSWORD", "123456")

# Pool of employee accounts for load distribution
_EMPLOYEE_POOL = [
    {"email": "aarav.sharma@journeysync.com", "password": _DEMO_PASSWORD},
    {"email": "priya.nair@journeysync.com", "password": _DEMO_PASSWORD},
    {"email": "rohan.verma@journeysync.com", "password": _DEMO_PASSWORD},
    {"email": "sneha.iyer@journeysync.com", "password": _DEMO_PASSWORD},
    {"email": "arjun.patel@journeysync.com", "password": _DEMO_PASSWORD},
    {"email": "rahul.gupta@journeysync.com", "password": _DEMO_PASSWORD},
    {"email": "neha.joshi@journeysync.com", "password": _DEMO_PASSWORD},
    {"email": "vikram.singh@journeysync.com", "password": _DEMO_PASSWORD},
]

# ---------------------------------------------------------------------------
# Shared bootstrap data (populated at on_start)
# ---------------------------------------------------------------------------

_GLOBAL_JOB_ID: str | None = os.getenv("LOCUST_JOB_ID")
_PAYROLL_MONTH: str | None = os.getenv("LOCUST_PAYROLL_MONTH")
_PAYROLL_YEAR: str | None = os.getenv("LOCUST_PAYROLL_YEAR")


# ---------------------------------------------------------------------------
# Base mixin: login helper
# ---------------------------------------------------------------------------


def _do_login(user: HttpUser, email: str, password: str) -> str | None:
    """Authenticate and return the access token, or None on failure."""
    with user.client.post(
        "/auth/login",
        json={"email": email, "password": password},
        catch_response=True,
        name="POST /auth/login",
    ) as resp:
        if resp.status_code == 200:
            resp.success()
            return resp.json().get("access_token")
        else:
            resp.failure(f"Login failed [{resp.status_code}]: {resp.text[:200]}")
            return None


# ===========================================================================
# EMPLOYEE USER (40% of virtual users)
# ===========================================================================


class EmployeeUser(HttpUser):
    """
    Simulates an employee doing self-service actions.
    40% of the load.
    """

    weight = 40
    wait_time = between(2, 5)

    def on_start(self):
        # Pick a random employee from the pool
        cred = random.choice(_EMPLOYEE_POOL)
        self.token = _do_login(self, cred["email"], cred["password"])
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}

    # --- Employee self-service tasks ---

    @task(5)
    def get_my_profile(self):
        """Employee views their own profile."""
        self.client.get("/me", headers=self.headers, name="GET /me")

    @task(4)
    def get_my_attendance(self):
        """Employee checks their attendance history."""
        self.client.get(
            "/attendance/me?limit=30",
            headers=self.headers,
            name="GET /attendance/me",
        )

    @task(3)
    def get_my_payroll(self):
        """Employee views their payslip history."""
        self.client.get(
            "/payroll/me?limit=12",
            headers=self.headers,
            name="GET /payroll/me",
        )

    @task(2)
    def get_my_performance(self):
        """Employee views their performance reviews."""
        self.client.get(
            "/performance/me",
            headers=self.headers,
            name="GET /performance/me",
        )

    @task(2)
    def get_employee_list(self):
        """Employee views their own record in employee list."""
        self.client.get(
            "/employees?limit=10",
            headers=self.headers,
            name="GET /employees (employee view)",
        )

    @task(1)
    def health_check(self):
        """Lightweight health probe."""
        self.client.get("/health", name="GET /health")


# ===========================================================================
# HR USER (30% of virtual users)
# ===========================================================================


class HRUser(HttpUser):
    """
    Simulates an HR manager working on recruitment, HRMS, and dashboards.
    30% of the load.
    """

    weight = 30
    wait_time = between(2, 6)

    def on_start(self):
        self.token = _do_login(self, _HR_EMAIL, _HR_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.job_id: str | None = _GLOBAL_JOB_ID

        # Bootstrap: get first job if not set
        if not self.job_id and self.token:
            resp = self.client.get(
                "/jobs?limit=10",
                headers=self.headers,
                name="/jobs bootstrap",
            )
            if resp.ok:
                jobs = resp.json()
                if jobs:
                    self.job_id = str(jobs[0]["id"])

    # --- Recruitment tasks ---

    @task(5)
    def list_jobs(self):
        """HR views the job listing."""
        self.client.get(
            "/jobs?limit=50",
            headers=self.headers,
            name="GET /jobs",
        )

    @task(4)
    def list_candidates(self):
        """HR reviews candidates for a job."""
        if not self.job_id:
            return
        self.client.get(
            f"/jobs/{self.job_id}/candidates",
            headers=self.headers,
            name="GET /jobs/{job_id}/candidates",
        )

    @task(3)
    def list_employees(self):
        """HR views the employee directory."""
        self.client.get(
            "/employees?limit=50",
            headers=self.headers,
            name="GET /employees (HR view)",
        )

    @task(3)
    def list_company_attendance(self):
        """HR reviews today's company attendance."""
        self.client.get(
            "/attendance/company",
            headers=self.headers,
            name="GET /attendance/company",
        )

    @task(2)
    def list_payroll(self):
        """HR views payroll records."""
        q = f"?limit=50"
        if _PAYROLL_MONTH and _PAYROLL_YEAR:
            q = f"?month={_PAYROLL_MONTH}&year={_PAYROLL_YEAR}&limit=50"
        self.client.get(
            f"/payroll{q}",
            headers=self.headers,
            name="GET /payroll",
        )

    @task(2)
    def list_company_performance(self):
        """HR views company-wide performance analytics."""
        self.client.get(
            "/performance/company",
            headers=self.headers,
            name="GET /performance/company",
        )

    @task(2)
    def get_company_interviews(self):
        """HR views interview analytics."""
        self.client.get(
            "/interviews/company/analytics",
            headers=self.headers,
            name="GET /interviews/company/analytics",
        )

    @task(1)
    def get_my_profile(self):
        """HR views their profile."""
        self.client.get("/me", headers=self.headers, name="GET /me")

    @task(1)
    def list_public_jobs(self):
        """HR checks the public job board."""
        self.client.get(
            "/jobs/public?limit=10",
            headers=self.headers,
            name="GET /jobs/public",
        )

    @task(1)
    def health_check(self):
        self.client.get("/health", name="GET /health")


# ===========================================================================
# MANAGER USER (20% of virtual users)
# ===========================================================================


class ManagerUser(HttpUser):
    """
    Simulates a manager reviewing team performance, attendance, and candidates.
    20% of the load.
    """

    weight = 20
    wait_time = between(3, 7)

    def on_start(self):
        self.token = _do_login(self, _MGR_EMAIL, _MGR_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.job_id: str | None = _GLOBAL_JOB_ID

    # --- Manager tasks ---

    @task(4)
    def view_team_attendance(self):
        """Manager checks team attendance."""
        self.client.get(
            "/attendance/team",
            headers=self.headers,
            name="GET /attendance/team",
        )

    @task(4)
    def view_team_performance(self):
        """Manager views team performance reviews."""
        self.client.get(
            "/performance/team",
            headers=self.headers,
            name="GET /performance/team",
        )

    @task(3)
    def view_employees(self):
        """Manager views team members."""
        self.client.get(
            "/employees?limit=20",
            headers=self.headers,
            name="GET /employees (manager view)",
        )

    @task(3)
    def view_candidates(self):
        """Manager reviews candidates."""
        if not self.job_id:
            return
        self.client.get(
            f"/jobs/{self.job_id}/candidates",
            headers=self.headers,
            name="GET /jobs/{job_id}/candidates",
        )

    @task(2)
    def view_interview_analytics(self):
        """Manager views interview results."""
        self.client.get(
            "/interviews/company/analytics",
            headers=self.headers,
            name="GET /interviews/company/analytics",
        )

    @task(2)
    def view_payroll(self):
        """Manager views team payroll."""
        self.client.get(
            "/payroll?limit=20",
            headers=self.headers,
            name="GET /payroll",
        )

    @task(1)
    def get_my_profile(self):
        self.client.get("/me", headers=self.headers, name="GET /me")

    @task(1)
    def get_my_attendance(self):
        self.client.get(
            "/attendance/me?limit=15",
            headers=self.headers,
            name="GET /attendance/me",
        )

    @task(1)
    def health_check(self):
        self.client.get("/health", name="GET /health")


# ===========================================================================
# RECRUITER USER (10% of virtual users) — uses HR credentials
# ===========================================================================


class RecruiterUser(HttpUser):
    """
    Simulates a recruiter running candidate analysis and agentic AI queries.
    10% of the load — AI-heavy requests, longer think times.
    """

    weight = 10
    wait_time = between(5, 15)  # AI endpoints are slow — realistic pacing

    def on_start(self):
        self.token = _do_login(self, _HR_EMAIL, _HR_PASSWORD)
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.job_id: str | None = _GLOBAL_JOB_ID

        if not self.job_id and self.token:
            resp = self.client.get(
                "/jobs?limit=5",
                headers=self.headers,
                name="/jobs bootstrap",
            )
            if resp.ok:
                jobs = resp.json()
                if jobs:
                    self.job_id = str(jobs[0]["id"])

    # --- Agentic AI tasks ---

    @task(3)
    def ask_recruiter_copilot(self):
        """Recruiter asks the AI copilot a business question."""
        questions = [
            "How many candidates applied this week?",
            "What is the average AI score of shortlisted candidates?",
            "Which jobs have the most applicants?",
            "Show me the top candidates for the latest job posting.",
        ]
        self.client.post(
            "/agent/ask",
            json={"message": random.choice(questions)},
            headers=self.headers,
            name="POST /agent/ask",
        )

    @task(3)
    def review_candidates(self):
        """Recruiter reviews the candidate pipeline."""
        if not self.job_id:
            return
        self.client.get(
            f"/jobs/{self.job_id}/candidates",
            headers=self.headers,
            name="GET /jobs/{job_id}/candidates",
        )

    @task(2)
    def list_jobs(self):
        """Recruiter browses open positions."""
        self.client.get(
            "/jobs?limit=20",
            headers=self.headers,
            name="GET /jobs",
        )

    @task(2)
    def view_interview_results(self):
        """Recruiter checks interview outcomes."""
        self.client.get(
            "/interviews/company/analytics",
            headers=self.headers,
            name="GET /interviews/company/analytics",
        )

    @task(1)
    def view_employees(self):
        """Recruiter checks employee directory for headcount."""
        self.client.get(
            "/employees?limit=50",
            headers=self.headers,
            name="GET /employees (recruiter view)",
        )

    @task(1)
    def health_check(self):
        self.client.get("/health", name="GET /health")
