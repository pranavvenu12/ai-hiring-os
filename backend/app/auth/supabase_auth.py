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
_anon_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a cached Supabase client with service-role credentials."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _supabase_client


def get_anon_client() -> Client:
    """Return a cached Supabase client with the anon (public) key.

    Used for user-facing auth operations (sign_up, sign_in) that must go
    through the standard Supabase Auth flow, not the admin API.
    """
    global _anon_client
    if _anon_client is None:
        _anon_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY,
        )
    return _anon_client


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
    """Register a new user via the standard Supabase Auth sign-up flow.

    Uses the anon-key client so the request goes through the normal Auth API
    (works on all Supabase plans). The service-role admin.create_user() path
    requires special plan permissions and returns "User not allowed" on free
    plans, which is why we avoid it here.

    After sign-up, the service-role client is used to auto-confirm the email
    so users can log in immediately without clicking a confirmation link.
    """
    anon = get_anon_client()
    admin = get_supabase_client()
    try:
        response = anon.auth.sign_up({
            "email": email,
            "password": password,
        })
        if not response.user:
            raise RuntimeError("Supabase sign-up returned no user.")

        # Auto-confirm the email so the user can log in immediately
        try:
            admin.auth.admin.update_user_by_id(
                str(response.user.id),
                {"email_confirm": True},
            )
        except Exception:
            # Non-fatal: user can still confirm via email link if this fails
            pass

        return {"user": response.user, "session": response.session}
    except Exception as exc:
        raise


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
