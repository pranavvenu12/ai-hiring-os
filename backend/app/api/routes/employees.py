"""
AI Hiring OS — Employee Routes

CRUD endpoints for employee management with RBAC and tenant isolation.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, require_roles
from app.core.security import Role
from app.db.session import get_db
from app.schemas.employee import EmployeeCreate, EmployeeListOut, EmployeeOut, EmployeeUpdate
from app.services import employee_service

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.post(
    "",
    response_model=EmployeeOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def create_employee(
    payload: EmployeeCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new employee record.

    Allowed roles: ADMIN, HR
    """
    employee = await employee_service.create_employee(
        db, payload, current_user.company_id
    )
    return employee


@router.get("", response_model=EmployeeListOut)
async def list_employees(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """
    List employees with search, filter, and pagination.

    RBAC:
    - HR/Admin: all company employees
    - Manager: team members only
    - Employee: own profile only
    """
    user_role = Role(current_user.role)

    if user_role in (Role.ADMIN, Role.HR):
        employees, total = await employee_service.list_employees(
            db, current_user.company_id,
            skip=skip, limit=limit, search=search,
            department=department, status=status_filter,
        )
    elif user_role == Role.MANAGER:
        # Manager sees team only
        manager_emp = await employee_service.get_employee_by_user_id(
            db, current_user.id, current_user.company_id,
        )
        if manager_emp:
            team = await employee_service.get_team_members(
                db, manager_emp.id, current_user.company_id,
            )
            # Include the manager themselves
            employees = [manager_emp] + team
            total = len(employees)
        else:
            employees, total = [], 0
    else:
        # Employee sees own profile only
        emp = await employee_service.get_employee_by_user_id(
            db, current_user.id, current_user.company_id,
        )
        employees = [emp] if emp else []
        total = len(employees)

    return EmployeeListOut(
        employees=[EmployeeOut.model_validate(e) for e in employees],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/departments")
async def list_departments(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return distinct department names for the current company."""
    departments = await employee_service.get_departments(db, current_user.company_id)
    return {"departments": departments}


@router.get("/{employee_id}", response_model=EmployeeOut)
async def get_employee(
    employee_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get a single employee by ID.

    RBAC:
    - HR/Admin: any employee in company
    - Manager: team members only
    - Employee: own profile only
    """
    employee = await employee_service.get_employee_by_id(db, employee_id)
    if not employee or employee.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Employee not found.")

    user_role = Role(current_user.role)
    if user_role == Role.EMPLOYEE:
        if employee.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied.")
    elif user_role == Role.MANAGER:
        manager_emp = await employee_service.get_employee_by_user_id(
            db, current_user.id, current_user.company_id,
        )
        if manager_emp and employee.manager_id != manager_emp.id and employee.id != manager_emp.id:
            raise HTTPException(status_code=403, detail="Access denied to this employee.")

    return employee


@router.put(
    "/{employee_id}",
    response_model=EmployeeOut,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def update_employee(
    employee_id: uuid.UUID,
    payload: EmployeeUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update an employee record.

    Allowed roles: ADMIN, HR
    """
    employee = await employee_service.get_employee_by_id(db, employee_id)
    if not employee or employee.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Employee not found.")

    return await employee_service.update_employee(db, employee, payload)


@router.delete(
    "/{employee_id}",
    response_model=EmployeeOut,
    dependencies=[Depends(require_roles(Role.ADMIN, Role.HR))],
)
async def delete_employee(
    employee_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Soft-delete an employee (sets status to terminated).

    Allowed roles: ADMIN, HR
    """
    employee = await employee_service.get_employee_by_id(db, employee_id)
    if not employee or employee.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Employee not found.")

    return await employee_service.delete_employee(db, employee)
