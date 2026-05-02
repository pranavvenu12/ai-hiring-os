"""
AI Hiring OS — Auth Schemas

Pydantic models for authentication payloads.
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr


class TokenPayload(BaseModel):
    """Decoded JWT token payload."""

    sub: str  # Supabase user UID
    email: str | None = None
    exp: int | None = None


class LoginRequest(BaseModel):
    """Email + password login payload."""

    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Wrapper returned to client after successful auth."""

    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
