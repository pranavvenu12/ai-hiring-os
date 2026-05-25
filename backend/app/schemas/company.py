"""
AI Hiring OS — Company Schemas

Pydantic models for company-related request / response payloads.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Responses ────────────────────────────────────────────────────


class CompanyOut(BaseModel):
    """Public representation of a company (tenant)."""

    id: uuid.UUID
    name: str
    created_at: datetime
    industry: str | None = None
    website: str | None = None
    location: str | None = None
    employee_count_range: str | None = None
    contact_email: str | None = None
    description: str | None = None

    model_config = {"from_attributes": True}


# ── Requests ─────────────────────────────────────────────────────


class CompanyCreate(BaseModel):
    """Payload to create a new company."""

    name: str = Field(..., min_length=1, max_length=255)


class CompanyUpdate(BaseModel):
    """Payload to edit company and profile details."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=512)
    location: str | None = Field(default=None, max_length=255)
    employee_count_range: str | None = Field(default=None, max_length=64)
    contact_email: str | None = Field(default=None, max_length=320)
    description: str | None = Field(default=None)
