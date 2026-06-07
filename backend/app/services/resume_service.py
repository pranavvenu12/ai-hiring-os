"""
AI Hiring OS — Resume Service
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resume import Resume
from app.models.job import Job
from app.services.candidate_intelligence_service import build_candidate_intelligence


async def create_resume(
    db: AsyncSession,
    job_id: uuid.UUID,
    candidate_name: str,
    file_url: str,
    email: str | None = None,
    phone: str | None = None,
) -> Resume:
    """Create a new resume entry in the database."""
    resume = Resume(
        job_id=job_id,
        candidate_name=candidate_name,
        file_url=file_url,
        email=email,
        phone=phone,
    )
    db.add(resume)
    await db.flush()
    await db.refresh(resume)
    return resume


async def update_resume_text(
    db: AsyncSession,
    resume_id: uuid.UUID,
    extracted_text: str,
) -> Resume | None:
    """Update a resume with its extracted text."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if resume:
        resume.extracted_text = extracted_text
        await db.commit()
        await db.refresh(resume)
    return resume


async def list_resumes_by_job(
    db: AsyncSession,
    job_id: uuid.UUID,
) -> list[Resume]:
    """Return all resumes for a specific job."""
    result = await db.execute(
        select(Resume)
        .where(Resume.job_id == job_id)
        .order_by(Resume.created_at.desc())
    )
    return list(result.scalars().all())


async def list_candidates_with_scores(
    db: AsyncSession,
    job_id: uuid.UUID,
) -> list[dict]:
    """Return resumes with joined AI scores for a job."""
    from app.models.ai_score import AIScore
    
    query = (
        select(Resume, AIScore, Job)
        .join(Job, Resume.job_id == Job.id)
        .outerjoin(AIScore, Resume.id == AIScore.resume_id)
        .where(Resume.job_id == job_id)
        .order_by(Resume.created_at.desc())
    )
    result = await db.execute(query)
    
    candidates = []
    for resume, ai_score, job in result.all():
        candidates.append({
            "resume_id": resume.id,
            "candidate_name": resume.candidate_name,
            "file_url": resume.file_url,
            "created_at": resume.created_at,
            "score": ai_score.score if ai_score else 0.0,
            "skill_match_score": ai_score.skill_match_score if ai_score else 0.0,
            "semantic_score": ai_score.semantic_score if ai_score else 0.0,
            "status": ai_score.status if ai_score else "pending",
            "summary": ai_score.summary if ai_score else None,
            "explanation": ai_score.explanation if ai_score else None,
            "matched_skills": ai_score.matched_skills if ai_score else [],
            "missing_skills": ai_score.missing_skills if ai_score else [],
            "hiring_status": resume.hiring_status,
            "email": resume.email,
            "phone": resume.phone,
            "candidate_intelligence": build_candidate_intelligence(resume, ai_score, job),
        })
    return candidates
