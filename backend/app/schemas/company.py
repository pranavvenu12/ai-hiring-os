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

    model_config = {"from_attributes": True}


# ── Requests ─────────────────────────────────────────────────────


class CompanyCreate(BaseModel):
    """Payload to create a new company."""

    name: str = Field(..., min_length=1, max_length=255)
