"""
AI Hiring OS — Interview Session Model

Stores AI-powered interview sessions with transcripts, scores, and recommendations.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InterviewType(str, PyEnum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    GENERAL = "general"


class InterviewStatus(str, PyEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class InterviewRecommendation(str, PyEnum):
    STRONG_HIRE = "strong_hire"
    HIRE = "hire"
    CONSIDER = "consider"
    REJECT = "reject"


class InterviewSession(Base):
    """An AI-powered interview session for a candidate."""

    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    interview_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=InterviewType.TECHNICAL.value,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=InterviewStatus.PENDING.value,
        server_default=InterviewStatus.PENDING.value,
    )
    questions: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    transcript: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    technical_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    communication_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    # Relationships
    candidate = relationship("Resume", backref="interview_sessions")
    job = relationship("Job", backref="interview_sessions")

    def __repr__(self) -> str:
        return f"<InterviewSession id={self.id} candidate={self.candidate_id} status={self.status}>"
