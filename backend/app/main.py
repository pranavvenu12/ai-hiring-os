"""
AI Hiring OS — FastAPI Application Entry Point

Production-grade multi-tenant HR platform backend.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, companies, health, users, jobs, employees, attendance, performance, interviews, payroll
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


# ── Root redirect ───────────────────────────────────────────────


@app.get("/", include_in_schema=False)
async def root():
    """Redirect root to API documentation."""
    return {
        "service": settings.APP_NAME,
        "docs": "/docs",
        "health": "/health",
    }
