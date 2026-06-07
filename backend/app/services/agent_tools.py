"""
Recruiter copilot tool registry.

All tools are read-only and tenant-scoped. They return compact dictionaries so
agent answers remain explainable and safe for HR review.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_score import AIScore
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.interview import InterviewSession
from app.models.job import Job
from app.models.payroll import PayrollRecord
from app.models.performance import PerformanceReview
from app.models.resume import Resume
from app.services.candidate_intelligence_service import build_candidate_intelligence


def _as_id(value: str | uuid.UUID | None) -> uuid.UUID | None:
    if value is None or isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except ValueError:
        return None


def _job_dict(job: Job, candidate_count: int | None = None) -> dict[str, Any]:
    data = {
        "id": str(job.id),
        "title": job.title,
        "department": job.department,
        "location": job.location,
        "employment_type": job.employment_type,
        "salary_range": job.salary_range,
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }
    if candidate_count is not None:
        data["candidate_count"] = candidate_count
    return data


def _candidate_dict(resume: Resume, score: AIScore | None, interview: InterviewSession | None = None, job: Job | None = None) -> dict[str, Any]:
    intelligence = build_candidate_intelligence(resume, score, job)
    return {
        "resume_id": str(resume.id),
        "candidate_name": resume.candidate_name,
        "email": resume.email,
        "phone": resume.phone,
        "hiring_status": resume.hiring_status,
        "score": round(float(score.score or 0), 1) if score else 0.0,
        "skill_match_score": round(float(score.skill_match_score or 0), 1) if score else 0.0,
        "semantic_score": round(float(score.semantic_score or 0), 1) if score else 0.0,
        "summary": score.summary if score else None,
        "explanation": score.explanation if score else None,
        "matched_skills": score.matched_skills if score else [],
        "missing_skills": score.missing_skills if score else [],
        "interview_status": interview.status if interview else None,
        "interview_score": interview.overall_score if interview else None,
        "interview_recommendation": interview.recommendation if interview else None,
        "candidate_intelligence_score": intelligence["candidate_intelligence_score"],
        "ats_score": intelligence["ats_analysis"]["ats_score"],
        "explicit_skills": intelligence["explicit_skills"],
        "inferred_skills": intelligence["inferred_skills"],
        "project_analysis": intelligence["project_intelligence"],
        "github_analysis": intelligence["github_intelligence"],
        "portfolio_analysis": intelligence["portfolio_intelligence"],
        "hiring_recommendation": intelligence["hiring_recommendation"],
        "candidate_strengths": intelligence["candidate_strengths"],
        "candidate_weaknesses": intelligence["candidate_weaknesses"],
        "interview_focus_areas": intelligence["interview_focus_areas"],
        "candidate_intelligence": intelligence,
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
    }


async def list_jobs(db: AsyncSession, company_id: uuid.UUID, **_: Any) -> list[dict[str, Any]]:
    result = await db.execute(
        select(Job, func.count(Resume.id))
        .outerjoin(Resume, Resume.job_id == Job.id)
        .where(Job.company_id == company_id)
        .group_by(Job.id)
        .order_by(Job.created_at.desc())
    )
    return [_job_dict(job, int(count or 0)) for job, count in result.all()]


async def get_job_details(db: AsyncSession, company_id: uuid.UUID, job_id: str | uuid.UUID | None = None, title: str | None = None, **_: Any) -> dict[str, Any]:
    query = select(Job).where(Job.company_id == company_id)
    parsed_id = _as_id(job_id)
    if parsed_id:
        query = query.where(Job.id == parsed_id)
    elif title:
        query = query.where(Job.title.ilike(f"%{title.strip()}%"))
    else:
        return {}

    result = await db.execute(query.order_by(Job.created_at.desc()).limit(1))
    job = result.scalar_one_or_none()
    if not job:
        return {}
    data = _job_dict(job)
    data["description"] = job.description
    return data


async def list_candidates(db: AsyncSession, company_id: uuid.UUID, job_id: str | uuid.UUID | None = None, title: str | None = None, **_: Any) -> list[dict[str, Any]]:
    parsed_job_id = _as_id(job_id)
    if not parsed_job_id and title:
        job_result = await db.execute(
            select(Job.id).where(Job.company_id == company_id, Job.title.ilike(f"%{title.strip()}%")).limit(1)
        )
        parsed_job_id = job_result.scalar_one_or_none()

    query = (
        select(Resume, AIScore, InterviewSession, Job)
        .join(Job, Resume.job_id == Job.id)
        .outerjoin(AIScore, AIScore.resume_id == Resume.id)
        .outerjoin(InterviewSession, InterviewSession.candidate_id == Resume.id)
        .where(Job.company_id == company_id)
    )
    if parsed_job_id:
        query = query.where(Resume.job_id == parsed_job_id)

    result = await db.execute(query.order_by(AIScore.score.desc().nullslast(), Resume.created_at.desc()))
    return [_candidate_dict(resume, score, interview, job) for resume, score, interview, job in result.all()]


async def get_candidate_profile(db: AsyncSession, company_id: uuid.UUID, candidate_id: str | uuid.UUID | None = None, candidate_name: str | None = None, **_: Any) -> dict[str, Any]:
    query = (
        select(Resume, AIScore, Job, InterviewSession)
        .join(Job, Resume.job_id == Job.id)
        .outerjoin(AIScore, AIScore.resume_id == Resume.id)
        .outerjoin(InterviewSession, InterviewSession.candidate_id == Resume.id)
        .where(Job.company_id == company_id)
    )
    parsed_id = _as_id(candidate_id)
    if parsed_id:
        query = query.where(Resume.id == parsed_id)
    elif candidate_name:
        query = query.where(Resume.candidate_name.ilike(f"%{candidate_name.strip()}%"))
    else:
        return {}

    result = await db.execute(query.order_by(Resume.created_at.desc()).limit(1))
    row = result.first()
    if not row:
        return {}
    resume, score, job, interview = row
    profile = _candidate_dict(resume, score, interview, job)
    profile.update({
        "job_id": str(job.id),
        "job_title": job.title,
        "resume_excerpt": (resume.extracted_text or "")[:1200],
        "interview_metrics": interview.interview_metrics if interview else None,
        "interview_summary": interview.ai_summary if interview else None,
    })
    return profile


async def compare_candidates(db: AsyncSession, company_id: uuid.UUID, job_id: str | uuid.UUID | None = None, candidate_ids: list[str] | None = None, **kwargs: Any) -> dict[str, Any]:
    candidates = await list_candidates(db, company_id, job_id=job_id, title=kwargs.get("title"))
    if candidate_ids:
        wanted = {str(_as_id(cid)) for cid in candidate_ids if _as_id(cid)}
        candidates = [candidate for candidate in candidates if candidate["resume_id"] in wanted]

    ranked = sorted(
        candidates,
        key=lambda c: ((c.get("score") or 0) * 0.65 + (c.get("interview_score") or 0) * 0.35),
        reverse=True,
    )
    return {
        "ranked_candidates": ranked[:10],
        "comparison_basis": "Weighted resume score plus interview score where available. Human approval is still required.",
    }


async def recommend_shortlist(db: AsyncSession, company_id: uuid.UUID, job_id: str | uuid.UUID | None = None, title: str | None = None, limit: int = 3, **_: Any) -> dict[str, Any]:
    comparison = await compare_candidates(db, company_id, job_id=job_id, title=title)
    ranked = comparison["ranked_candidates"]
    recommendations = []
    manual_review = []
    for candidate in ranked:
        missing = candidate.get("missing_skills") or []
        score = candidate.get("score") or 0
        item = {
            "candidate_name": candidate["candidate_name"],
            "resume_id": candidate["resume_id"],
            "score": score,
            "ats_score": candidate.get("ats_score"),
            "candidate_intelligence_score": candidate.get("candidate_intelligence_score"),
            "recommendation": candidate.get("hiring_recommendation"),
            "project_analysis": candidate.get("project_analysis"),
            "github_analysis": candidate.get("github_analysis"),
            "portfolio_analysis": candidate.get("portfolio_analysis"),
            "interview_focus_areas": candidate.get("interview_focus_areas"),
            "reason": candidate.get("summary") or candidate.get("explanation") or "Strongest available score for this role.",
            "next_action": "Schedule adaptive interview" if not candidate.get("interview_score") else "Review final scorecard",
        }
        if score >= 75 and len(recommendations) < limit:
            recommendations.append(item)
        elif score < 60 or len(missing) >= 4:
            manual_review.append({**item, "concern": "Lower score or broad skill gaps require recruiter review."})

    return {
        "recommended_shortlist": recommendations,
        "manual_review": manual_review[:5],
        "policy": "This is advisory only. The agent cannot hire, reject, or change candidate status.",
    }


async def get_interview_results(db: AsyncSession, company_id: uuid.UUID, candidate_id: str | uuid.UUID | None = None, **_: Any) -> list[dict[str, Any]]:
    query = select(InterviewSession, Resume.candidate_name).join(Resume, InterviewSession.candidate_id == Resume.id).where(InterviewSession.company_id == company_id)
    parsed_id = _as_id(candidate_id)
    if parsed_id:
        query = query.where(InterviewSession.candidate_id == parsed_id)
    result = await db.execute(query.order_by(InterviewSession.created_at.desc()).limit(20))
    return [
        {
            "session_id": str(session.id),
            "candidate_name": candidate_name,
            "status": session.status,
            "technical_score": session.technical_score,
            "communication_score": session.communication_score,
            "confidence_score": session.confidence_score,
            "fluency_score": session.fluency_score,
            "overall_score": session.overall_score,
            "recommendation": session.recommendation,
            "summary": session.ai_summary,
            "metrics": session.interview_metrics,
        }
        for session, candidate_name in result.all()
    ]


async def get_employee_stats(db: AsyncSession, company_id: uuid.UUID, **_: Any) -> dict[str, Any]:
    employees = await db.scalar(select(func.count(Employee.id)).where(Employee.company_id == company_id)) or 0
    active = await db.scalar(select(func.count(Employee.id)).where(Employee.company_id == company_id, Employee.status == "active")) or 0
    attendance = await db.scalar(select(func.count(AttendanceRecord.id)).where(AttendanceRecord.company_id == company_id)) or 0
    avg_rating = await db.scalar(select(func.avg(PerformanceReview.rating)).where(PerformanceReview.company_id == company_id))
    return {
        "total_employees": int(employees),
        "active_employees": int(active),
        "attendance_records": int(attendance),
        "average_performance_rating": round(float(avg_rating or 0), 2),
    }


async def get_payroll_summary(db: AsyncSession, company_id: uuid.UUID, **_: Any) -> dict[str, Any]:
    result = await db.execute(select(PayrollRecord).where(PayrollRecord.company_id == company_id))
    records = list(result.scalars().all())
    total_cost = sum(float(record.net_salary or 0) for record in records)
    return {
        "records": len(records),
        "total_payroll_cost": round(total_cost, 2),
        "pending": len([record for record in records if record.status in {"draft", "generated"}]),
        "approved": len([record for record in records if record.status == "approved"]),
        "paid": len([record for record in records if record.status == "paid"]),
        "policy": "Read-only payroll summary. The agent cannot approve, pay, or modify payroll.",
    }


TOOL_REGISTRY = {
    "list_jobs": list_jobs,
    "get_job_details": get_job_details,
    "list_candidates": list_candidates,
    "get_candidate_profile": get_candidate_profile,
    "compare_candidates": compare_candidates,
    "recommend_shortlist": recommend_shortlist,
    "get_interview_results": get_interview_results,
    "get_employee_stats": get_employee_stats,
    "get_payroll_summary": get_payroll_summary,
}
