"""
AI Hiring OS — Employee Schemas

Pydantic models for employee-related request / response payloads.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr

from app.models.employee import EmployeeStatus, EmploymentType


# ── Requests ─────────────────────────────────────────────────────


class EmployeeCreate(BaseModel):
    """Payload to create a new employee."""

    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    joining_date: Optional[date] = None
    employment_type: str = EmploymentType.FULL_TIME.value
    profile_photo: Optional[str] = None
    user_id: Optional[uuid.UUID] = None


class EmployeeUpdate(BaseModel):
    """Payload for partial employee update."""

    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    joining_date: Optional[date] = None
    employment_type: Optional[str] = None
    status: Optional[str] = None
    profile_photo: Optional[str] = None


# ── Responses ────────────────────────────────────────────────────


class EmployeeOut(BaseModel):
    """Public representation of an employee."""

    id: uuid.UUID
    company_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    employee_code: str
    full_name: str
    email: str
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    joining_date: Optional[date] = None
    employment_type: str
    status: str
    profile_photo: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EmployeeListOut(BaseModel):
    """Paginated employee list response."""

    employees: List[EmployeeOut]
    total: int
    skip: int
    limit: int
