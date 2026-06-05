from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import func, select, text

sys.path.append(str(Path(__file__).resolve().parents[1]))

import app.models  # noqa: F401
from app.auth.supabase_auth import get_supabase_client
from app.db.session import AsyncSessionLocal
from app.models.ai_score import AIScore
from app.models.agent import AgentAction, AgentSession, InterviewAgentHistory
from app.models.attendance import AttendanceRecord
from app.models.company import Company
from app.models.employee import Employee
from app.models.interview import InterviewSession
from app.models.job import Job
from app.models.payroll import PayrollRecord
from app.models.performance import PerformanceReview
from app.models.resume import Resume
from app.models.user import User
from app.services.storage_service import BUCKET_NAME

MODELS = {
    "companies": Company,
    "users": User,
    "jobs": Job,
    "resumes": Resume,
    "ai_scores": AIScore,
    "employees": Employee,
    "attendance_records": AttendanceRecord,
    "performance_reviews": PerformanceReview,
    "interview_sessions": InterviewSession,
    "payroll_records": PayrollRecord,
    "agent_sessions": AgentSession,
    "agent_actions": AgentAction,
    "interview_agent_history": InterviewAgentHistory,
}

JOURNEYSYNC_EMAILS = [
    "aarav.sharma@journeysync.com",
    "priya.nair@journeysync.com",
    "rohan.verma@journeysync.com",
    "sneha.iyer@journeysync.com",
    "arjun.patel@journeysync.com",
    "kavya.reddy@journeysync.com",
    "rahul.gupta@journeysync.com",
    "neha.joshi@journeysync.com",
    "vikram.singh@journeysync.com",
]


async def main() -> None:
    snapshot = {"counts": {}, "orphans": {}, "duplicates": {}, "journeysync": {}, "storage": {}}

    async with AsyncSessionLocal() as session:
        for name, model in MODELS.items():
            snapshot["counts"][name] = await session.scalar(select(func.count(model.id))) or 0

        orphan_queries = {
            "users_without_company": "select count(*) from users u left join companies c on c.id = u.company_id where c.id is null",
            "jobs_without_company": "select count(*) from jobs j left join companies c on c.id = j.company_id where c.id is null",
            "resumes_without_job": "select count(*) from resumes r left join jobs j on j.id = r.job_id where j.id is null",
            "ai_scores_without_resume": "select count(*) from ai_scores s left join resumes r on r.id = s.resume_id where r.id is null",
            "employees_without_company": "select count(*) from employees e left join companies c on c.id = e.company_id where c.id is null",
            "attendance_without_employee": "select count(*) from attendance_records a left join employees e on e.id = a.employee_id where e.id is null",
            "payroll_without_employee": "select count(*) from payroll_records p left join employees e on e.id = p.employee_id where e.id is null",
            "performance_without_employee": "select count(*) from performance_reviews p left join employees e on e.id = p.employee_id where e.id is null",
            "interviews_without_resume": "select count(*) from interview_sessions i left join resumes r on r.id = i.candidate_id where r.id is null",
        }
        for key, query in orphan_queries.items():
            snapshot["orphans"][key] = (await session.execute(text(query))).scalar() or 0

        duplicate_queries = {
            "duplicate_user_emails": "select count(*) from (select lower(email) from users group by lower(email) having count(*) > 1) d",
            "duplicate_employee_company_emails": "select count(*) from (select company_id, lower(email) from employees group by company_id, lower(email) having count(*) > 1) d",
            "duplicate_ai_scores_per_resume": "select count(*) from (select resume_id from ai_scores group by resume_id having count(*) > 1) d",
            "duplicate_payroll_periods": "select count(*) from (select employee_id, month, year from payroll_records group by employee_id, month, year having count(*) > 1) d",
        }
        for key, query in duplicate_queries.items():
            snapshot["duplicates"][key] = (await session.execute(text(query))).scalar() or 0

        company = await session.scalar(select(Company).where(func.lower(Company.name) == "journeysync"))
        if company:
            users = await session.scalar(select(func.count(User.id)).where(User.company_id == company.id, func.lower(User.email).in_(JOURNEYSYNC_EMAILS))) or 0
            employees = await session.scalar(select(func.count(Employee.id)).where(Employee.company_id == company.id, func.lower(Employee.email).in_(JOURNEYSYNC_EMAILS))) or 0
            jobs = await session.scalar(select(func.count(Job.id)).where(Job.company_id == company.id)) or 0
            resumes = await session.scalar(select(func.count(Resume.id)).join(Job).where(Job.company_id == company.id)) or 0
            interviews = await session.scalar(select(func.count(InterviewSession.id)).where(InterviewSession.company_id == company.id)) or 0
            snapshot["journeysync"] = {
                "company_id": str(company.id),
                "users": users,
                "employees": employees,
                "jobs": jobs,
                "resumes": resumes,
                "interviews": interviews,
            }

    client = get_supabase_client()
    try:
        buckets = client.storage.list_buckets()
        snapshot["storage"]["bucket_exists"] = BUCKET_NAME in [bucket.name for bucket in buckets]
    except Exception as exc:
        snapshot["storage"]["bucket_exists"] = False
        snapshot["storage"]["error"] = str(exc)

    try:
        response = client.auth.admin.list_users(page=1, per_page=1000)
        auth_users = getattr(response, "users", response)
        snapshot["supabase_auth"] = {
            "total_listed": len(auth_users),
            "journeysync_users": len([user for user in auth_users if user.email and user.email.lower() in JOURNEYSYNC_EMAILS]),
        }
    except Exception as exc:
        snapshot["supabase_auth"] = {"error": str(exc)}

    print(json.dumps(snapshot, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
