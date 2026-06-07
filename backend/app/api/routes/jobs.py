"""
AI Hiring OS — Job Routes
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, List

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select

from app.api.deps import CurrentUser, require_roles
from app.core.config import get_settings
from app.core.security import Role
from app.db.session import AsyncSessionLocal, get_db
from app.models.company import Company
from app.models.job import Job
from app.schemas.job import JobCreate, JobOut, PublicJobOut
from app.schemas.candidate import CandidateOut
from app.services import (
    email_service,
    extraction_service,
    job_service,
    resume_service,
    realtime_service,
    storage_service,
    evaluation_service,
)

router = APIRouter(prefix="/jobs", tags=["Jobs"])
settings = get_settings()


def _public_job_out(job: Job, company_name: str) -> PublicJobOut:
    return PublicJobOut(
        id=job.id,
        title=job.title,
        description=job.description,
        company_id=job.company_id,
        company_name=company_name,
        created_at=job.created_at,
        department=job.department,
        location=job.location,
        employment_type=job.employment_type,
        salary_range=job.salary_range,
        open_until=job.open_until,
    )


@router.post(
    "",
    response_model=JobOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR, Role.MANAGER))],
)
async def create_job(
    payload: JobCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new job posting.
    
    Allowed roles: ADMIN, HR, MANAGER
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


@router.get("/public", response_model=List[PublicJobOut])
async def list_public_jobs(
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(None, max_length=120),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List public job postings for the candidate careers portal."""
    query = (
        select(Job, Company.name)
        .join(Company, Job.company_id == Company.id)
        .where(
            Job.status == "open",
            or_(Job.open_until.is_(None), Job.open_until >= datetime.now(timezone.utc)),
        )
        .order_by(Job.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if search:
        query = query.where(Job.title.ilike(f"%{search.strip()}%"))

    result = await db.execute(query)
    return [_public_job_out(job, company_name) for job, company_name in result.all()]


@router.get("/public/{job_id}", response_model=PublicJobOut)
async def get_public_job(
    job_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Fetch one public job posting for candidates."""
    result = await db.execute(
        select(Job, Company.name)
        .join(Company, Job.company_id == Company.id)
        .where(
            Job.id == job_id,
            Job.status == "open",
            or_(Job.open_until.is_(None), Job.open_until >= datetime.now(timezone.utc)),
        )
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    job, company_name = row
    return _public_job_out(job, company_name)


@router.post("/public/{job_id}/apply", status_code=status.HTTP_202_ACCEPTED)
async def apply_to_public_job(
    job_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    name: str = Form(..., min_length=1, max_length=255),
    email: str = Form(..., min_length=3, max_length=320),
    phone: str = Form(..., min_length=6, max_length=40),
    resume: UploadFile = File(...),
    linkedin_url: str | None = Form(default=None, max_length=512),
    portfolio_url: str | None = Form(default=None, max_length=512),
):
    """
    Public candidate application flow.

    The uploaded resume reuses the existing storage, extraction, and AI scoring
    pipeline so the candidate appears automatically in recruiter dashboards.
    """
    job = await job_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    if job.status != "open" or (job.open_until is not None and job.open_until < datetime.now(timezone.utc)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This job is not open for applications.",
        )

    if not resume.filename or not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a PDF resume.",
        )

    content = await resume.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume file is empty.",
        )

    file_url = await storage_service.upload_resume(content, resume.filename, job.company_id)
    resume_row = await resume_service.create_resume(db, job_id, name.strip(), file_url, email=email.strip(), phone=phone.strip())
    await realtime_service.publish_event(job.company_id, "resume.uploaded", {
        "resume_id": str(resume_row.id),
        "job_id": str(job.id),
        "candidate_name": resume_row.candidate_name,
        "source": "public_apply",
    })

    candidate_metadata = {
        "name": name.strip(),
        "email": email.strip(),
        "phone": phone.strip(),
        "linkedin_url": (linkedin_url or "").strip(),
        "portfolio_url": (portfolio_url or "").strip(),
    }
    background_tasks.add_task(_process_resume_extraction, resume_row.id, content, candidate_metadata)

    return {
        "message": "Application received. Resume extraction and AI evaluation have started.",
        "candidate_id": str(resume_row.id),
        "job_id": str(job.id),
    }


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
        await realtime_service.publish_event(current_user.company_id, "resume.uploaded", {
            "resume_id": str(resume.id),
            "job_id": str(job_id),
            "candidate_name": resume.candidate_name,
            "source": "bulk_upload",
        })

        # 3. Schedule background text extraction
        background_tasks.add_task(_process_resume_extraction, resume.id, content)

        uploaded_resumes.append({"id": resume.id, "filename": file.filename})

    return {
        "message": f"Successfully received {len(uploaded_resumes)} resumes for processing.",
        "resumes": uploaded_resumes,
    }


async def _process_resume_extraction(
    resume_id: uuid.UUID,
    content: bytes,
    candidate_metadata: dict | None = None,
):
    """Background worker to extract text and update the database."""
    try:
        text = await extraction_service.extract_text_from_pdf(content)
        if candidate_metadata:
            profile_lines = [
                "Candidate Application Metadata:",
                f"Name: {candidate_metadata.get('name', '')}",
                f"Email: {candidate_metadata.get('email', '')}",
                f"Phone: {candidate_metadata.get('phone', '')}",
            ]
            if candidate_metadata.get("linkedin_url"):
                profile_lines.append(f"LinkedIn: {candidate_metadata['linkedin_url']}")
            if candidate_metadata.get("portfolio_url"):
                profile_lines.append(f"Portfolio: {candidate_metadata['portfolio_url']}")
            text = "\n".join(profile_lines) + "\n\nResume Content:\n" + text

        async with AsyncSessionLocal() as db:
            resume = await resume_service.update_resume_text(db, resume_id, text)
            job = await job_service.get_job_by_id(db, resume.job_id) if resume else None
            company_id = job.company_id if job else None
            job_id = resume.job_id if resume else None
            candidate_name = resume.candidate_name if resume else None
            if company_id:
                await realtime_service.publish_event(company_id, "resume.processed", {
                    "resume_id": str(resume_id),
                    "job_id": str(job_id),
                    "candidate_name": candidate_name,
                })
        
        # Phase 3: Trigger full AI evaluation
        await evaluation_service.run_full_evaluation(resume_id)
    except Exception as exc:
        print(f"Failed to extract text for resume {resume_id}: {exc}")


@router.get("/{job_id}/candidates", response_model=List[CandidateOut])
async def list_job_candidates(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks,
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

    candidates = await resume_service.list_candidates_with_scores(db, job_id)

    # Automatically recover any stuck pending/processing evaluations
    from datetime import datetime, timezone
    from app.services.evaluation_service import evaluate_stuck_candidate_background

    now = datetime.now(timezone.utc)
    for cand in candidates:
        if cand["status"] in ("pending", "processing"):
            created_at = cand["created_at"]
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if (now - created_at).total_seconds() > 15:
                background_tasks.add_task(evaluate_stuck_candidate_background, cand["resume_id"])

    return candidates


@router.post(
    "/candidates/{resume_id}/shortlist",
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR, Role.MANAGER))],
)
async def shortlist_candidate(
    resume_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Shortlist a candidate and automatically initialize their AI Interview session if not already done.
    
    Allowed roles: ADMIN, HR, MANAGER
    """
    from app.models.resume import Resume
    # Fetch candidate (resume)
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    # Check job ownership
    job = await job_service.get_job_by_id(db, resume.job_id)
    if not job or job.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Job not found in your organization.")

    # Update candidate hiring status to shortlisted
    resume.hiring_status = "shortlisted"
    await db.commit()
    await db.refresh(resume)

    # Check if an InterviewSession already exists for this resume
    from app.models.interview import InterviewSession
    session_result = await db.execute(
        select(InterviewSession).where(InterviewSession.candidate_id == resume_id)
    )
    session = session_result.scalar_one_or_none()

    if not session:
        # Generate interview session automatically
        from app.services import interview_service
        session = await interview_service.start_interview(
            db,
            candidate_id=resume.id,
            job_id=job.id,
            company_id=current_user.company_id,
            interview_type="technical",
        )
        # Notify recruiters via realtime
        await realtime_service.publish_event(current_user.company_id, "interview.started", {
            "session_id": str(session.id),
            "candidate_id": str(resume.id),
            "job_id": str(job.id),
        })

    interview_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/public-interview/{session.id}"
    email_status = await email_service.send_interview_invite(
        to_email=resume.email,
        candidate_name=resume.candidate_name,
        job_title=job.title,
        interview_url=interview_url,
    )

    # Return info
    return {
        "message": "Candidate shortlisted and AI Interview session initialized.",
        "hiring_status": resume.hiring_status,
        "session_id": str(session.id),
        "candidate_name": resume.candidate_name,
        "email": resume.email,
        "interview_url": interview_url,
        "email_status": email_status,
    }


@router.patch(
    "/{job_id}/status",
    response_model=JobOut,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR, Role.MANAGER))],
)
async def update_job_status(
    job_id: uuid.UUID,
    status_value: str,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update a job's status (e.g. close it).
    
    Allowed roles: ADMIN, HR, MANAGER
    """
    job = await job_service.get_job_by_id(db, job_id)
    if not job or job.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found in your organisation.",
        )
        
    if status_value not in ("open", "closed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either 'open' or 'closed'.",
        )
        
    job.status = status_value
    await db.commit()
    await db.refresh(job)
    return job
