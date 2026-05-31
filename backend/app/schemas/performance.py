"""
AI Hiring OS — Performance Schemas

Pydantic models for performance review request / response payloads.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Requests ─────────────────────────────────────────────────────


class PerformanceCreate(BaseModel):
    """Payload to submit a performance review."""

    employee_id: uuid.UUID
    rating: float = Field(..., ge=1.0, le=5.0)
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    comments: Optional[str] = None
    review_date: Optional[date] = None


# ── Responses ────────────────────────────────────────────────────


class PerformanceOut(BaseModel):
    """Public representation of a performance review."""

    id: uuid.UUID
    employee_id: uuid.UUID
    reviewer_id: uuid.UUID
    company_id: uuid.UUID
    rating: float
    strengths: Optional[str] = None
    improvements: Optional[str] = None
    comments: Optional[str] = None
    review_date: date
    created_at: datetime
    employee_name: Optional[str] = None
    reviewer_name: Optional[str] = None

    model_config = {"from_attributes": True}


class TopPerformer(BaseModel):
    """A top-performing employee summary."""

    employee_id: uuid.UUID
    employee_name: str
    department: Optional[str] = None
    avg_rating: float
    review_count: int


class DepartmentPerformance(BaseModel):
    """Performance metrics for a department."""

    department: str
    avg_rating: float
    employee_count: int


class PerformanceSummary(BaseModel):
    """Company-wide performance analytics."""

    avg_rating: float = 0.0
    total_reviews: int = 0
    top_performers: List[TopPerformer] = []
    department_performance: List[DepartmentPerformance] = []
    reviews: List[PerformanceOut] = []
