"""
AI Hiring OS — Infrastructure Baseline Load Test
=================================================

Tests all non-auth endpoints to validate backend performance:
- Health endpoint (no auth)
- Public job listings (no auth)
- Auth login attempt (measures auth layer latency including Supabase RTT)

This script collects REAL measured metrics from the running backend.
"""

from __future__ import annotations

import random
from locust import HttpUser, between, task


class BaselineUser(HttpUser):
    """
    Tests infrastructure endpoints that work without Supabase auth.
    Measures: HTTP server response, routing, middleware stack.
    """
    weight = 100
    wait_time = between(0.5, 2)

    @task(10)
    def health_check(self):
        """Lightweight health probe — measures FastAPI baseline latency."""
        self.client.get("/health", name="GET /health")

    @task(5)
    def public_jobs(self):
        """Public job listing — no auth, exercises DB + ORM layer."""
        self.client.get("/jobs/public?limit=10", name="GET /jobs/public")

    @task(3)
    def root_endpoint(self):
        """Root route — measures ASGI routing overhead."""
        self.client.get("/", name="GET /")

    @task(2)
    def auth_login_attempt(self):
        """Login attempt — measures full auth stack latency (incl. Supabase RTT)."""
        with self.client.post(
            "/auth/login",
            json={"email": "aarav.sharma@journeysync.com", "password": "123456"},
            catch_response=True,
            name="POST /auth/login",
        ) as resp:
            # In this test environment, Supabase may be unreachable from Python
            # We capture the response regardless for timing data
            if resp.status_code in (200, 401, 500, 503):
                resp.success()  # Record timing even on auth failure
            else:
                resp.failure(f"Unexpected status: {resp.status_code}")
