"""
AI Hiring OS — Attendance Routes

Clock-in/out endpoints and attendance analytics with RBAC.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.services import attendance_service, employee_service

router = APIRouter(prefix="/attendance", tags=["Attendance"])


async def _get_current_employee(current_user, db):
    """Helper to resolve the current user's employee record."""
    emp = await employee_service.get_employee_by_user_id(
        db, current_user.id, current_user.company_id,
    )
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee profile found. Please contact HR to create your employee record.",
        )
    return emp


@router.post("/clock-in")
async def clock_in(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Clock in for today. Only one clock-in per day is allowed.

    Allowed: All authenticated users with employee profiles.
    """
    emp = await _get_current_employee(current_user, db)
    try:
        record = await attendance_service.clock_in(db, emp.id, current_user.company_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {
        "message": "Clocked in successfully.",
        "attendance_id": str(record.id),
        "clock_in": record.clock_in.isoformat(),
    }


@router.post("/clock-out")
async def clock_out(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Clock out for today. Automatically calculates total hours and derives status.

    Status rules:
    - >= 8 hours → Present
    - 4-8 hours → Half Day
    - < 4 hours → Absent
    """
    emp = await _get_current_employee(current_user, db)
    try:
        record = await attendance_service.clock_out(db, emp.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {
        "message": "Clocked out successfully.",
        "attendance_id": str(record.id),
        "clock_out": record.clock_out.isoformat(),
        "total_hours": record.total_hours,
        "status": record.status,
    }


@router.get("/me")
async def get_my_attendance(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
):
    """Get the current user's own attendance records."""
    emp = await _get_current_employee(current_user, db)

    today_record = await attendance_service.get_today_record(db, emp.id)
    records = await attendance_service.get_my_attendance(db, emp.id, skip=skip, limit=limit)

    return {
        "today": {
            "clocked_in": today_record is not None,
            "clocked_out": today_record.clock_out is not None if today_record else False,
            "clock_in": today_record.clock_in.isoformat() if today_record else None,
            "clock_out": today_record.clock_out.isoformat() if today_record and today_record.clock_out else None,
            "total_hours": today_record.total_hours if today_record else None,
            "status": today_record.status if today_record else None,
        },
        "records": [
            {
                "id": str(r.id),
                "attendance_date": r.attendance_date.isoformat(),
                "clock_in": r.clock_in.isoformat(),
                "clock_out": r.clock_out.isoformat() if r.clock_out else None,
                "total_hours": r.total_hours,
                "status": r.status,
            }
            for r in records
        ],
    }


@router.get("/team")
async def get_team_attendance(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    """
    Get attendance for the manager's team.

    Allowed roles: MANAGER, HR, ADMIN
    """
    user_role = Role(current_user.role)
    if user_role == Role.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Insufficient privileges.")

    emp = await _get_current_employee(current_user, db)

    td = date.fromisoformat(target_date) if target_date else None
    records = await attendance_service.get_team_attendance(
        db, emp.id, current_user.company_id, target_date=td,
    )
    return {"date": (td or date.today()).isoformat(), "records": records}


@router.get(
    "/company",
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def get_company_attendance(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    target_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
):
    """
    Get company-wide attendance analytics for a specific date.

    Allowed roles: ADMIN, HR
    """
    td = date.fromisoformat(target_date) if target_date else None
    return await attendance_service.get_company_attendance(
        db, current_user.company_id, target_date=td,
    )
