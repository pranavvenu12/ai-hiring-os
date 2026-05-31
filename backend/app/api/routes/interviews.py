"""
AI Hiring OS — Interview Routes

AI-powered interview session endpoints with RBAC.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.schemas.interview import InterviewAnswer, InterviewStart
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
        "overall_score": session.overall_score,
        "recommendation": session.recommendation,
        "message": "Interview completed and evaluated by AI.",
    }


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
        "ai_summary": session.ai_summary,
        "technical_score": session.technical_score,
        "communication_score": session.communication_score,
        "confidence_score": session.confidence_score,
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
