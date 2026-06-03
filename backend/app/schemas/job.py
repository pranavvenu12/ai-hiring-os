"""
AI Hiring OS — Job Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class JobBase(BaseModel):
    title: str
    description: str
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    salary_range: str | None = None
    open_until: datetime | None = None


class JobCreate(JobBase):
    """Payload to create a new job."""
    pass


class JobOut(JobBase):
    """Public representation of a job."""
    id: uuid.UUID
    company_id: uuid.UUID
    created_by: uuid.UUID
    created_at: datetime
    status: str = "open"

    model_config = {"from_attributes": True}


class PublicJobOut(JobBase):
    """Public job posting shown on the candidate careers portal."""

    id: uuid.UUID
    company_id: uuid.UUID
    company_name: str
    created_at: datetime
    department: str | None = None
    location: str | None = None
    employment_type: str | None = None
    salary_range: str | None = None
    open_until: datetime | None = None

    model_config = {"from_attributes": True}
