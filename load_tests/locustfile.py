"""
Locust load tests for AI Hiring OS.

Required environment:
  LOCUST_EMAIL
  LOCUST_PASSWORD

Optional:
  LOCUST_JOB_ID
  LOCUST_PAYROLL_MONTH
  LOCUST_PAYROLL_YEAR
"""

from __future__ import annotations

import os
from pathlib import Path

from locust import HttpUser, between, task


class AIHiringOSUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.token = None
        self.job_id = os.getenv("LOCUST_JOB_ID")
        payload = {
            "email": os.environ["LOCUST_EMAIL"],
            "password": os.environ["LOCUST_PASSWORD"],
        }
        with self.client.post("/auth/login", json=payload, catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"login failed: {response.text[:200]}")
                return
            self.token = response.json()["access_token"]
            response.success()

        self.headers = {"Authorization": f"Bearer {self.token}"}
        if not self.job_id:
            jobs = self.client.get("/jobs", headers=self.headers, name="/jobs bootstrap")
            if jobs.ok and jobs.json():
                self.job_id = jobs.json()[0]["id"]

    @task(4)
    def candidate_listing(self):
        if not self.job_id:
            return
        self.client.get(
            f"/jobs/{self.job_id}/candidates",
            headers=self.headers,
            name="/jobs/{job_id}/candidates",
        )

    @task(2)
    def payroll_retrieval(self):
        month = os.getenv("LOCUST_PAYROLL_MONTH")
        year = os.getenv("LOCUST_PAYROLL_YEAR")
        query = f"?month={month}&year={year}&limit=100" if month and year else "?limit=100"
        self.client.get(f"/payroll{query}", headers=self.headers, name="/payroll")

    @task(1)
    def resume_upload(self):
        if not self.job_id:
            return
        sample_pdf = Path(__file__).with_name("sample_resume.pdf")
        if not sample_pdf.exists():
            return
        with sample_pdf.open("rb") as handle:
            self.client.post(
                f"/jobs/{self.job_id}/upload-resumes",
                headers=self.headers,
                files={"files": ("sample_resume.pdf", handle, "application/pdf")},
                name="/jobs/{job_id}/upload-resumes",
            )
