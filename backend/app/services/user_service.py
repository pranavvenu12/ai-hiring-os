"""
AI Hiring OS — User Service

Business logic for user CRUD operations with multi-tenant isolation.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate


async def get_user_by_supabase_uid(db: AsyncSession, supabase_uid: str) -> User | None:
    """Fetch a user by their Supabase Auth UID."""
    result = await db.execute(select(User).where(User.supabase_uid == supabase_uid))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Fetch a user by email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Fetch a user by primary key."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def list_users_by_company(
    db: AsyncSession,
    company_id: uuid.UUID,
    *,
    skip: int = 0,
    limit: int = 100,
) -> list[User]:
    """Return users scoped to a specific company (tenant isolation)."""
    result = await db.execute(
        select(User)
        .where(User.company_id == company_id)
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    return list(result.scalars().all())


async def list_all_users(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 100,
) -> list[User]:
    """Return all users across tenants (admin-only operation)."""
    result = await db.execute(
        select(User).offset(skip).limit(limit).order_by(User.created_at.desc())
    )
    return list(result.scalars().all())


async def create_user(
    db: AsyncSession,
    payload: UserCreate,
    supabase_uid: str | None = None,
) -> User:
    """
    Create a new user in the database.
    
    If supabase_uid is missing, the user is marked as inactive (invited).
    """
    user = User(
        email=payload.email,
        name=payload.name,
        role=payload.role.value,
        company_id=payload.company_id,
        supabase_uid=supabase_uid,
        is_active=supabase_uid is not None,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def sync_supabase_uid(db: AsyncSession, user: User, supabase_uid: str) -> User:
    """Link a Supabase UID to a local user and activate them."""
    if user.supabase_uid != supabase_uid:
        user.supabase_uid = supabase_uid
        user.is_active = True
        await db.commit()
        await db.refresh(user)
    return user
