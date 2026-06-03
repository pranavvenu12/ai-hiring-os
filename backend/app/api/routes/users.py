"""
AI Hiring OS — User Routes

Endpoints:
  GET  /me     → current authenticated user
  GET  /users  → list users (admin: all tenants; others: own company only)
  POST /users  → create a user inside a company
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.schemas.user import UserCreate, UserOut
from app.services import user_service

router = APIRouter(tags=["Users"])


# ── GET /me ──────────────────────────────────────────────────────


@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser):
    """Return the authenticated user's profile."""
    return current_user


# ── GET /users ───────────────────────────────────────────────────


@router.get("/users", response_model=list[UserOut])
async def list_users(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """
    List users.

    • **Admin** → sees users across ALL tenants.
    • **Others** → sees only users within their own company.
    """
    if Role(current_user.role) == Role.ADMIN:
        return await user_service.list_all_users(db, skip=skip, limit=limit)

    return await user_service.list_users_by_company(
        db, current_user.company_id, skip=skip, limit=limit
    )


# ── POST /users ──────────────────────────────────────────────────


@router.post(
    "/users",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def create_user(
    payload: UserCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new user inside a company.

    Only **Admin** and **HR** roles may call this endpoint.
    Non-admin users can only create users within their own company.
    """
    # Tenant isolation: non-admins can only add to their own company
    if Role(current_user.role) != Role.ADMIN and payload.company_id != current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create users within your own company.",
        )

    # Check for duplicate email
    existing = await user_service.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{payload.email}' already exists.",
        )

    user = await user_service.create_user(db, payload)
    return user


from pydantic import BaseModel
from typing import Dict, Any

class AskAIRequest(BaseModel):
    question: str
    role: str
    context: Dict[str, Any]


@router.post("/ask-ai")
async def ask_ai(
    payload: AskAIRequest,
    current_user: CurrentUser,
):
    """Real AI dashboard search endpoint matching Gemini/Groq LLM processing."""
    from app.services import ai_service
    return await ai_service.query_dashboard_ai(
        question=payload.question,
        role=payload.role,
        context=payload.context,
    )
