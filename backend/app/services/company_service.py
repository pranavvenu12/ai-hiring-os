"""
AI Hiring OS — Company Service

Business logic for company (tenant) operations.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.schemas.company import CompanyCreate


async def get_company_by_id(db: AsyncSession, company_id: uuid.UUID) -> Company | None:
    """Fetch a company by primary key."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    return result.scalar_one_or_none()


async def list_companies(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
) -> list[Company]:
    """Return all companies."""
    result = await db.execute(
        select(Company).offset(skip).limit(limit).order_by(Company.created_at.desc())
    )
    return list(result.scalars().all())


async def create_company(db: AsyncSession, payload: CompanyCreate) -> Company:
    """Create a new company (tenant)."""
    company = Company(name=payload.name)
    db.add(company)
    await db.flush()
    await db.refresh(company)
    return company
