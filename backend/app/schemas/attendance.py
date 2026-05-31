"""
AI Hiring OS — Attendance Schemas

Pydantic models for attendance-related request / response payloads.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class AttendanceOut(BaseModel):
    """Public representation of an attendance record."""

    id: uuid.UUID
    employee_id: uuid.UUID
    company_id: uuid.UUID
    clock_in: datetime
    clock_out: Optional[datetime] = None
    total_hours: Optional[float] = None
    attendance_date: date
    status: str
    employee_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    """Aggregated attendance statistics."""

    total_employees: int = 0
    present_count: int = 0
    half_day_count: int = 0
    absent_count: int = 0
    not_clocked_in: int = 0
    present_percentage: float = 0.0
    absent_percentage: float = 0.0
    avg_hours: float = 0.0
    date: date
    records: List[AttendanceOut] = []


class ClockInResponse(BaseModel):
    """Response for clock-in action."""

    message: str
    attendance_id: uuid.UUID
    clock_in: datetime


class ClockOutResponse(BaseModel):
    """Response for clock-out action."""

    message: str
    attendance_id: uuid.UUID
    clock_out: datetime
    total_hours: float
    status: str
