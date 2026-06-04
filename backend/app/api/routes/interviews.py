"""
AI Hiring OS — Interview Routes

AI-powered interview session endpoints with RBAC.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.schemas.interview import BrowserVoiceFallback, InterviewAnswer, InterviewStart
from app.services import interview_service

router = APIRouter(prefix="/interviews", tags=["AI Interviews"])


@router.post(
    "/start",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def start_interview(
    payload: InterviewStart,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Start a new AI interview session for a candidate.
    Generates context-aware questions based on job description and resume.

    Allowed roles: ADMIN, HR
    """
    session = await interview_service.start_interview(
        db,
        candidate_id=payload.candidate_id,
        job_id=payload.job_id,
        company_id=current_user.company_id,
        interview_type=payload.interview_type,
    )
    return {
        "id": str(session.id),
        "status": session.status,
        "interview_type": session.interview_type,
        "questions": session.questions,
        "message": "Interview session started. Questions have been generated.",
    }


@router.post(
    "/{session_id}/answer",
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def submit_answer(
    session_id: uuid.UUID,
    payload: InterviewAnswer,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Submit a candidate's answer to an interview question.

    Allowed roles: ADMIN, HR
    """
    # Verify session belongs to company
    session = await interview_service.get_interview(db, session_id)
    if not session or session.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    try:
        session = await interview_service.submit_answer(
            db, session_id, payload.question_index, payload.answer_text,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Answer recorded.",
        "transcript_length": len(session.transcript or []),
        "total_questions": len(session.questions or []),
    }


@router.post(
    "/{session_id}/voice-answer",
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def submit_voice_answer(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    question_index: int = Form(..., ge=0),
    audio: UploadFile = File(...),
):
    """Upload recorded candidate audio, transcribe with AssemblyAI, and store voice analytics."""
    session = await interview_service.get_interview(db, session_id)
    if not session or session.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    content = await audio.read()
    try:
        session = await interview_service.submit_voice_answer(
            db,
            session_id,
            question_index,
            content,
            filename=audio.filename or "interview-answer.webm",
            content_type=audio.content_type,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"AssemblyAI transcription unavailable: {exc}")

    latest = (session.interview_metrics or {}).get("latest_voice", {})
    return {
        "message": "Voice answer transcribed and recorded.",
        "transcript": session.transcript,
        "interview_transcript": session.interview_transcript,
        "interview_metrics": session.interview_metrics,
        "audio_url": session.audio_url,
        "voice_metrics": latest,
    }


@router.post(
    "/{session_id}/voice-fallback",
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def submit_voice_fallback(
    session_id: uuid.UUID,
    payload: BrowserVoiceFallback,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Persist browser speech-recognition fallback transcript and voice metrics."""
    session = await interview_service.get_interview(db, session_id)
    if not session or session.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    session = await interview_service.submit_browser_voice_fallback(
        db,
        session_id,
        payload.question_index,
        payload.transcript_text,
    )
    return {
        "message": "Fallback voice transcript recorded.",
        "transcript": session.transcript,
        "interview_transcript": session.interview_transcript,
        "interview_metrics": session.interview_metrics,
    }


@router.post(
    "/{session_id}/complete",
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def complete_interview(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Finalize the interview and trigger AI evaluation.
    Returns scores, summary, and recommendation.

    Allowed roles: ADMIN, HR
    """
    session = await interview_service.get_interview(db, session_id)
    if not session or session.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    try:
        session = await interview_service.complete_interview(db, session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": str(session.id),
        "status": session.status,
        "ai_summary": session.ai_summary,
        "technical_score": session.technical_score,
        "communication_score": session.communication_score,
        "confidence_score": session.confidence_score,
        "fluency_score": session.fluency_score,
        "overall_score": session.overall_score,
        "recommendation": session.recommendation,
        "interview_metrics": session.interview_metrics,
        "final_agent_report": (session.interview_metrics or {}).get("final_agent_report"),
        "interview_transcript": session.interview_transcript,
        "audio_url": session.audio_url,
        "message": "Interview completed and evaluated by AI.",
    }


@router.post(
    "/{session_id}/next-question",
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def next_adaptive_question(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate the next adaptive interview question after the previous answer."""
    session = await interview_service.get_interview(db, session_id)
    if not session or session.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    try:
        result = await interview_service.generate_next_question(db, session_id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{session_id}")
async def get_interview(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get full interview session details.

    Allowed roles: ADMIN, HR, MANAGER
    """
    user_role = Role(current_user.role)
    if user_role == Role.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Insufficient privileges.")

    session = await interview_service.get_interview(db, session_id)
    if not session or session.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    return {
        "id": str(session.id),
        "candidate_id": str(session.candidate_id),
        "job_id": str(session.job_id),
        "company_id": str(session.company_id),
        "interview_type": session.interview_type,
        "status": session.status,
        "questions": session.questions,
        "transcript": session.transcript,
        "interview_transcript": session.interview_transcript,
        "interview_metrics": session.interview_metrics,
        "audio_url": session.audio_url,
        "ai_summary": session.ai_summary,
        "technical_score": session.technical_score,
        "communication_score": session.communication_score,
        "confidence_score": session.confidence_score,
        "fluency_score": session.fluency_score,
        "overall_score": session.overall_score,
        "recommendation": session.recommendation,
        "created_at": session.created_at.isoformat(),
    }


@router.get("/candidate/{candidate_id}")
async def list_candidate_interviews(
    candidate_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    List all interview sessions for a candidate.

    Allowed roles: ADMIN, HR, MANAGER
    """
    user_role = Role(current_user.role)
    if user_role == Role.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Insufficient privileges.")

    interviews = await interview_service.list_interviews_by_candidate(
        db, candidate_id, current_user.company_id,
    )
    return {"interviews": interviews}


@router.get("/company/analytics")
async def get_company_interviews(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get company-wide interview analytics.

    Allowed roles: ADMIN, HR
    """
    user_role = Role(current_user.role)
    if user_role not in (Role.ADMIN, Role.HR):
        raise HTTPException(status_code=403, detail="Insufficient privileges.")

    return await interview_service.list_interviews_by_company(
        db, current_user.company_id,
    )


# ── Public Unauthenticated Candidate Routes ─────────────────────

@router.get("/public/{session_id}")
async def get_public_interview(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get public details of an interview session (for guest candidates)."""
    from sqlalchemy import select
    session = await interview_service.get_interview(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    
    # Also fetch job details for title and department
    from app.models.job import Job
    job_result = await db.execute(select(Job).where(Job.id == session.job_id))
    job = job_result.scalar_one_or_none()

    from app.models.resume import Resume
    resume_result = await db.execute(select(Resume).where(Resume.id == session.candidate_id))
    resume = resume_result.scalar_one_or_none()

    from app.models.company import Company
    company_result = await db.execute(select(Company).where(Company.id == session.company_id))
    company = company_result.scalar_one_or_none()

    return {
        "id": str(session.id),
        "status": session.status,
        "interview_type": session.interview_type,
        "questions": session.questions,
        "job_title": job.title if job else "Software Engineer",
        "job_department": job.department if job else "Engineering",
        "candidate_name": resume.candidate_name if resume else "Candidate",
        "company_name": company.name if company else "AI Hiring Company",
        "transcript_length": len(session.transcript or []),
    }


@router.post("/public/{session_id}/answer")
async def submit_public_answer(
    session_id: uuid.UUID,
    payload: InterviewAnswer,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Submit a guest candidate's answer text."""
    try:
        session = await interview_service.submit_answer(
            db, session_id, payload.question_index, payload.answer_text,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Answer recorded.",
        "transcript_length": len(session.transcript or []),
        "total_questions": len(session.questions or []),
    }


@router.post("/public/{session_id}/voice-answer")
async def submit_public_voice_answer(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    question_index: int = Form(..., ge=0),
    audio: UploadFile = File(...),
):
    """Upload recorded guest audio and transcribe with AssemblyAI."""
    content = await audio.read()
    try:
        session = await interview_service.submit_voice_answer(
            db,
            session_id,
            question_index,
            content,
            filename=audio.filename or "interview-answer.webm",
            content_type=audio.content_type,
        )
        await db.commit()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"AssemblyAI transcription unavailable: {exc}")

    latest = (session.interview_metrics or {}).get("latest_voice", {})
    return {
        "message": "Voice answer transcribed and recorded.",
        "transcript": session.transcript,
        "interview_transcript": session.interview_transcript,
        "interview_metrics": session.interview_metrics,
        "audio_url": session.audio_url,
        "voice_metrics": latest,
    }


@router.post("/public/{session_id}/voice-fallback")
async def submit_public_voice_fallback(
    session_id: uuid.UUID,
    payload: BrowserVoiceFallback,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Persist guest browser speech-recognition fallback transcript."""
    session = await interview_service.submit_browser_voice_fallback(
        db,
        session_id,
        payload.question_index,
        payload.transcript_text,
    )
    await db.commit()
    return {
        "message": "Fallback voice transcript recorded.",
        "transcript": session.transcript,
        "interview_transcript": session.interview_transcript,
        "interview_metrics": session.interview_metrics,
    }


@router.post("/public/{session_id}/complete")
async def complete_public_interview(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Finalize the guest candidate interview and run AI evaluation."""
    try:
        session = await interview_service.complete_interview(db, session_id)
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "id": str(session.id),
        "status": session.status,
        "ai_summary": session.ai_summary,
        "overall_score": session.overall_score,
        "recommendation": session.recommendation,
        "final_agent_report": (session.interview_metrics or {}).get("final_agent_report"),
        "message": "Interview completed and evaluated by AI.",
    }


@router.post("/public/{session_id}/next-question")
async def next_public_adaptive_question(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate the next adaptive question for guest candidate interviews."""
    try:
        result = await interview_service.generate_next_question(db, session_id)
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
