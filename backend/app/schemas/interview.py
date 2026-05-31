"""
AI Hiring OS — Interview Schemas

Pydantic models for AI interview request / response payloads.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel

from app.models.interview import InterviewType


# ── Requests ─────────────────────────────────────────────────────


class InterviewStart(BaseModel):
    """Payload to start an AI interview session."""

    candidate_id: uuid.UUID
    job_id: uuid.UUID
    interview_type: str = InterviewType.TECHNICAL.value


class InterviewAnswer(BaseModel):
    """Payload to submit an answer to an interview question."""

    question_index: int
    answer_text: str


# ── Responses ────────────────────────────────────────────────────


class InterviewQuestionOut(BaseModel):
    """A single interview question."""

    index: int
    question: str
    category: Optional[str] = None


class InterviewOut(BaseModel):
    """Public representation of an interview session."""

    id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID
    company_id: uuid.UUID
    interview_type: str
    status: str
    questions: Optional[List[Dict]] = None
    transcript: Optional[List[Dict]] = None
    ai_summary: Optional[str] = None
    technical_score: Optional[float] = None
    communication_score: Optional[float] = None
    confidence_score: Optional[float] = None
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    created_at: datetime
    candidate_name: Optional[str] = None

    model_config = {"from_attributes": True}


class InterviewSummary(BaseModel):
    """Company-wide interview analytics."""

    total_interviews: int = 0
    completed_interviews: int = 0
    completion_rate: float = 0.0
    avg_technical_score: float = 0.0
    avg_communication_score: float = 0.0
    avg_confidence_score: float = 0.0
    avg_overall_score: float = 0.0
    interviews: List[InterviewOut] = []
