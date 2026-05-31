"""
AI Hiring OS — Performance Routes

Review submission and analytics endpoints with RBAC.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.schemas.performance import PerformanceCreate
from app.services import employee_service, performance_service

router = APIRouter(prefix="/performance", tags=["Performance"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: PerformanceCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Submit a performance review for a team member.

    Allowed roles: MANAGER, HR, ADMIN
    """
    user_role = Role(current_user.role)
    if user_role == Role.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Employees cannot submit reviews.")

    # Resolve reviewer's employee record
    reviewer_emp = await employee_service.get_employee_by_user_id(
        db, current_user.id, current_user.company_id,
    )
    if not reviewer_emp:
        raise HTTPException(
            status_code=404, detail="No employee profile found for reviewer.",
        )

    # Verify employee being reviewed exists and belongs to same company
    target_emp = await employee_service.get_employee_by_id(db, payload.employee_id)
    if not target_emp or target_emp.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Employee not found.")

    # Manager can only review their direct reports
    if user_role == Role.MANAGER:
        if target_emp.manager_id != reviewer_emp.id:
            raise HTTPException(
                status_code=403,
                detail="Managers can only review their direct reports.",
            )

    review = await performance_service.create_review(
        db, payload, reviewer_emp.id, current_user.company_id,
    )
    return {
        "message": "Performance review submitted successfully.",
        "review_id": str(review.id),
        "rating": review.rating,
    }


@router.get("/me")
async def get_my_performance(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get performance reviews for the current user."""
    emp = await employee_service.get_employee_by_user_id(
        db, current_user.id, current_user.company_id,
    )
    if not emp:
        return {"reviews": [], "avg_rating": 0}

    reviews = await performance_service.get_my_reviews(db, emp.id)
    avg_rating = 0.0
    if reviews:
        avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 2)

    return {"reviews": reviews, "avg_rating": avg_rating}


@router.get("/team")
async def get_team_performance(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get performance reviews for the manager's team.

    Allowed roles: MANAGER, HR, ADMIN
    """
    user_role = Role(current_user.role)
    if user_role == Role.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Insufficient privileges.")

    emp = await employee_service.get_employee_by_user_id(
        db, current_user.id, current_user.company_id,
    )
    if not emp:
        return {"reviews": []}

    reviews = await performance_service.get_team_reviews(
        db, emp.id, current_user.company_id,
    )
    return {"reviews": reviews}


@router.get(
    "/company",
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def get_company_performance(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get company-wide performance analytics.

    Allowed roles: ADMIN, HR
    """
    return await performance_service.get_company_performance(
        db, current_user.company_id,
    )
