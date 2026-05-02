"""
AI Hiring OS — Job Routes
"""

from __future__ import annotations

import uuid
from typing import Annotated, List

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import AsyncSessionLocal, get_db
from app.schemas.job import JobCreate, JobOut
from app.schemas.candidate import CandidateOut
from app.services import (
    extraction_service,
    job_service,
    resume_service,
    storage_service,
    evaluation_service,
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post(
    "",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def create_job(
    payload: JobCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new job posting.
    
    Allowed roles: ADMIN, HR
    """
    return await job_service.create_job(
        db, payload, current_user.company_id, current_user.id
    )


@router.get("", response_model=List[JobOut])
async def list_jobs(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """
    List all jobs for the current tenant company.
    
    Allowed roles: ADMIN, HR, MANAGER
    """
    # Manager, HR, and Admin can view. Employee cannot.
    if Role(current_user.role) == Role.EMPLOYEE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges.",
        )

    return await job_service.list_jobs_by_company(
        db, current_user.company_id, skip=skip, limit=limit
    )


@router.post(
    "/{job_id}/upload-resumes",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def upload_resumes(
    job_id: uuid.UUID,
    files: List[UploadFile],
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks,
):
    """
    Upload multiple PDF resumes for a specific job.
    
    Allowed roles: ADMIN, HR
    """
    # Tenant enforcement: ensure job exists and belongs to the user's company
    job = await job_service.get_job_by_id(db, job_id)
    if not job or job.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found in your organisation.",
        )

    uploaded_resumes = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue

        content = await file.read()
        
        # 1. Upload to Supabase Storage
        file_url = await storage_service.upload_resume(
            content, file.filename, current_user.company_id
        )

        # 2. Store metadata in DB
        resume = await resume_service.create_resume(
            db, job_id, file.filename, file_url
        )

        # 3. Schedule background text extraction
        background_tasks.add_task(_process_resume_extraction, resume.id, content)

        uploaded_resumes.append({"id": resume.id, "filename": file.filename})

    return {
        "message": f"Successfully received {len(uploaded_resumes)} resumes for processing.",
        "resumes": uploaded_resumes,
    }


async def _process_resume_extraction(resume_id: uuid.UUID, content: bytes):
    """Background worker to extract text and update the database."""
    try:
        text = await extraction_service.extract_text_from_pdf(content)
        async with AsyncSessionLocal() as db:
            await resume_service.update_resume_text(db, resume_id, text)
        
        # Phase 3: Trigger full AI evaluation
        await evaluation_service.run_full_evaluation(resume_id)
    except Exception as exc:
        print(f"Failed to extract text for resume {resume_id}: {exc}")


@router.get("/{job_id}/candidates", response_model=List[CandidateOut])
async def list_job_candidates(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    List all candidates (resumes) for a job with their AI scores and insights.
    
    Allowed roles: ADMIN, HR, MANAGER
    """
    # Tenant enforcement
    job = await job_service.get_job_by_id(db, job_id)
    if not job or job.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found in your organisation.",
        )

    # RBAC: Manager, HR, and Admin can view.
    if Role(current_user.role) == Role.EMPLOYEE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges.",
        )

    return await resume_service.list_candidates_with_scores(db, job_id)
