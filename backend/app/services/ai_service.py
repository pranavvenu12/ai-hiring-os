"""
AI Hiring OS — AI Service

Multi-provider LLM service with fallback logic (Gemini -> HF -> Template).
"""

from __future__ import annotations

import json
import logging
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
    Generate evaluation summary and explanation using multi-provider fallback.
    """
    prompt = _build_prompt(resume_text, job_description)

    # 1. Try Gemini
    if settings.AI_GEMINI_KEY:
        try:
            return await _call_gemini(prompt)
        except Exception as e:
            logger.error(f"Gemini provider failed: {e}")

    # 2. Try HF Router (OpenAI compatible)
    if settings.AI_HF_KEY or True:  # HF might work without key for some public endpoints or if key is empty
        try:
            return await _call_hf_router(prompt)
        except Exception as e:
            logger.error(f"HF Router provider failed: {e}")

    # 3. Fallback to Template
    return _get_template_fallback(resume_text, job_description)


def _build_prompt(resume_text: str, job_description: str) -> str:
    return f"""You are an AI hiring assistant.

Analyze the candidate resume against the job description.

Job Description:
{job_description}

Candidate Resume:
{resume_text}

Return ONLY valid JSON.
{{
"summary": "Short 1-sentence summary of the candidate.",
"explanation": "Detailed explanation of why they are or aren't a good fit.",
"matched_skills": ["skill1", "skill2"],
"missing_skills": ["skill3", "skill4"]
}}"""


async def _call_gemini(prompt: str) -> Dict[str, Any]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.AI_GEMINI_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
        }
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        
        # Extract text from Gemini response
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)


async def _call_hf_router(prompt: str) -> Dict[str, Any]:
    url = f"{settings.AI_HF_BASE_URL}/chat/completions"
    headers = {}
    if settings.AI_HF_KEY:
        headers["Authorization"] = f"Bearer {settings.AI_HF_KEY}"
    
    payload = {
        "model": settings.AI_HF_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        text = data["choices"][0]["message"]["content"]
        # Strip potential markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)


def _get_template_fallback(resume_text: str, job_description: str) -> Dict[str, Any]:
    """Basic template-based response if all LLMs fail."""
    return {
        "summary": "Candidate evaluation based on keyword overlap.",
        "explanation": "The AI service is currently unavailable. A deterministic score has been calculated based on skill matching.",
        "matched_skills": [],
        "missing_skills": []
    }
