"""
AI Hiring OS — AI Score Service
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_score import AIScore, AIScoreStatus


async def create_or_update_ai_score(
    db: AsyncSession,
    resume_id: uuid.UUID,
    **kwargs
) -> AIScore:
    """Create or update AI score metadata."""
    result = await db.execute(select(AIScore).where(AIScore.resume_id == resume_id))
    ai_score = result.scalar_one_or_none()

    if not ai_score:
        ai_score = AIScore(resume_id=resume_id, **kwargs)
        db.add(ai_score)
    else:
        for key, value in kwargs.items():
            setattr(ai_score, key, value)
    
    await db.commit()
    await db.refresh(ai_score)
    return ai_score


async def update_status(
    db: AsyncSession,
    resume_id: uuid.UUID,
    status: AIScoreStatus
):
    """Update only the status of the evaluation."""
    result = await db.execute(select(AIScore).where(AIScore.resume_id == resume_id))
    ai_score = result.scalar_one_or_none()
    if ai_score:
        ai_score.status = status
        await db.commit()


async def get_score_by_resume(
    db: AsyncSession,
    resume_id: uuid.UUID
) -> AIScore | None:
    """Retrieve score for a specific resume."""
    result = await db.execute(select(AIScore).where(AIScore.resume_id == resume_id))
    return result.scalar_one_or_none()
