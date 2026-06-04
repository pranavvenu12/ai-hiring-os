"""Recruiter Copilot Agent routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.schemas.agent import AgentAskRequest, AgentAskResponse
from app.services import agent_service

router = APIRouter(prefix="/agent", tags=["Agentic AI"])


@router.post(
    "/ask",
    response_model=AgentAskResponse,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR, Role.MANAGER))],
)
async def ask_recruiter_copilot(
    payload: AgentAskRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Ask the read-only recruiter copilot to inspect hiring/HR tools and recommend next steps."""
    return await agent_service.ask_agent(db, current_user, payload.message)
