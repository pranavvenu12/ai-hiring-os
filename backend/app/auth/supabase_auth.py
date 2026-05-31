"""
AI Hiring OS — Supabase Auth Integration

Handles:
  • JWT token verification against Supabase JWT secret
  • Email/password sign-in / sign-up via Supabase REST API
"""

from __future__ import annotations

from jose import JWTError, jwt
from supabase import Client, create_client

from app.core.config import get_settings
from app.schemas.auth import TokenPayload

settings = get_settings()

# ── Supabase client (service-role for admin ops) ─────────────────

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a cached Supabase client with service-role credentials."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _supabase_client


# ── JWT verification ─────────────────────────────────────────────


def verify_jwt(token: str) -> TokenPayload:
    """
    Verify a Supabase-issued JWT by calling get_user() on the Supabase client.

    Raises ``JWTError`` if the token is invalid or expired.
    """
    client = get_supabase_client()
    try:
        # supabase.auth.get_user(token) validates the token and returns the user
        response = client.auth.get_user(token)
        if not response or not response.user:
            raise JWTError("Invalid token: No user found")
            
        user = response.user
        return TokenPayload(
            sub=user.id,
            email=user.email,
        )
    except Exception as exc:
        # Wrap any exception as JWTError for consistency with the rest of the app
        raise JWTError(str(exc))


# ── Auth helpers ─────────────────────────────────────────────────


def sign_up_with_email(email: str, password: str) -> dict:
    """Register a new user via Supabase Auth and auto-confirm."""
    client = get_supabase_client()
    response = client.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True
    })
    return {"user": response.user, "session": None}  # admin.create_user doesn't return a session


def sign_in_with_email(email: str, password: str) -> dict:
    """Sign in an existing user with email + password."""
    client = get_supabase_client()
    response = client.auth.sign_in_with_password(
        {"email": email, "password": password}
    )
    return {
        "access_token": response.session.access_token,
        "refresh_token": response.session.refresh_token,
        "user": response.user,
    }

