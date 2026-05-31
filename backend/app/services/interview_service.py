"""
AI Hiring OS — Interview Service

Business logic for AI interview session management.
"""

from __future__ import annotations

import uuid
import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import InterviewSession, InterviewStatus
from app.models.resume import Resume
from app.models.job import Job
from app.services import interview_ai_service

logger = logging.getLogger(__name__)


async def start_interview(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    job_id: uuid.UUID,
    company_id: uuid.UUID,
    interview_type: str = "technical",
) -> InterviewSession:
    """Start a new AI interview session — generates questions from JD + resume."""
    # Fetch resume and job for context
    resume_result = await db.execute(
        select(Resume).where(Resume.id == candidate_id)
    )
    resume = resume_result.scalar_one_or_none()

    job_result = await db.execute(
        select(Job).where(Job.id == job_id)
    )
    job = job_result.scalar_one_or_none()

    # Generate questions using AI
    questions = await interview_ai_service.generate_interview_questions(
        job_description=job.description if job else "",
        resume_text=resume.extracted_text or "" if resume else "",
        interview_type=interview_type,
    )

    session = InterviewSession(
        candidate_id=candidate_id,
        job_id=job_id,
        company_id=company_id,
        interview_type=interview_type,
        status=InterviewStatus.IN_PROGRESS.value,
        questions=questions,
        transcript=[],
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


async def submit_answer(
    db: AsyncSession,
    session_id: uuid.UUID,
    question_index: int,
    answer_text: str,
) -> InterviewSession:
    """Submit an answer to an interview question — appends to transcript."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Interview session not found.")

    if session.status == InterviewStatus.COMPLETED.value:
        raise ValueError("Interview is already completed.")

    questions = session.questions or []
    if question_index < 0 or question_index >= len(questions):
        raise ValueError(f"Invalid question index: {question_index}")

    transcript = list(session.transcript or [])
    transcript.append({
        "question_index": question_index,
        "question": questions[question_index].get("question", ""),
        "category": questions[question_index].get("category", ""),
        "answer": answer_text,
    })
    session.transcript = transcript

    await db.flush()
    await db.refresh(session)
    return session


async def complete_interview(
    db: AsyncSession,
    session_id: uuid.UUID,
) -> InterviewSession:
    """Finalize interview and trigger AI evaluation for scoring."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise ValueError("Interview session not found.")

    # Fetch resume and job for evaluation context
    resume_result = await db.execute(
        select(Resume).where(Resume.id == session.candidate_id)
    )
    resume = resume_result.scalar_one_or_none()

    job_result = await db.execute(
        select(Job).where(Job.id == session.job_id)
    )
    job = job_result.scalar_one_or_none()

    # Evaluate with AI
    try:
        evaluation = await interview_ai_service.evaluate_interview(
            transcript=session.transcript or [],
            job_description=job.description if job else "",
            resume_text=resume.extracted_text or "" if resume else "",
        )
    except Exception as e:
        logger.error(f"Interview evaluation failed: {e}")
        evaluation = interview_ai_service._get_template_evaluation(
            session.transcript or []
        )

    session.status = InterviewStatus.COMPLETED.value
    session.ai_summary = evaluation.get("ai_summary", "")
    session.technical_score = evaluation.get("technical_score", 0)
    session.communication_score = evaluation.get("communication_score", 0)
    session.confidence_score = evaluation.get("confidence_score", 0)
    session.overall_score = evaluation.get("overall_score", 0)
    session.recommendation = evaluation.get("recommendation", "consider")

    await db.flush()
    await db.refresh(session)
    return session


async def get_interview(
    db: AsyncSession, session_id: uuid.UUID,
) -> InterviewSession | None:
    """Fetch an interview session by ID."""
    result = await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )
    return result.scalar_one_or_none()


async def list_interviews_by_candidate(
    db: AsyncSession, candidate_id: uuid.UUID, company_id: uuid.UUID,
) -> list[dict]:
    """List all interview sessions for a candidate."""
    result = await db.execute(
        select(InterviewSession, Resume.candidate_name)
        .join(Resume, InterviewSession.candidate_id == Resume.id)
        .where(
            InterviewSession.candidate_id == candidate_id,
            InterviewSession.company_id == company_id,
        )
        .order_by(InterviewSession.created_at.desc())
    )
    rows = result.all()

    return [
        {
            "id": str(session.id),
            "candidate_id": str(session.candidate_id),
            "job_id": str(session.job_id),
            "company_id": str(session.company_id),
            "interview_type": session.interview_type,
            "status": session.status,
            "questions": session.questions,
            "transcript": session.transcript,
            "ai_summary": session.ai_summary,
            "technical_score": session.technical_score,
            "communication_score": session.communication_score,
            "confidence_score": session.confidence_score,
            "overall_score": session.overall_score,
            "recommendation": session.recommendation,
            "created_at": session.created_at.isoformat(),
            "candidate_name": cand_name,
        }
        for session, cand_name in rows
    ]


async def list_interviews_by_company(
    db: AsyncSession, company_id: uuid.UUID,
) -> dict:
    """Get company-wide interview analytics."""
    result = await db.execute(
        select(InterviewSession, Resume.candidate_name)
        .join(Resume, InterviewSession.candidate_id == Resume.id)
        .where(InterviewSession.company_id == company_id)
        .order_by(InterviewSession.created_at.desc())
    )
    rows = result.all()

    total = len(rows)
    completed = sum(1 for s, _ in rows if s.status == InterviewStatus.COMPLETED.value)

    tech_scores = [s.technical_score for s, _ in rows if s.technical_score is not None]
    comm_scores = [s.communication_score for s, _ in rows if s.communication_score is not None]
    conf_scores = [s.confidence_score for s, _ in rows if s.confidence_score is not None]
    overall_scores = [s.overall_score for s, _ in rows if s.overall_score is not None]

    interviews = [
        {
            "id": str(session.id),
            "candidate_id": str(session.candidate_id),
            "job_id": str(session.job_id),
            "company_id": str(session.company_id),
            "interview_type": session.interview_type,
            "status": session.status,
            "technical_score": session.technical_score,
            "communication_score": session.communication_score,
            "confidence_score": session.confidence_score,
            "overall_score": session.overall_score,
            "recommendation": session.recommendation,
            "created_at": session.created_at.isoformat(),
            "candidate_name": cand_name,
        }
        for session, cand_name in rows
    ]

    return {
        "total_interviews": total,
        "completed_interviews": completed,
        "completion_rate": round(completed / total * 100, 1) if total else 0.0,
        "avg_technical_score": round(sum(tech_scores) / len(tech_scores), 1) if tech_scores else 0.0,
        "avg_communication_score": round(sum(comm_scores) / len(comm_scores), 1) if comm_scores else 0.0,
        "avg_confidence_score": round(sum(conf_scores) / len(conf_scores), 1) if conf_scores else 0.0,
        "avg_overall_score": round(sum(overall_scores) / len(overall_scores), 1) if overall_scores else 0.0,
        "interviews": interviews[:20],
    }
