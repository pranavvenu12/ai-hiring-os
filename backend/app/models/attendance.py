"""
AI Hiring OS — Attendance Model

Tracks daily clock-in / clock-out records per employee.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AttendanceStatus(str, PyEnum):
    PRESENT = "present"
    HALF_DAY = "half_day"
    ABSENT = "absent"


class AttendanceRecord(Base):
    """A single daily attendance record for an employee."""

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("employee_id", "attendance_date", name="uq_employee_attendance_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clock_in: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
    )
    clock_out: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    total_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    attendance_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=AttendanceStatus.PRESENT.value,
        server_default=AttendanceStatus.PRESENT.value,
    )

    # Relationships
    employee = relationship("Employee", backref="attendance_records")

    def __repr__(self) -> str:
        return f"<AttendanceRecord id={self.id} employee={self.employee_id} date={self.attendance_date}>"
