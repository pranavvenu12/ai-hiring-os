"""
AI Hiring OS — Attendance Service

Business logic for clock-in / clock-out and attendance analytics.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.employee import Employee


def _derive_status(total_hours: float) -> str:
    """Derive attendance status from total worked hours."""
    if total_hours >= 8:
        return AttendanceStatus.PRESENT.value
    elif total_hours >= 4:
        return AttendanceStatus.HALF_DAY.value
    else:
        return AttendanceStatus.ABSENT.value


async def clock_in(
    db: AsyncSession,
    employee_id: uuid.UUID,
    company_id: uuid.UUID,
) -> AttendanceRecord:
    """Clock in an employee. Only one clock-in per day is allowed."""
    today = date.today()

    # Check for existing record today
    result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.attendance_date == today,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise ValueError("Already clocked in today.")

    now = datetime.now(timezone.utc)
    record = AttendanceRecord(
        employee_id=employee_id,
        company_id=company_id,
        clock_in=now,
        attendance_date=today,
        status=AttendanceStatus.PRESENT.value,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


async def clock_out(
    db: AsyncSession,
    employee_id: uuid.UUID,
) -> AttendanceRecord:
    """Clock out an employee and calculate total hours + status."""
    today = date.today()

    result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.attendance_date == today,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise ValueError("No clock-in record found for today.")
    if record.clock_out is not None:
        raise ValueError("Already clocked out today.")

    now = datetime.now(timezone.utc)
    record.clock_out = now
    total_seconds = (now - record.clock_in).total_seconds()
    record.total_hours = round(total_seconds / 3600, 2)
    record.status = _derive_status(record.total_hours)

    await db.flush()
    await db.refresh(record)
    return record


async def get_my_attendance(
    db: AsyncSession,
    employee_id: uuid.UUID,
    *,
    skip: int = 0,
    limit: int = 30,
) -> list[AttendanceRecord]:
    """Get attendance records for a single employee."""
    result = await db.execute(
        select(AttendanceRecord)
        .where(AttendanceRecord.employee_id == employee_id)
        .order_by(AttendanceRecord.attendance_date.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_today_record(
    db: AsyncSession,
    employee_id: uuid.UUID,
) -> AttendanceRecord | None:
    """Get today's attendance record for an employee."""
    result = await db.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.attendance_date == date.today(),
        )
    )
    return result.scalar_one_or_none()


async def get_team_attendance(
    db: AsyncSession,
    manager_employee_id: uuid.UUID,
    company_id: uuid.UUID,
    *,
    target_date: Optional[date] = None,
) -> list[dict]:
    """Get attendance for all direct reports of a manager."""
    if target_date is None:
        target_date = date.today()

    # Get team member IDs
    team_result = await db.execute(
        select(Employee).where(
            Employee.manager_id == manager_employee_id,
            Employee.company_id == company_id,
        )
    )
    team_members = list(team_result.scalars().all())

    records = []
    for member in team_members:
        att_result = await db.execute(
            select(AttendanceRecord).where(
                AttendanceRecord.employee_id == member.id,
                AttendanceRecord.attendance_date == target_date,
            )
        )
        att = att_result.scalar_one_or_none()
        records.append({
            "employee_id": str(member.id),
            "employee_name": member.full_name,
            "department": member.department,
            "attendance_date": target_date.isoformat(),
            "clock_in": att.clock_in.isoformat() if att else None,
            "clock_out": att.clock_out.isoformat() if att and att.clock_out else None,
            "total_hours": att.total_hours if att else None,
            "status": att.status if att else "not_clocked_in",
        })
    return records


async def get_company_attendance(
    db: AsyncSession,
    company_id: uuid.UUID,
    *,
    target_date: Optional[date] = None,
) -> dict:
    """Get company-wide attendance summary for a specific date."""
    if target_date is None:
        target_date = date.today()

    # Total active employees
    emp_result = await db.execute(
        select(func.count(Employee.id)).where(
            Employee.company_id == company_id,
            Employee.status == "active",
        )
    )
    total_employees = emp_result.scalar() or 0

    # Attendance records for the date
    result = await db.execute(
        select(AttendanceRecord, Employee.full_name)
        .join(Employee, AttendanceRecord.employee_id == Employee.id)
        .where(
            AttendanceRecord.company_id == company_id,
            AttendanceRecord.attendance_date == target_date,
        )
    )
    rows = result.all()

    present_count = 0
    half_day_count = 0
    absent_count = 0
    total_hours_sum = 0.0
    hours_count = 0
    records = []

    for att, emp_name in rows:
        if att.status == AttendanceStatus.PRESENT.value:
            present_count += 1
        elif att.status == AttendanceStatus.HALF_DAY.value:
            half_day_count += 1
        elif att.status == AttendanceStatus.ABSENT.value:
            absent_count += 1

        if att.total_hours:
            total_hours_sum += att.total_hours
            hours_count += 1

        records.append({
            "id": str(att.id),
            "employee_id": str(att.employee_id),
            "company_id": str(att.company_id),
            "clock_in": att.clock_in.isoformat(),
            "clock_out": att.clock_out.isoformat() if att.clock_out else None,
            "total_hours": att.total_hours,
            "attendance_date": att.attendance_date.isoformat(),
            "status": att.status,
            "employee_name": emp_name,
        })

    not_clocked_in = total_employees - len(rows)

    return {
        "total_employees": total_employees,
        "present_count": present_count,
        "half_day_count": half_day_count,
        "absent_count": absent_count,
        "not_clocked_in": not_clocked_in,
        "present_percentage": round((present_count / total_employees * 100) if total_employees else 0, 1),
        "absent_percentage": round((not_clocked_in / total_employees * 100) if total_employees else 0, 1),
        "avg_hours": round(total_hours_sum / hours_count, 1) if hours_count else 0.0,
        "date": target_date.isoformat(),
        "records": records,
    }
