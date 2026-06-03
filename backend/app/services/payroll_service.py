"""
AI Hiring OS - Payroll Service

Attendance-based payroll generation, status workflow, analytics, and AI summaries.
"""

from __future__ import annotations

import calendar
import json
import uuid
from datetime import date, datetime, timezone
from typing import Any

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.company import Company
from app.models.employee import Employee
from app.models.payroll import PayrollRecord, PayrollStatus
from app.services import realtime_service

settings = get_settings()


def _month_bounds(month: int, year: int) -> tuple[date, date]:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _working_days(month: int, year: int) -> int:
    start, end = _month_bounds(month, year)
    today = date.today()
    if year == today.year and month == today.month:
        end = min(end, today)

    days = 0
    current = start
    while current <= end:
        if current.weekday() < 5:
            days += 1
        current = date.fromordinal(current.toordinal() + 1)
    return max(days, 1)


def _round_money(value: float) -> float:
    return round(max(value, 0.0), 2)


async def _attendance_counts(
    db: AsyncSession,
    employee_id: uuid.UUID,
    company_id: uuid.UUID,
    month: int,
    year: int,
) -> dict[str, float]:
    start, end = _month_bounds(month, year)
    today = date.today()
    if year == today.year and month == today.month:
        end = min(end, today)

    result = await db.execute(
        select(AttendanceRecord.status, func.count(AttendanceRecord.id))
        .where(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.company_id == company_id,
            AttendanceRecord.attendance_date >= start,
            AttendanceRecord.attendance_date <= end,
        )
        .group_by(AttendanceRecord.status)
    )
    counts = {status: float(count) for status, count in result.all()}
    present_days = counts.get(AttendanceStatus.PRESENT.value, 0.0)
    half_days = counts.get(AttendanceStatus.HALF_DAY.value, 0.0)
    working_days = float(_working_days(month, year))
    absent_days = max(working_days - present_days - half_days, 0.0)

    return {
        "working_days": working_days,
        "present_days": present_days,
        "half_days": half_days,
        "absent_days": absent_days,
    }


def _calculate_salary(
    base_salary: float,
    counts: dict[str, float],
    *,
    allowances: float = 0.0,
    bonuses: float = 0.0,
    manual_deductions: float = 0.0,
) -> dict[str, float]:
    working_days = max(counts["working_days"], 1.0)
    daily_salary = base_salary / working_days
    absence_penalty = daily_salary * counts["absent_days"]
    half_day_penalty = (daily_salary * 0.5) * counts["half_days"]
    attendance_deductions = _round_money(absence_penalty + half_day_penalty)
    deductions = _round_money(attendance_deductions + manual_deductions)
    gross_salary = _round_money(base_salary + allowances + bonuses)
    net_salary = _round_money(gross_salary - deductions)

    return {
        "basic_salary": _round_money(base_salary),
        "allowances": _round_money(allowances),
        "bonuses": _round_money(bonuses),
        "manual_deductions": _round_money(manual_deductions),
        "attendance_deductions": attendance_deductions,
        "gross_salary": gross_salary,
        "deductions": deductions,
        "net_salary": net_salary,
    }


def _template_payroll_summary(employee: Employee, record_data: dict[str, Any]) -> str:
    return (
        f"{employee.full_name}'s payroll for {record_data['month']}/{record_data['year']} "
        f"has a net salary of {record_data['net_salary']:.2f} after "
        f"{record_data['deductions']:.2f} in attendance-based deductions. "
        f"Attendance counted {record_data['present_days']:.0f} present, "
        f"{record_data['half_days']:.0f} half-day, and {record_data['absent_days']:.0f} absent days."
    )


async def _generate_ai_summary(employee: Employee, record_data: dict[str, Any]) -> str:
    prompt = f"""You are an HR payroll assistant.

Summarize this payroll record in one concise sentence for HR review.
Do not include policy advice. Do not invent data.

Employee: {employee.full_name}
Department: {employee.department or "Not set"}
Period: {record_data["month"]}/{record_data["year"]}
Base salary: {record_data["base_salary"]}
Present days: {record_data["present_days"]}
Half days: {record_data["half_days"]}
Absent days: {record_data["absent_days"]}
Deductions: {record_data["deductions"]}
Net salary: {record_data["net_salary"]}
"""

    if settings.AI_GEMINI_KEY:
        try:
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"gemini-2.5-flash:generateContent?key={settings.AI_GEMINI_KEY}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "maxOutputTokens": 512,
                    "thinkingConfig": {
                        "thinkingBudget": 0
                    }
                }
            }
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception:
            pass

    if settings.AI_GROQ_KEY:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.AI_GROQ_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
            }
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    if settings.AI_HF_KEY:
        try:
            payload = {
                "model": settings.AI_HF_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
            }
            headers = {"Authorization": f"Bearer {settings.AI_HF_KEY}"}
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{settings.AI_HF_BASE_URL}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception:
            pass

    return _template_payroll_summary(employee, record_data)


def _serialize(record: PayrollRecord, employee: Employee | None = None, company: Company | None = None) -> dict[str, Any]:
    return {
        "id": record.id,
        "company_id": record.company_id,
        "employee_id": record.employee_id,
        "employee_name": employee.full_name if employee else None,
        "employee_email": employee.email if employee else None,
        "department": employee.department if employee else None,
        "company_name": company.name if company else None,
        "month": record.month,
        "year": record.year,
        "base_salary": record.base_salary,
        "basic_salary": record.basic_salary,
        "allowances": record.allowances,
        "bonuses": record.bonuses,
        "manual_deductions": record.manual_deductions,
        "attendance_deductions": record.attendance_deductions,
        "present_days": record.present_days,
        "half_days": record.half_days,
        "absent_days": record.absent_days,
        "working_days": record.working_days,
        "gross_salary": record.gross_salary,
        "deductions": record.deductions,
        "net_salary": record.net_salary,
        "status": record.status,
        "ai_summary": record.ai_summary,
        "generated_at": record.generated_at,
        "approved_at": record.approved_at,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


async def generate_payroll(
    db: AsyncSession,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    month: int,
    year: int,
    base_salary: float,
    allowances: float = 0.0,
    bonuses: float = 0.0,
    deductions: float = 0.0,
) -> dict[str, Any]:
    employee_result = await db.execute(
        select(Employee).where(Employee.id == employee_id, Employee.company_id == company_id)
    )
    employee = employee_result.scalar_one_or_none()
    if not employee:
        raise ValueError("Employee not found in your company.")

    counts = await _attendance_counts(db, employee_id, company_id, month, year)
    salary = _calculate_salary(
        base_salary,
        counts,
        allowances=allowances,
        bonuses=bonuses,
        manual_deductions=deductions,
    )
    record_data = {
        "month": month,
        "year": year,
        "base_salary": _round_money(base_salary),
        **counts,
        **salary,
    }
    ai_summary = await _generate_ai_summary(employee, record_data)

    existing_result = await db.execute(
        select(PayrollRecord).where(
            PayrollRecord.employee_id == employee_id,
            PayrollRecord.month == month,
            PayrollRecord.year == year,
        )
    )
    record = existing_result.scalar_one_or_none()
    if record and record.status == PayrollStatus.PAID.value:
        raise ValueError("Paid payroll cannot be regenerated.")

    now = datetime.now(timezone.utc)
    if not record:
        record = PayrollRecord(company_id=company_id, employee_id=employee_id)
        db.add(record)

    for key, value in record_data.items():
        setattr(record, key, value)
    record.status = PayrollStatus.GENERATED.value
    record.ai_summary = ai_summary
    record.generated_at = now
    record.approved_at = None
    record.updated_at = now

    await db.flush()
    await db.refresh(record)

    company = await db.get(Company, company_id)
    serialized = _serialize(record, employee, company)
    await realtime_service.publish_event(company_id, "payroll.generated", {
        "payroll_id": str(record.id),
        "employee_id": str(employee.id),
        "employee_name": employee.full_name,
        "month": month,
        "year": year,
        "net_salary": record.net_salary,
        "status": record.status,
    })
    return serialized


async def generate_company_payroll(
    db: AsyncSession,
    *,
    company_id: uuid.UUID,
    month: int,
    year: int,
    default_base_salary: float,
    employee_salaries: dict[str, float],
    default_allowances: float = 0.0,
    default_bonuses: float = 0.0,
    default_deductions: float = 0.0,
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(Employee)
        .where(Employee.company_id == company_id, Employee.status == "active")
        .order_by(Employee.full_name.asc())
    )
    employees = list(result.scalars().all())

    records = []
    for employee in employees:
        salary = employee_salaries.get(str(employee.id), default_base_salary)
        records.append(
            await generate_payroll(
                db,
                company_id=company_id,
                employee_id=employee.id,
                month=month,
                year=year,
                base_salary=salary,
                allowances=default_allowances,
                bonuses=default_bonuses,
                deductions=default_deductions,
            )
        )
    return records


async def list_company_payroll(
    db: AsyncSession,
    *,
    company_id: uuid.UUID,
    month: int | None = None,
    year: int | None = None,
    skip: int = 0,
    limit: int = 100,
) -> dict[str, Any]:
    filters = [PayrollRecord.company_id == company_id]
    if month:
        filters.append(PayrollRecord.month == month)
    if year:
        filters.append(PayrollRecord.year == year)

    count_result = await db.execute(select(func.count(PayrollRecord.id)).where(*filters))
    total = count_result.scalar() or 0

    result = await db.execute(
        select(PayrollRecord, Employee, Company)
        .join(Employee, PayrollRecord.employee_id == Employee.id)
        .join(Company, PayrollRecord.company_id == Company.id)
        .where(*filters)
        .order_by(PayrollRecord.year.desc(), PayrollRecord.month.desc(), Employee.full_name.asc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()
    records = [_serialize(record, employee, company) for record, employee, company in rows]
    summary = _build_summary(records)
    return {"records": records, "total": total, "skip": skip, "limit": limit, "summary": summary}


async def list_employee_payroll(
    db: AsyncSession,
    *,
    company_id: uuid.UUID,
    employee_id: uuid.UUID,
    skip: int = 0,
    limit: int = 50,
) -> dict[str, Any]:
    result = await db.execute(
        select(PayrollRecord, Employee, Company)
        .join(Employee, PayrollRecord.employee_id == Employee.id)
        .join(Company, PayrollRecord.company_id == Company.id)
        .where(PayrollRecord.company_id == company_id, PayrollRecord.employee_id == employee_id)
        .order_by(PayrollRecord.year.desc(), PayrollRecord.month.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()
    records = [_serialize(record, employee, company) for record, employee, company in rows]
    return {"records": records, "total": len(records), "skip": skip, "limit": limit, "summary": _build_summary(records)}


async def get_payroll_by_id(db: AsyncSession, payroll_id: uuid.UUID) -> tuple[PayrollRecord, Employee, Company] | None:
    result = await db.execute(
        select(PayrollRecord, Employee, Company)
        .join(Employee, PayrollRecord.employee_id == Employee.id)
        .join(Company, PayrollRecord.company_id == Company.id)
        .where(PayrollRecord.id == payroll_id)
    )
    return result.one_or_none()


async def update_status(
    db: AsyncSession,
    *,
    payroll_id: uuid.UUID,
    company_id: uuid.UUID,
    status_value: str,
) -> dict[str, Any]:
    row = await get_payroll_by_id(db, payroll_id)
    if not row:
        raise ValueError("Payroll record not found.")

    record, employee, company = row
    if record.company_id != company_id:
        raise ValueError("Payroll record not found.")

    if status_value == PayrollStatus.APPROVED.value:
        record.status = PayrollStatus.APPROVED.value
        record.approved_at = datetime.now(timezone.utc)
    elif status_value == PayrollStatus.PAID.value:
        if record.status not in (PayrollStatus.APPROVED.value, PayrollStatus.PAID.value):
            raise ValueError("Only approved payroll can be marked paid.")
        record.status = PayrollStatus.PAID.value
    else:
        raise ValueError("Unsupported payroll status.")

    record.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(record)
    serialized = _serialize(record, employee, company)
    await realtime_service.publish_event(company_id, "payroll.status_updated", {
        "payroll_id": str(record.id),
        "employee_id": str(employee.id),
        "employee_name": employee.full_name,
        "status": record.status,
    })
    return serialized


def _build_summary(records: list[dict[str, Any]]) -> dict[str, Any]:
    total_cost = sum(float(record["net_salary"] or 0) for record in records)
    approved_count = len([r for r in records if r["status"] == PayrollStatus.APPROVED.value])
    paid_count = len([r for r in records if r["status"] == PayrollStatus.PAID.value])
    pending_count = len([r for r in records if r["status"] in {PayrollStatus.GENERATED.value, PayrollStatus.DRAFT.value}])
    department_costs: dict[str, float] = {}
    for record in records:
        department = record.get("department") or "Unassigned"
        department_costs[department] = _round_money(department_costs.get(department, 0.0) + float(record["net_salary"] or 0))

    return {
        "total_payroll_cost": _round_money(total_cost),
        "employees_paid": paid_count,
        "pending_payroll": pending_count,
        "approved_payroll": approved_count,
        "average_salary": _round_money(total_cost / len(records)) if records else 0.0,
        "department_costs": department_costs,
        "ai_summary": _summary_sentence(records, total_cost, pending_count, paid_count),
    }


def _summary_sentence(records: list[dict[str, Any]], total_cost: float, pending_count: int, paid_count: int) -> str:
    if not records:
        return "No payroll records are available for the selected period."
    return (
        f"Payroll includes {len(records)} employees with total net cost "
        f"{_round_money(total_cost):.2f}; {paid_count} paid and {pending_count} pending records need HR action."
    )
