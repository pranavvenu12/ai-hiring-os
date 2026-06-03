"""
AI Hiring OS - Payroll Routes

Attendance-linked payroll endpoints with tenant isolation and role-based access.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.schemas.payroll import PayrollGenerateAllOut, PayrollGenerateAllRequest, PayrollGenerateRequest, PayrollListOut, PayrollOut, PayrollStatusUpdateOut
from app.services import employee_service, payroll_service

router = APIRouter(prefix="/payroll", tags=["Payroll"])


async def _current_employee_id(current_user, db: AsyncSession) -> uuid.UUID:
    employee = await employee_service.get_employee_by_user_id(db, current_user.id, current_user.company_id)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee profile found. Please contact HR.",
        )
    return employee.id


@router.post(
    "/generate",
    response_model=PayrollOut,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def generate_payroll(
    payload: PayrollGenerateRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate or regenerate payroll for one employee."""
    try:
        return await payroll_service.generate_payroll(
            db,
            company_id=current_user.company_id,
            employee_id=payload.employee_id,
            month=payload.month,
            year=payload.year,
            base_salary=payload.base_salary,
            allowances=payload.allowances,
            bonuses=payload.bonuses,
            deductions=payload.deductions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/generate-all",
    response_model=PayrollGenerateAllOut,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def generate_all_payroll(
    payload: PayrollGenerateAllRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate payroll for every active employee in the company."""
    try:
        records = await payroll_service.generate_company_payroll(
            db,
            company_id=current_user.company_id,
            month=payload.month,
            year=payload.year,
            default_base_salary=payload.default_base_salary,
            employee_salaries=payload.employee_salaries,
            default_allowances=payload.default_allowances,
            default_bonuses=payload.default_bonuses,
            default_deductions=payload.default_deductions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return {
        "message": "Company payroll generated successfully.",
        "generated_count": len(records),
        "records": records,
    }


@router.get(
    "",
    response_model=PayrollListOut,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR, Role.MANAGER))],
)
async def list_payroll(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List company payroll records. Managers are read-only."""
    return await payroll_service.list_company_payroll(
        db,
        company_id=current_user.company_id,
        month=month,
        year=year,
        skip=skip,
        limit=limit,
    )


@router.get("/me", response_model=PayrollListOut)
async def my_payroll(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get payroll history for the logged-in employee."""
    employee_id = await _current_employee_id(current_user, db)
    return await payroll_service.list_employee_payroll(
        db,
        company_id=current_user.company_id,
        employee_id=employee_id,
        skip=skip,
        limit=limit,
    )


@router.get("/{payroll_id}", response_model=PayrollOut)
async def get_payroll(
    payroll_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get one payroll record with tenant and employee access checks."""
    row = await payroll_service.get_payroll_by_id(db, payroll_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found.")

    record, employee, company = row
    if record.company_id != current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found.")

    user_role = Role(current_user.role)
    if user_role == Role.EMPLOYEE and employee.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this payslip.")

    return payroll_service._serialize(record, employee, company)


@router.put(
    "/{payroll_id}/approve",
    response_model=PayrollStatusUpdateOut,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def approve_payroll(
    payroll_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Approve generated payroll."""
    try:
        payroll = await payroll_service.update_status(
            db,
            payroll_id=payroll_id,
            company_id=current_user.company_id,
            status_value="approved",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return {"message": "Payroll approved.", "payroll": payroll}


@router.put(
    "/{payroll_id}/mark-paid",
    response_model=PayrollStatusUpdateOut,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def mark_payroll_paid(
    payroll_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark approved payroll as paid."""
    try:
        payroll = await payroll_service.update_status(
            db,
            payroll_id=payroll_id,
            company_id=current_user.company_id,
            status_value="paid",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return {"message": "Payroll marked as paid.", "payroll": payroll}
