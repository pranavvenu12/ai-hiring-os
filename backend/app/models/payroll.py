"""
AI Hiring OS - Payroll Model

Stores generated salary records derived from attendance for each employee.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PayrollStatus(str, PyEnum):
    DRAFT = "draft"
    GENERATED = "generated"
    APPROVED = "approved"
    PAID = "paid"


class PayrollRecord(Base):
    """Monthly payroll record scoped to a tenant company and employee."""

    __tablename__ = "payroll_records"
    __table_args__ = (
        UniqueConstraint("employee_id", "month", "year", name="uq_employee_payroll_month"),
        Index("ix_payroll_company_period", "company_id", "year", "month"),
        Index("ix_payroll_employee_period", "employee_id", "year", "month"),
        Index("ix_payroll_company_status", "company_id", "status"),
    )

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
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    base_salary: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    basic_salary: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    allowances: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    bonuses: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    manual_deductions: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    attendance_deductions: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    present_days: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    half_days: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    absent_days: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    working_days: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    gross_salary: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    deductions: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    net_salary: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=PayrollStatus.GENERATED.value,
        server_default=PayrollStatus.GENERATED.value,
    )
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    company = relationship("Company", back_populates="payroll_records")
    employee = relationship("Employee", back_populates="payroll_records")

    def __repr__(self) -> str:
        return f"<PayrollRecord id={self.id} employee={self.employee_id} {self.month}/{self.year}>"
