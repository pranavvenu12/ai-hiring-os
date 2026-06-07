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
    sign_in_with_email,
    sign_up_with_email,
    verify_jwt,
)
from pydantic import BaseModel, field_validator
from app.core.security import Role
from app.db.session import get_db
from app.schemas.auth import AuthResponse
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    """Email + password login payload."""

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return _validate_basic_email(value)


class SignupRequest(BaseModel):
    """Payload for public onboarding."""

    name: str
    email: str
    password: str
    role: Role
    company_name: str | None = None
    designation: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return _validate_basic_email(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value or "") < 6:
            raise ValueError("Password must be at least 6 characters.")
        return value


def _validate_basic_email(value: str) -> str:
    email = (value or "").strip().lower()
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise ValueError("Enter a valid email address.")
    return email


def _get_supabase_user_by_email(client, email: str):
    """Return the Supabase auth user for an email if it exists."""
    sb_users = client.auth.admin.list_users()
    return next((u for u in sb_users if (u.email or "").lower() == email.lower()), None)


def _company_not_registered_detail(company_name: str) -> str:
    if company_name:
        return f"Company '{company_name}' is not registered. HR must sign up first."
    return "Company not registered. HR must sign up first."


def _clean_signup_error(exc: Exception) -> str:
    err_str = str(exc).lower()
    
    # 1. Rate Limit
    if "rate limit" in err_str or "too many requests" in err_str:
        return "Too many signup attempts. Please try again later."
    
    # 2. Already registered / exists
    if "already" in err_str or "exists" in err_str or "registered" in err_str:
        return "An account with this email already exists."
        
    # 3. Invalid email / format
    if "invalid" in err_str and "email" in err_str:
        return "Please enter a valid email address."
        
    # 4. Weak password
    if "password" in err_str and ("weak" in err_str or "short" in err_str or "characters" in err_str):
        return "Password must be at least 6 characters."
        
    # 5. Service role key / config issues
    if "service_role" in err_str or "not allowed" in err_str or "unauthorized" in err_str:
        return (
            "Signup is blocked because the server is not configured correctly. "
            "Please contact the administrator."
        )

    # Default clean message - strip "Supabase" prefix or mention if any
    clean_msg = str(exc)
    if clean_msg.lower().startswith("supabase"):
        parts = clean_msg.split(":", 1)
        if len(parts) > 1:
            clean_msg = parts[1].strip()
        else:
            clean_msg = clean_msg.replace("Supabase", "Server").replace("supabase", "server")
    else:
        clean_msg = clean_msg.replace("Supabase", "Server").replace("supabase", "server")
            
    return f"Registration failed: {clean_msg}"


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
        err_msg = str(exc).replace("Supabase", "Server").replace("supabase", "server")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {err_msg}",
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
    1. Validate company access.
    2. Register in Supabase.
    3. Create a Company (if it doesn't exist).
    4. Create local User record with Role.
    """
    # 0. Check if user already exists in local DB
    existing_user = await user_service.get_user_by_email(db, payload.email)
    company_name = (payload.company_name or "").strip()
    employee_role = (payload.designation or "").strip() if payload.role.value == "employee" else ""

    # Employees and managers can only join companies that HR/Admin has already
    # registered. Validate this before calling Supabase so the UI gets a clear
    # tenant error instead of a generic auth provider error.
    from app.services import company_service
    from app.schemas.company import CompanyCreate

    company = None
    if not existing_user and payload.role.value not in ["hr", "admin"]:
        company = await company_service.get_company_by_name(db, company_name) if company_name else None
        if not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=_company_not_registered_detail(company_name),
            )

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
                try:
                    supabase_uid = str(matching_user.id)
                    client.auth.admin.update_user_by_id(
                        supabase_uid,
                        attributes={
                            "password": payload.password,
                            "email_confirm": True,
                        },
                    )
                except Exception as update_exc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=_clean_signup_error(update_exc),
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=_clean_signup_error(exc),
                )
        else:
            err_str = str(exc).lower()
            if "service_role" in err_str or "not allowed" in err_str or "unauthorized" in err_str:
                detail = (
                    "Signup is blocked because the backend service is not configured correctly. "
                    "Please contact the administrator."
                )
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=_clean_signup_error(exc),
            )

    # 2. Create or reuse company
    if existing_user:
        company = await company_service.get_company_by_id(db, existing_user.company_id)
        if company and payload.company_name and company.name != payload.company_name:
            company.name = payload.company_name
            await db.flush()
    else:
        # Check if company already exists by name case-insensitively
        if company_name:
            company = await company_service.get_company_by_name(db, company_name)
        
        if not company:
            if payload.role.value not in ["hr", "admin"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=_company_not_registered_detail(company_name),
                )
            company = await company_service.create_company(
                db, CompanyCreate(name=company_name or f"{payload.name}'s Org")
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

    # 4. Check or create employee profile for Managers/Employees
    if payload.role.value in ["manager", "employee"]:
        from datetime import date
        from sqlalchemy import select
        from app.models.employee import Employee
        # Check if HR already pre-created an employee record with this email
        result = await db.execute(
            select(Employee).where(
                Employee.email == payload.email,
                Employee.company_id == company.id
            )
        )
        employee = result.scalar_one_or_none()
        if employee:
            # Link pre-created employee record to this new user account
            employee.user_id = user.id
            if payload.role.value == "employee" and employee_role:
                employee.designation = employee_role
        else:
            # Auto-create employee record so the user profile exists immediately
            from app.services.employee_service import _generate_employee_code
            employee_code = await _generate_employee_code(db, company.id)
            new_emp = Employee(
                company_id=company.id,
                user_id=user.id,
                employee_code=employee_code,
                full_name=payload.name,
                email=payload.email,
                department="Management" if payload.role.value == "manager" else "General",
                designation="Manager" if payload.role.value == "manager" else (employee_role or "Employee"),
                joining_date=date.today(),
                employment_type="full_time"
            )
            db.add(new_emp)
        await db.flush()
    
    await db.commit()

    return {
        "message": "Signup successful.",
        "user_id": str(user.id),
        "company_id": str(company.id),
    }
