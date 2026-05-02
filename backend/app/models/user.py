"""
AI Hiring OS — User Model

Represents a platform user linked to Supabase Auth and a tenant company.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.security import Role
from app.db.base import Base


class User(Base):
    """Application user — always scoped to a company (tenant)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default=Role.EMPLOYEE.value
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supabase_uid: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True,
        comment="Maps to the Supabase Auth user ID.",
    )
    is_active: Mapped[bool] = mapped_column(
        default=True, server_default=text("true"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    # Relationships
    company = relationship("Company", back_populates="users", lazy="joined")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
