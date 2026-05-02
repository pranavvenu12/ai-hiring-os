"""
AI Hiring OS — Auth Routes

Endpoints for email/password login, registration, and Google OAuth.
"""

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.supabase_auth import (
    get_google_oauth_url,
    sign_in_with_email,
    sign_up_with_email,
)
from pydantic import BaseModel, EmailStr
from app.core.security import Role
from app.db.session import get_db
from app.schemas.auth import AuthResponse
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    """Email + password login payload."""

    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    """Payload for public onboarding."""

    name: str
    email: EmailStr
    password: str
    role: Role
    company_name: str | None = "My Company"


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Authenticate with email + password via Supabase Auth.

    Returns an access token and refresh token.
    """
    try:
        result = sign_in_with_email(payload.email, payload.password)
        
        # Issue 3: Link Supabase UID to local user if not already set
        supabase_user = result.get("user")
        if supabase_user:
            user = await user_service.get_user_by_email(db, payload.email)
            if user:
                await user_service.sync_supabase_uid(db, user, str(supabase_user.id))

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {exc}",
        )

    return AuthResponse(
        access_token=result["access_token"],
        refresh_token=result.get("refresh_token"),
    )


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Public signup flow:
    1. Register in Supabase.
    2. Create a Company (if it doesn't exist).
    3. Create local User record with Role.
    """
    # 0. Check if user already exists in local DB
    existing_user = await user_service.get_user_by_email(db, payload.email)
    if existing_user and existing_user.supabase_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered.",
        )

    # 1. Supabase Register
    try:
        sb_result = sign_up_with_email(payload.email, payload.password)
        supabase_uid = str(sb_result["user"].id)
    except Exception as exc:
        # If user exists in Supabase but we didn't find them in DB with UID, 
        # it might be a partial registration. We try to continue.
        if "already" in str(exc).lower():
            # Try to get the user from Supabase to get the UID
            from app.auth.supabase_auth import get_supabase_client
            client = get_supabase_client()
            # This is a bit hacky but works for demo: list users and find by email
            # In production, you'd use a more direct method if available
            sb_users = client.auth.admin.list_users()
            matching_user = next((u for u in sb_users if u.email == payload.email), None)
            if matching_user:
                supabase_uid = str(matching_user.id)
                # Confirm email if not already confirmed
                if not matching_user.email_confirmed_at:
                    client.auth.admin.update_user_by_id(supabase_uid, attributes={"email_confirm": True})
            else:
                raise HTTPException(status_code=400, detail=f"Supabase error: {exc}")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supabase registration failed: {exc}",
            )

    # 2. Create Company
    from app.services import company_service
    from app.schemas.company import CompanyCreate
    
    company = await company_service.create_company(
        db, CompanyCreate(name=payload.company_name or f"{payload.name}'s Org")
    )

    # 3. Create User
    from app.schemas.user import UserCreate
    user = await user_service.create_user(
        db,
        UserCreate(
            email=payload.email,
            name=payload.name,
            role=payload.role,
            company_id=company.id,
        ),
        supabase_uid=supabase_uid,
    )
    
    await db.commit()

    return {
        "message": "Signup successful.",
        "user_id": str(user.id),
        "company_id": str(company.id),
    }


@router.get("/google")
async def google_oauth(redirect_to: str = "http://localhost:3000/auth/callback"):
    """
    Return the Google OAuth redirect URL.

    The frontend should navigate the user to this URL.
    """
    try:
        url = get_google_oauth_url(redirect_to)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate OAuth URL: {exc}",
        )

    return {"url": url}
