"""
AI Hiring OS — Health Check Route
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Return server health status."""
    return {
        "status": "healthy",
        "service": "AI Hiring OS",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
