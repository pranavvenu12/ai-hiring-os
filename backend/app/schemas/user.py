"""
AI Hiring OS — User Schemas

Pydantic models for user-related request / response payloads.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.core.security import Role


# ── Responses ────────────────────────────────────────────────────


class UserOut(BaseModel):
    """Public representation of a user."""

    id: uuid.UUID
    email: EmailStr
    name: str
    role: Role
    company_id: uuid.UUID
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    """Minimal user info (e.g. for lists)."""

    id: uuid.UUID
    email: EmailStr
    name: str
    role: Role

    model_config = {"from_attributes": True}


# ── Requests ─────────────────────────────────────────────────────


class UserCreate(BaseModel):
    """Payload to register a new user inside a company."""

    email: EmailStr
    name: str
    role: Role = Role.EMPLOYEE
    company_id: uuid.UUID


class UserUpdate(BaseModel):
    """Payload for partial user update."""

    name: str | None = None
    role: Role | None = None
