"""
AI Hiring OS — AI Service

Multi-provider LLM service with fallback logic (Gemini → HF → Deterministic).
The AI is asked to provide BOTH a match score AND qualitative insights.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict

import httpx

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


async def generate_ai_insights(
    resume_text: str,
    job_description: str
) -> Dict[str, Any]:
    """
    Generate an AI match score + evaluation insights using multi-provider fallback.
    Returns dict with: score, skill_match_score, semantic_score, summary, explanation,
    matched_skills, missing_skills.
    """
    prompt = _build_prompt(resume_text, job_description)

    # 1. Try Gemini
    if settings.AI_GEMINI_KEY:
        try:
            result = await _call_gemini(prompt)
            if result and result.get("score") is not None:
                logger.info(f"Gemini scoring succeeded: score={result.get('score')}")
                return result
        except Exception as e:
            logger.error(f"Gemini provider failed: {e}")

    # 2. Try HF Router (OpenAI compatible)
    if settings.AI_HF_KEY:
        try:
            result = await _call_hf_router(prompt)
            if result and result.get("score") is not None:
                logger.info(f"HF Router scoring succeeded: score={result.get('score')}")
                return result
        except Exception as e:
            logger.error(f"HF Router provider failed: {e}")

    # 3. No LLM available — return None so caller falls back to deterministic
    logger.warning("All AI providers failed — using deterministic scoring only.")
    return None


def _build_prompt(resume_text: str, job_description: str) -> str:
    # Truncate to avoid token limits
    jd_trimmed = job_description[:3000]
    resume_trimmed = resume_text[:4000]

    return f"""You are an expert technical recruiter AI. Analyze the candidate resume against the job description and return a structured JSON evaluation.

JOB DESCRIPTION:
{jd_trimmed}

CANDIDATE RESUME:
{resume_trimmed}

Evaluate the candidate and return ONLY valid JSON (no markdown, no code blocks):
{{
  "score": <overall_match_percentage 0-100, float>,
  "skill_match_score": <technical_skills_match_percentage 0-100, float>,
  "semantic_score": <contextual_relevance_percentage 0-100, float>,
  "summary": "<1-2 sentence candidate summary focusing on relevance to this role>",
  "explanation": "<2-3 sentence detailed explanation of why this candidate is or isn't a strong fit, citing specific evidence from the resume>",
  "matched_skills": ["<skill1>", "<skill2>", "<skill3>"],
  "missing_skills": ["<missing1>", "<missing2>", "<missing3>"]
}}

Scoring criteria:
- score: Holistic match considering skills, experience level, domain relevance, and role fit (0-100)
- skill_match_score: How many required technical skills from the JD appear in the resume (0-100)  
- semantic_score: How contextually relevant is the candidate's experience domain to this role (0-100)
- matched_skills: List of specific technical skills/technologies from JD found in the resume
- missing_skills: List of important JD requirements NOT found in the resume

Be accurate and specific. Do not be overly generous."""


async def _call_gemini(prompt: str) -> Dict[str, Any]:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={settings.AI_GEMINI_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
        },
    }
    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()

        # Extract text from Gemini response
        text = data["candidates"][0]["content"]["parts"][0]["text"]

        # Strip markdown code fences if present
        text = _strip_code_fences(text)

        parsed = json.loads(text)
        return _normalise_result(parsed)


async def _call_hf_router(prompt: str) -> Dict[str, Any]:
    url = f"{settings.AI_HF_BASE_URL}/chat/completions"
    headers = {}
    if settings.AI_HF_KEY:
        headers["Authorization"] = f"Bearer {settings.AI_HF_KEY}"

    payload = {
        "model": settings.AI_HF_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 1024,
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

        text = data["choices"][0]["message"]["content"]
        text = _strip_code_fences(text)
        parsed = json.loads(text)
        return _normalise_result(parsed)


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences from LLM output."""
    text = text.strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```")[0].strip()
    return text


def _normalise_result(parsed: Dict) -> Dict[str, Any]:
    """Clamp scores to [0, 100] and ensure all expected keys exist."""
    def clamp(v, lo=0.0, hi=100.0):
        try:
            return round(max(lo, min(hi, float(v))), 2)
        except (TypeError, ValueError):
            return 0.0

    return {
        "score": clamp(parsed.get("score", 0)),
        "skill_match_score": clamp(parsed.get("skill_match_score", 0)),
        "semantic_score": clamp(parsed.get("semantic_score", 0)),
        "summary": str(parsed.get("summary", "")).strip(),
        "explanation": str(parsed.get("explanation", "")).strip(),
        "matched_skills": [str(s) for s in parsed.get("matched_skills", []) if s],
        "missing_skills": [str(s) for s in parsed.get("missing_skills", []) if s],
    }
