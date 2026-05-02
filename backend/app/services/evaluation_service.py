"""
AI Hiring OS — Evaluation Service (Coordinator)
"""

from __future__ import annotations

import uuid
import logging
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.resume import Resume
from app.models.job import Job
from app.models.ai_score import AIScoreStatus
from app.services import (
    ai_service,
    ai_score_service,
    scoring_service,
)

logger = logging.getLogger(__name__)

async def run_full_evaluation(resume_id: uuid.UUID):
    """
    Background worker to perform deterministic scoring followed by AI insights.
    """
    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch Resume and Job
            result = await db.execute(
                select(Resume, Job)
                .join(Job, Resume.job_id == Job.id)
                .where(Resume.id == resume_id)
            )
            row = result.fetchone()
            if not row:
                logger.error(f"Resume {resume_id} not found for evaluation.")
                return
            
            resume, job = row
            
            # 2. Update status to PROCESSING
            await ai_score_service.create_or_update_ai_score(
                db, resume_id, status=AIScoreStatus.PROCESSING
            )

            # 3. Deterministic Scoring (NO LLM)
            deterministic_results = scoring_service.calculate_deterministic_scores(
                resume.extracted_text or "",
                job.description or ""
            )

            # 4. AI Insights (LLM with Fallback)
            try:
                ai_insights = await ai_service.generate_ai_insights(
                    resume.extracted_text or "",
                    job.description or ""
                )
            except Exception as e:
                logger.error(f"AI insights failed for resume {resume_id}: {e}")
                ai_insights = {
                    "summary": "Error during AI analysis.",
                    "explanation": str(e),
                    "matched_skills": [],
                    "missing_skills": []
                }

            # 5. Persist Results
            await ai_score_service.create_or_update_ai_score(
                db,
                resume_id,
                score=deterministic_results["score"],
                skill_match_score=deterministic_results["skill_match_score"],
                semantic_score=deterministic_results["semantic_score"],
                summary=ai_insights.get("summary"),
                explanation=ai_insights.get("explanation"),
                matched_skills=ai_insights.get("matched_skills") or deterministic_results["matched_skills"],
                missing_skills=ai_insights.get("missing_skills") or deterministic_results["missing_skills"],
                status=AIScoreStatus.COMPLETED
            )
            logger.info(f"Evaluation completed for resume {resume_id}")

        except Exception as exc:
            logger.exception(f"Fatal error during evaluation of resume {resume_id}: {exc}")
            await ai_score_service.create_or_update_ai_score(
                db, resume_id, status=AIScoreStatus.FAILED
            )
