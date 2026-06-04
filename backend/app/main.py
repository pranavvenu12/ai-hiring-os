"""
AI Hiring OS — FastAPI Application Entry Point

Production-grade multi-tenant HR platform backend.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import agent, auth, companies, health, users, jobs, employees, attendance, performance, interviews, payroll, realtime
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine

settings = get_settings()


# ── Lifespan (startup / shutdown) ────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup (dev convenience); dispose engine on shutdown."""
    # Import models so they are registered with Base.metadata
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS department VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type VARCHAR(80)"))
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_range VARCHAR(120)"))
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS open_until TIMESTAMPTZ"))
        await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'open'"))
        await conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS interview_transcript TEXT"))
        await conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS interview_metrics JSONB"))
        await conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS audio_url VARCHAR(1024)"))
        await conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS fluency_score FLOAT"))
        await conn.execute(text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS hiring_status VARCHAR(50) NOT NULL DEFAULT 'applied'"))
        await conn.execute(text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS email VARCHAR(320)"))
        await conn.execute(text("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS phone VARCHAR(40)"))
        await conn.execute(text("ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS basic_salary FLOAT NOT NULL DEFAULT 0"))
        await conn.execute(text("ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS allowances FLOAT NOT NULL DEFAULT 0"))
        await conn.execute(text("ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS bonuses FLOAT NOT NULL DEFAULT 0"))
        await conn.execute(text("ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS manual_deductions FLOAT NOT NULL DEFAULT 0"))
        await conn.execute(text("ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS attendance_deductions FLOAT NOT NULL DEFAULT 0"))
        await conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_companies_name_lower_unique
            ON companies (lower(name));
        """))
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'uq_employee_company_code'
                ) THEN
                    ALTER TABLE employees
                    ADD CONSTRAINT uq_employee_company_code UNIQUE (company_id, employee_code);
                END IF;
            END $$;
        """))
    yield
    await engine.dispose()


# ── Application factory ──────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Multi-tenant AI-powered HR platform.\n\n"
        "**Phase 5** — Intelligent HRMS Expansion: Employee Management, "
        "Attendance, Performance Reviews, and AI Interview Assistant."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS Middleware ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ────────────────────────────────────────────

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(performance.router)
app.include_router(interviews.router)
app.include_router(payroll.router)
app.include_router(realtime.router)
app.include_router(agent.router)


# ── Root redirect ───────────────────────────────────────────────


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API documentation."""
    return {
        "service": settings.APP_NAME,
        "docs": "/docs",
        "health": "/health",
    }
