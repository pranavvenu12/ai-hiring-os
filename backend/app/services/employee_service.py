"""
AI Hiring OS — Employee Service

Business logic for employee CRUD with tenant isolation.
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee, EmployeeStatus
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


async def _generate_employee_code(db: AsyncSession, company_id: uuid.UUID) -> str:
    """Generate the next sequential employee code for a company."""
    result = await db.execute(
        select(Employee.employee_code).where(Employee.company_id == company_id)
    )
    max_number = 0
    for code in result.scalars().all():
        if not code or not code.startswith("EMP-"):
            continue
        suffix = code.removeprefix("EMP-")
        if suffix.isdigit():
            max_number = max(max_number, int(suffix))

    return f"EMP-{max_number + 1:04d}"


async def create_employee(
    db: AsyncSession,
    payload: EmployeeCreate,
    company_id: uuid.UUID,
) -> Employee:
    """Create a new employee record."""
    employee_code = await _generate_employee_code(db, company_id)

    employee = Employee(
        company_id=company_id,
        user_id=payload.user_id,
        employee_code=employee_code,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        department=payload.department,
        designation=payload.designation,
        manager_id=payload.manager_id,
        joining_date=payload.joining_date,
        employment_type=payload.employment_type,
        profile_photo=payload.profile_photo,
    )
    db.add(employee)
    await db.flush()
    await db.refresh(employee)
    return employee


async def list_employees(
    db: AsyncSession,
    company_id: uuid.UUID,
    *,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
) -> tuple[list[Employee], int]:
    """List employees with search, filter, and pagination. Returns (employees, total_count)."""
    query = select(Employee).where(Employee.company_id == company_id)
    count_query = select(func.count(Employee.id)).where(Employee.company_id == company_id)

    if search:
        search_filter = or_(
            Employee.full_name.ilike(f"%{search}%"),
            Employee.email.ilike(f"%{search}%"),
            Employee.employee_code.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if department:
        query = query.where(Employee.department == department)
        count_query = count_query.where(Employee.department == department)

    if status:
        query = query.where(Employee.status == status)
        count_query = count_query.where(Employee.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(
        query.order_by(Employee.created_at.desc()).offset(skip).limit(limit)
    )
    employees = list(result.scalars().all())

    return employees, total


async def get_employee_by_id(
    db: AsyncSession, employee_id: uuid.UUID
) -> Employee | None:
    """Fetch a single employee by ID."""
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    return result.scalar_one_or_none()


async def get_employee_by_user_id(
    db: AsyncSession, user_id: uuid.UUID, company_id: uuid.UUID,
) -> Employee | None:
    """Fetch an employee by their linked user account. Auto-creates if missing for non-employee roles."""
    result = await db.execute(
        select(Employee).where(
            Employee.user_id == user_id,
            Employee.company_id == company_id,
        )
    )
    employee = result.scalar_one_or_none()
    if not employee:
        # Load user to auto-create employee profile
        from app.models.user import User
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            employee_code = await _generate_employee_code(db, company_id)
            department = "Management" if user.role in ("manager", "admin") else "HR" if user.role == "hr" else "General"
            designation = user.role.upper()
            
            employee = Employee(
                company_id=company_id,
                user_id=user_id,
                employee_code=employee_code,
                full_name=user.name,
                email=user.email,
                department=department,
                designation=designation,
                status="active"
            )
            db.add(employee)
            await db.flush()
            await db.commit()  # Permanently save to database so subsequent calls find it.
            
            # Re-fetch after commit
            result_refetched = await db.execute(
                select(Employee).where(
                    Employee.id == employee.id
                )
            )
            employee = result_refetched.scalar_one_or_none()
            
    return employee


async def get_team_members(
    db: AsyncSession, manager_id: uuid.UUID, company_id: uuid.UUID,
) -> list[Employee]:
    """Fetch all direct reports for a manager."""
    result = await db.execute(
        select(Employee).where(
            Employee.manager_id == manager_id,
            Employee.company_id == company_id,
        ).order_by(Employee.full_name)
    )
    return list(result.scalars().all())


async def update_employee(
    db: AsyncSession,
    employee: Employee,
    payload: EmployeeUpdate,
) -> Employee:
    """Partially update an employee record."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    await db.flush()
    await db.refresh(employee)
    return employee


async def delete_employee(db: AsyncSession, employee: Employee) -> Employee:
    """Soft-delete an employee by setting status to terminated."""
    employee.status = EmployeeStatus.TERMINATED.value
    await db.flush()
    await db.refresh(employee)
    return employee


async def get_departments(
    db: AsyncSession, company_id: uuid.UUID,
) -> list[str]:
    """Return distinct department names for a company."""
    result = await db.execute(
        select(Employee.department)
        .where(Employee.company_id == company_id, Employee.department.isnot(None))
        .distinct()
    )
    return [row[0] for row in result.all()]
