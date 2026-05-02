"""
AI Hiring OS — Job Service
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.schemas.job import JobCreate


async def create_job(
    db: AsyncSession,
    payload: JobCreate,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Job:
    """Create a new job posting."""
    job = Job(
        title=payload.title,
        description=payload.description,
        company_id=company_id,
        created_by=user_id,
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return job


async def get_job_by_id(db: AsyncSession, job_id: uuid.UUID) -> Job | None:
    """Fetch a job by its primary key."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    return result.scalar_one_or_none()


async def list_jobs_by_company(
    db: AsyncSession,
    company_id: uuid.UUID,
    *,
    skip: int = 0,
    limit: int = 100,
) -> list[Job]:
    """Return jobs scoped to a specific company (tenant isolation)."""
    result = await db.execute(
        select(Job)
        .where(Job.company_id == company_id)
        .offset(skip)
        .limit(limit)
        .order_by(Job.created_at.desc())
    )
    return list(result.scalars().all())
