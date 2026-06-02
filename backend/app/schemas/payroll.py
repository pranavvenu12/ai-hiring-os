"""
AI Hiring OS - Payroll Schemas

Request and response contracts for payroll generation, approval, and payslips.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.payroll import PayrollStatus


class PayrollGenerateRequest(BaseModel):
    employee_id: uuid.UUID
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    base_salary: float = Field(..., ge=0)


class PayrollGenerateAllRequest(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    default_base_salary: float = Field(..., ge=0)
    employee_salaries: dict[str, float] = Field(default_factory=dict)


class PayrollOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    department: Optional[str] = None
    company_name: Optional[str] = None
    month: int
    year: int
    base_salary: float
    present_days: float
    half_days: float
    absent_days: float
    working_days: float
    gross_salary: float
    deductions: float
    net_salary: float
    status: str
    ai_summary: Optional[str] = None
    generated_at: datetime
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PayrollListOut(BaseModel):
    records: list[PayrollOut]
    total: int
    skip: int
    limit: int
    summary: dict


class PayrollStatusUpdateOut(BaseModel):
    message: str
    payroll: PayrollOut


class PayrollGenerateAllOut(BaseModel):
    message: str
    generated_count: int
    records: list[PayrollOut]


class PayrollStatusValues(BaseModel):
    statuses: list[str] = Field(default_factory=lambda: [status.value for status in PayrollStatus])
