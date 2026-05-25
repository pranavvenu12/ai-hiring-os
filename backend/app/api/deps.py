"""
AI Hiring OS — API Dependencies

FastAPI dependency-injection helpers for:
  • Extracting + verifying JWT from Authorization header
  • Resolving the current User from the database
  • Role-based access control (RBAC) guards
"""

from __future__ import annotations

from typing import Annotated, Sequence

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.supabase_auth import verify_jwt
from app.core.security import ROLE_HIERARCHY, Role
from app.db.session import get_db
from app.models.user import User
from app.services import user_service

# ── Bearer token extractor ───────────────────────────────────────

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Verify the JWT, look up the corresponding application user, and return it.

    Raises 401 if the token is missing, invalid or the user is not found in the DB.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        token_data = verify_jwt(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await user_service.get_user_by_supabase_uid(db, token_data.sub)
    if user is None and token_data.email:
        # Fallback 1: Find by email and sync UID
        user = await user_service.get_user_by_email(db, token_data.email)
        if user:
            user = await user_service.sync_supabase_uid(db, user, token_data.sub)
        else:
            # Fallback 2: Auto-provision new workspace and user profile on first OAuth sign-in
            try:
                from app.services import company_service
                from app.schemas.company import CompanyCreate
                from app.schemas.user import UserCreate
                
                # 1. Create a default company for them
                display_name = token_data.email.split('@')[0].capitalize()
                company = await company_service.create_company(
                    db, CompanyCreate(name=f"{display_name}'s Workspace")
                )
                
                # 2. Create the user as HR / Admin of their own company
                user = await user_service.create_user(
                    db,
                    UserCreate(
                        email=token_data.email,
                        name=display_name,
                        role=Role.HR, # Default role for new sign-ups
                        company_id=company.id,
                    ),
                    supabase_uid=token_data.sub,
                )
                await db.commit()
            except Exception as e:
                # If auto-provisioning fails, raise the original 401
                pass

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found in the system. Please complete registration.",
        )
    return user


# Type alias for convenience
CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Role-based access control ───────────────────────────────────


def require_roles(*allowed_roles: Role):
    """
    Return a dependency that permits only users whose role is in *allowed_roles*.

    Usage::

        @router.get("/admin-only", dependencies=[Depends(require_roles(Role.ADMIN))])
        async def admin_endpoint(): ...
    """

    async def _guard(user: CurrentUser) -> User:
        user_role = Role(user.role)
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role.value}' is not authorised for this resource. "
                       f"Required: {[r.value for r in allowed_roles]}",
            )
        return user

    return _guard


def require_min_role(min_role: Role):
    """
    Return a dependency that permits users at or above *min_role* in the hierarchy.

    Usage::

        @router.get("/hr-plus", dependencies=[Depends(require_min_role(Role.HR))])
        async def hr_endpoint(): ...
    """

    min_level = ROLE_HIERARCHY[min_role]

    async def _guard(user: CurrentUser) -> User:
        user_role = Role(user.role)
        if ROLE_HIERARCHY.get(user_role, 0) < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient privileges. Minimum role required: {min_role.value}",
            )
        return user

    return _guard
