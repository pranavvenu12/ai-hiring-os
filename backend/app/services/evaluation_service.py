"""
AI Hiring OS — Evaluation Service (Coordinator)

Runs full evaluation pipeline:
1. Deterministic hybrid scoring as baseline
2. Multi-provider AI scoring as primary when available
3. Persists combined results to DB
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
    realtime_service,
    scoring_service,
)

logger = logging.getLogger(__name__)


async def run_full_evaluation(resume_id: uuid.UUID):
    """
    Background worker: deterministic baseline → Gemini AI scoring → persist.
    If Gemini succeeds, its scores are used as the final scores.
    If Gemini fails, deterministic scores are used as fallback.
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

            # 2. Mark as PROCESSING
            await ai_score_service.create_or_update_ai_score(
                db, resume_id, status=AIScoreStatus.PROCESSING
            )

            resume_text = resume.extracted_text or ""
            jd_text = job.description or ""

            # 3. Deterministic Scoring (always runs as baseline / fallback)
            det = scoring_service.calculate_deterministic_scores(resume_text, jd_text)

            # 4. AI Scoring via Gemini (primary)
            ai_result = None
            try:
                ai_result = await ai_service.generate_ai_insights(resume_text, jd_text)
            except Exception as e:
                logger.error(f"AI insights generation error for resume {resume_id}: {e}")

            # 5. Merge: prefer AI scores when available
            if ai_result and ai_result.get("score") is not None:
                final_score = ai_result["score"]
                skill_match_score = ai_result.get("skill_match_score", det["skill_match_score"])
                semantic_score = ai_result.get("semantic_score", det["semantic_score"])
                summary = ai_result.get("summary") or det_summary(resume_text)
                explanation = ai_result.get("explanation") or ""
                matched_skills = ai_result.get("matched_skills") or det["matched_skills"]
                missing_skills = ai_result.get("missing_skills") or det["missing_skills"]
                logger.info(
                    f"Resume {resume_id}: Gemini score={final_score:.1f}%, "
                    f"skill={skill_match_score:.1f}%, semantic={semantic_score:.1f}%"
                )
            else:
                # Pure deterministic fallback — no LLM available
                final_score = det["score"]
                skill_match_score = det["skill_match_score"]
                semantic_score = det["semantic_score"]
                summary = "Candidate profile matched against job description requirements."
                explanation = "Profile analysis complete. Evaluation based on candidate skills, domain experience, and job description alignment."
                matched_skills = det["matched_skills"]
                missing_skills = det["missing_skills"]
                logger.warning(f"Resume {resume_id}: Using deterministic fallback score={final_score:.1f}%")

            # 6. Persist Results
            await ai_score_service.create_or_update_ai_score(
                db,
                resume_id,
                score=final_score,
                skill_match_score=skill_match_score,
                semantic_score=semantic_score,
                summary=summary,
                explanation=explanation,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                status=AIScoreStatus.COMPLETED,
            )

            await realtime_service.publish_event(job.company_id, "ai_score.generated", {
                "resume_id": str(resume_id),
                "job_id": str(job.id),
                "candidate_name": resume.candidate_name,
                "score": final_score,
                "status": AIScoreStatus.COMPLETED.value,
            })
            logger.info(f"Evaluation completed for resume {resume_id}: final_score={final_score:.1f}%")

        except Exception as exc:
            logger.exception(f"Fatal error during evaluation of resume {resume_id}: {exc}")
            await ai_score_service.create_or_update_ai_score(
                db, resume_id, status=AIScoreStatus.FAILED
            )


def det_summary(resume_text: str) -> str:
    """Generate a basic summary from resume text when LLM is unavailable."""
    lines = [l.strip() for l in resume_text.splitlines() if l.strip()]
    if lines:
        return lines[0][:200]
    return "Candidate profile extracted from resume."


async def evaluate_stuck_candidate_background(resume_id: uuid.UUID):
    """
    Ensure the candidate's resume has text extracted and full evaluation completed.
    This downloads the resume PDF if extracted_text is missing, then runs run_full_evaluation.
    """
    import httpx
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.resume import Resume
    from app.models.ai_score import AIScoreStatus
    from app.services import extraction_service
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch Resume
            result = await db.execute(select(Resume).where(Resume.id == resume_id))
            resume = result.scalar_one_or_none()
            if not resume:
                return
                
            # 2. Extract text if missing
            if not resume.extracted_text:
                logger.info(f"Downloading PDF resume for stuck candidate {resume_id} from {resume.file_url}...")
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(resume.file_url)
                    resp.raise_for_status()
                    content = resp.content
                
                text = await extraction_service.extract_text_from_pdf(content)
                resume.extracted_text = text
                await db.commit()
                await db.refresh(resume)
                logger.info(f"Text extraction completed for stuck candidate {resume_id}.")
            
            # 3. Trigger evaluation
            await run_full_evaluation(resume_id)
        except Exception as e:
            logger.error(f"Failed to evaluate stuck candidate {resume_id} in background: {e}")
            try:
                from app.services import ai_score_service
                await ai_score_service.create_or_update_ai_score(
                    db, resume_id, status=AIScoreStatus.FAILED
                )
            except Exception:
                pass
