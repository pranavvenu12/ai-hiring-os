"""
AI Hiring OS — Company Service

Business logic for company (tenant) operations.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.company import Company
from app.models.company_profile import CompanyProfile
from app.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate


def serialize_company(company: Company | None) -> CompanyOut | None:
    """Flatten a company plus optional profile into the public response shape."""
    if company is None:
        return None

    profile = getattr(company, "profile", None)
    return CompanyOut(
        id=company.id,
        name=company.name,
        created_at=company.created_at,
        industry=getattr(profile, "industry", None),
        website=getattr(profile, "website", None),
        location=getattr(profile, "location", None),
        employee_count_range=getattr(profile, "employee_count_range", None),
        contact_email=getattr(profile, "contact_email", None),
        description=getattr(profile, "description", None),
    )


async def get_company_by_id(db: AsyncSession, company_id: uuid.UUID) -> Company | None:
    """Fetch a company by primary key."""
    result = await db.execute(
        select(Company)
        .options(selectinload(Company.profile))
        .where(Company.id == company_id)
    )
    return result.scalar_one_or_none()


async def get_company_by_name(db: AsyncSession, name: str) -> Company | None:
    """Fetch a company by name (case-insensitive).

    Older signup flows could create duplicate tenant rows with the same visible
    company name. Prefer a populated company profile and return one stable match
    instead of crashing employee/manager signup with MultipleResultsFound.
    """
    result = await db.execute(
        select(Company)
        .options(selectinload(Company.profile))
        .outerjoin(CompanyProfile, CompanyProfile.company_id == Company.id)
        .where(func.lower(Company.name) == func.lower(name))
        .order_by(
            CompanyProfile.company_id.isnot(None).desc(),
            Company.created_at.asc(),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def list_companies(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
) -> list[Company]:
    """Return all companies."""
    result = await db.execute(
        select(Company)
        .options(selectinload(Company.profile))
        .offset(skip)
        .limit(limit)
        .order_by(Company.created_at.desc())
    )
    return list(result.scalars().all())


async def create_company(db: AsyncSession, payload: CompanyCreate) -> Company:
    """Create a new company (tenant)."""
    company = Company(name=payload.name)
    db.add(company)
    await db.flush()
    await db.refresh(company)
    return company


async def update_company_details(
    db: AsyncSession,
    company_id: uuid.UUID,
    payload: CompanyUpdate,
) -> Company | None:
    """Update the company row and its optional profile details."""
    company = await get_company_by_id(db, company_id)
    if company is None:
        return None

    if payload.name is not None:
        company.name = payload.name

    profile_fields = {
        "industry": payload.industry,
        "website": payload.website,
        "location": payload.location,
        "employee_count_range": payload.employee_count_range,
        "contact_email": payload.contact_email,
        "description": payload.description,
    }

    if any(value is not None for value in profile_fields.values()):
        profile = company.profile
        if profile is None:
            profile = CompanyProfile(company_id=company.id)
            db.add(profile)

        for field_name, field_value in profile_fields.items():
            if field_value is not None:
                setattr(profile, field_name, field_value)

    await db.commit()
    refreshed = await get_company_by_id(db, company_id)
    return refreshed
