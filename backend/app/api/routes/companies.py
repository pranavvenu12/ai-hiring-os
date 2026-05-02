"""
AI Hiring OS — Company Routes

Endpoints:
  GET  /companies  → list all companies
  POST /companies  → create a new company (tenant)
  GET  /companies/{id} → get company details
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.schemas.company import CompanyCreate, CompanyOut
from app.services import company_service

router = APIRouter(prefix="/companies", tags=["Companies"])


# ── GET /companies ───────────────────────────────────────────────


@router.get("", response_model=list[CompanyOut])
async def list_companies(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """
    List companies.

    Only **Admin** users can view all companies.
    Other roles see only their own company.
    """
    if Role(current_user.role) == Role.ADMIN:
        return await company_service.list_companies(db, skip=skip, limit=limit)

    # Non-admin: return only their own company
    company = await company_service.get_company_by_id(db, current_user.company_id)
    return [company] if company else []


# ── POST /companies ──────────────────────────────────────────────


@router.post(
    "",
    response_model=CompanyOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
async def create_company(
    payload: CompanyCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new company (tenant).

    Only **Admin** users may create companies.
    """
    company = await company_service.create_company(db, payload)
    return company


# ── GET /companies/{company_id} ──────────────────────────────────


@router.get("/{company_id}", response_model=CompanyOut)
async def get_company(
    company_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get a single company's details.

    Non-admin users can only view their own company.
    """
    if Role(current_user.role) != Role.ADMIN and company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own company.",
        )

    company = await company_service.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found.",
        )
    return company
