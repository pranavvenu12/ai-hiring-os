"""
AI Hiring OS — Employee Model

Represents an employee within a tenant company.
Supports full lifecycle management with manager hierarchy.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EmploymentType(str, PyEnum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"


class EmployeeStatus(str, PyEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"


class Employee(Base):
    """An employee record scoped to a company (tenant)."""

    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        comment="Optional link to platform user account.",
    )
    employee_code: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(
        String(320), nullable=False, index=True,
    )
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    department: Mapped[str | None] = mapped_column(
        String(100), nullable=True, index=True,
    )
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
    )
    joining_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    employment_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=EmploymentType.FULL_TIME.value,
        server_default=EmploymentType.FULL_TIME.value,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=EmployeeStatus.ACTIVE.value,
        server_default=EmployeeStatus.ACTIVE.value,
    )
    profile_photo: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    # Relationships
    company = relationship("Company", backref="employees")
    user = relationship("User", backref="employee_profile", uselist=False)
    manager = relationship("Employee", remote_side=[id], backref="direct_reports")
    payroll_records = relationship("PayrollRecord", back_populates="employee", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Employee id={self.id} name={self.full_name!r} code={self.employee_code}>"
