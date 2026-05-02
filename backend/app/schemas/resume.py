"""
AI Hiring OS — Resume Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class ResumeBase(BaseModel):
    candidate_name: str
    file_url: str


class ResumeOut(ResumeBase):
    """Public representation of a resume."""
    id: uuid.UUID
    job_id: uuid.UUID
    extracted_text: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
