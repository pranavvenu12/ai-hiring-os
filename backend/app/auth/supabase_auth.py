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
    """Register or update a Supabase Auth user with backend admin credentials.

    The public Supabase sign-up endpoint can be email-rate-limited during demos.
    The backend service-role client is preferred so registration does not rely on
    confirmation emails. If admin creation is unavailable, this falls back to the
    normal anon signup path.
    """
    admin = get_supabase_client()

    try:
        response = admin.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
        })
        if not response.user:
            raise RuntimeError("Supabase admin create_user returned no user.")
        return {"user": response.user, "session": response.session}
    except Exception as exc:
        err = str(exc).lower()
        if "already" in err or "registered" in err or "exists" in err:
            matching_user = _get_admin_user_by_email(admin, email)
            if matching_user:
                updated = admin.auth.admin.update_user_by_id(
                    str(matching_user.id),
                    {
                        "password": password,
                        "email_confirm": True,
                    },
                )
                return {"user": updated.user or matching_user, "session": None}

        if "not allowed" not in err and "unauthorized" not in err and "service_role" not in err:
            raise

    anon = get_anon_client()
    response = anon.auth.sign_up({
        "email": email,
        "password": password,
    })
    if not response.user:
        raise RuntimeError("Supabase sign-up returned no user.")

    try:
        admin.auth.admin.update_user_by_id(
            str(response.user.id),
            {"email_confirm": True},
        )
    except Exception:
        pass

    return {"user": response.user, "session": response.session}


def _get_admin_user_by_email(client: Client, email: str):
    users = client.auth.admin.list_users()
    return next((user for user in users if (user.email or "").lower() == email.lower()), None)


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
