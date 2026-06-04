"""Schemas for recruiter copilot agent endpoints."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AgentAskRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=1000)


class AgentAskResponse(BaseModel):
    answer: str
    tools_used: list[str] = Field(default_factory=list)
    suggested_actions: list[dict[str, Any]] = Field(default_factory=list)


class AgentToolTrace(BaseModel):
    tool_name: str
    input: dict[str, Any] = Field(default_factory=dict)
    reasoning: str | None = None
