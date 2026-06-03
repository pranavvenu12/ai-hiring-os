"""
AI Hiring OS — Candidate Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CandidateOut(BaseModel):
    """Resume info with AI scores and insights."""
    
    resume_id: uuid.UUID
    candidate_name: str
    file_url: str
    created_at: datetime
    
    # AI Scores
    score: float = 0.0
    skill_match_score: float = 0.0
    semantic_score: float = 0.0
    status: str
    
    # AI Insights
    summary: Optional[str] = None
    explanation: Optional[str] = None
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    hiring_status: str = "applied"
    email: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True
