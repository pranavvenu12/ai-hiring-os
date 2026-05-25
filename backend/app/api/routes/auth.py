"""
AI Hiring OS — Auth Routes

Endpoints for email/password login, registration, and Google OAuth.
"""

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.supabase_auth import (
    get_google_oauth_url,
    sign_in_with_email,
    sign_up_with_email,
    verify_jwt,
)
from pydantic import BaseModel, EmailStr
from app.core.security import Role
from app.db.session import get_db
from app.schemas.auth import AuthResponse
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

class GoogleSignupRequest(BaseModel):
    """Extra onboarding details for Google sign-up."""
    role: Role
    company_name: str
    name: str | None = None


class GoogleSignupResponse(BaseModel):
    """Response returned after Google onboarding completes."""

    message: str
    user_id: str
    company_id: str
    redirect_to: str
    onboarding_complete: bool = True


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


def _get_supabase_user_by_email(client, email: str):
    """Return the Supabase auth user for an email if it exists."""
    sb_users = client.auth.admin.list_users()
    return next((u for u in sb_users if u.email == email), None)


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

    # 1. Supabase Register or re-link existing account
    try:
        sb_result = sign_up_with_email(payload.email, payload.password)
        supabase_uid = str(sb_result["user"].id)
    except Exception as exc:
        if "already" in str(exc).lower():
            from app.auth.supabase_auth import get_supabase_client
            client = get_supabase_client()
            matching_user = _get_supabase_user_by_email(client, payload.email)
            if matching_user:
                supabase_uid = str(matching_user.id)
                client.auth.admin.update_user_by_id(
                    supabase_uid,
                    attributes={
                        "password": payload.password,
                        "email_confirm": True,
                    },
                )
            else:
                raise HTTPException(status_code=400, detail=f"Supabase error: {exc}")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Supabase registration failed: {exc}",
            )

    # 2. Create or reuse company
    from app.services import company_service
    from app.schemas.company import CompanyCreate

    if existing_user:
        company = await company_service.get_company_by_id(db, existing_user.company_id)
        if company and payload.company_name and company.name != payload.company_name:
            company.name = payload.company_name
            await db.flush()
    else:
        company = await company_service.create_company(
            db, CompanyCreate(name=payload.company_name or f"{payload.name}'s Org")
        )

    if company is None and existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated company not found for existing account.",
        )

    # 3. Create or update user
    from app.schemas.user import UserCreate

    if existing_user:
        existing_user.name = payload.name
        existing_user.role = payload.role.value
        if company:
            existing_user.company_id = company.id
        existing_user.supabase_uid = supabase_uid
        existing_user.is_active = True
        user = existing_user
        await db.flush()
    else:
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


@router.post("/signup-google", response_model=GoogleSignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_google(
    payload: GoogleSignupRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
):
    """
    Onboard a user authenticated via Google OAuth:
    1. Verify the Supabase JWT.
    2. Extract email/UID.
    3. Create Company and local User record.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    try:
        token_data = verify_jwt(credentials.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}"
        )

    # Check if user already exists
    existing_user = await user_service.get_user_by_email(db, token_data.email)
    if existing_user:
        if existing_user.supabase_uid and existing_user.supabase_uid != token_data.sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already registered.",
            )

        if not existing_user.supabase_uid:
            existing_user.supabase_uid = token_data.sub
            existing_user.is_active = True
            await db.flush()

    # 1. Create Company
    from app.services import company_service
    from app.schemas.company import CompanyCreate

    if existing_user:
        company = await company_service.get_company_by_id(db, existing_user.company_id)
        if company and payload.company_name and company.name != payload.company_name:
            company.name = payload.company_name
            await db.flush()
    else:
        company = await company_service.create_company(
            db, CompanyCreate(name=payload.company_name)
        )

    if company is None and existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated company not found for existing account.",
        )

    # 2. Extract Name from token or fallback
    name = payload.name or token_data.email.split('@')[0].capitalize()

    # 3. Create User
    from app.schemas.user import UserCreate

    if existing_user:
        existing_user.name = name
        existing_user.role = payload.role.value
        if company:
            existing_user.company_id = company.id
        existing_user.supabase_uid = token_data.sub
        existing_user.is_active = True
        user = existing_user
        await db.flush()
    else:
        user = await user_service.create_user(
            db,
            UserCreate(
                email=token_data.email,
                name=name,
                role=payload.role,
                company_id=company.id,
            ),
            supabase_uid=token_data.sub,
        )
    
    await db.commit()

    return GoogleSignupResponse(
        message="Google signup onboarding successful.",
        user_id=str(user.id),
        company_id=str(company.id),
        redirect_to=f"/dashboard/{user.role.lower()}",
    )
