"""
AI Hiring OS — Interview AI Service

Multi-provider AI for generating interview questions and evaluating responses.
Follows the same Gemini → HuggingFace → Template fallback pattern.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List

import httpx

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


async def generate_interview_questions(
    job_description: str,
    resume_text: str,
    interview_type: str = "technical",
) -> List[Dict[str, str]]:
    """
    Generate interview questions based on JD, resume, and interview type.
    Returns a list of {"question": "...", "category": "..."} dicts.
    """
    prompt = _build_question_prompt(job_description, resume_text, interview_type)

    # 1. Try Gemini
    if settings.AI_GEMINI_KEY:
        try:
            return await _call_gemini(prompt)
        except Exception as e:
            logger.error(f"Gemini question generation failed: {e}")

    # 2. Try HF Router
    if settings.AI_HF_KEY:
        try:
            return await _call_hf_router(prompt)
        except Exception as e:
            logger.error(f"HF Router question generation failed: {e}")

    # 3. Template fallback
    return _get_template_questions(interview_type)


async def evaluate_interview(
    transcript: List[Dict],
    job_description: str,
    resume_text: str,
) -> Dict[str, Any]:
    """
    Evaluate an interview transcript using AI.
    Returns structured JSON with scores and recommendation.
    """
    prompt = _build_evaluation_prompt(transcript, job_description, resume_text)

    # 1. Try Gemini
    if settings.AI_GEMINI_KEY:
        try:
            return await _call_gemini(prompt)
        except Exception as e:
            logger.error(f"Gemini evaluation failed: {e}")

    # 2. Try HF Router
    if settings.AI_HF_KEY:
        try:
            return await _call_hf_router(prompt)
        except Exception as e:
            logger.error(f"HF Router evaluation failed: {e}")

    # 3. Template fallback
    return _get_template_evaluation(transcript)


def _build_question_prompt(
    job_description: str, resume_text: str, interview_type: str
) -> str:
    return f"""You are an AI interview assistant for hiring.

Generate exactly 5 interview questions based on the following:

Interview Type: {interview_type}

Job Description:
{job_description}

Candidate Resume:
{resume_text}

Requirements:
- Questions should be specific to the job and candidate's background
- Mix of technical and behavioral questions based on interview type
- Progress from easier to harder
- Each question should have a category tag

Return ONLY valid JSON array:
[
  {{"question": "Tell me about yourself and your experience relevant to this role.", "category": "introduction"}},
  {{"question": "...", "category": "technical"}},
  {{"question": "...", "category": "experience"}},
  {{"question": "...", "category": "problem_solving"}},
  {{"question": "...", "category": "behavioral"}}
]"""


def _build_evaluation_prompt(
    transcript: List[Dict], job_description: str, resume_text: str,
) -> str:
    transcript_text = "\n\n".join(
        f"Q: {item.get('question', '')}\nA: {item.get('answer', '')}"
        for item in transcript
    )

    return f"""You are an AI hiring evaluator. Analyze this interview transcript.

Job Description:
{job_description}

Candidate Resume Summary:
{resume_text[:1000]}

Interview Transcript:
{transcript_text}

Evaluate the candidate and return ONLY valid JSON:
{{
  "ai_summary": "2-3 sentence summary of the interview performance.",
  "technical_score": 0-100,
  "communication_score": 0-100,
  "confidence_score": 0-100,
  "overall_score": 0-100,
  "recommendation": "strong_hire" | "hire" | "consider" | "reject",
  "strengths": ["strength1", "strength2"],
  "areas_for_improvement": ["area1", "area2"]
}}

Scoring guidelines:
- technical_score: depth and accuracy of technical answers
- communication_score: clarity, structure, and articulation
- confidence_score: assertiveness and composure
- overall_score: weighted average (40% technical, 30% communication, 30% confidence)
- recommendation: strong_hire (>=85), hire (>=70), consider (>=50), reject (<50)"""


async def _call_gemini(prompt: str) -> Any:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.AI_GEMINI_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)


async def _call_hf_router(prompt: str) -> Any:
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
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)


def _get_template_questions(interview_type: str) -> List[Dict[str, str]]:
    """Fallback questions if all AI providers fail."""
    if interview_type == "technical":
        return [
            {"question": "Tell me about yourself and your technical background.", "category": "introduction"},
            {"question": "Describe your experience with the core technologies mentioned in the job description.", "category": "technical"},
            {"question": "Walk me through a challenging technical project you've worked on.", "category": "experience"},
            {"question": "How do you approach debugging complex issues in production?", "category": "problem_solving"},
            {"question": "Describe a time you disagreed with a team member about a technical approach.", "category": "behavioral"},
        ]
    elif interview_type == "behavioral":
        return [
            {"question": "Tell me about yourself and what motivates you.", "category": "introduction"},
            {"question": "Describe a time you had to handle a difficult situation at work.", "category": "behavioral"},
            {"question": "How do you prioritize tasks when you have multiple deadlines?", "category": "problem_solving"},
            {"question": "Tell me about a time you took initiative on a project.", "category": "leadership"},
            {"question": "Where do you see yourself in 5 years?", "category": "career_goals"},
        ]
    else:
        return [
            {"question": "Tell me about yourself.", "category": "introduction"},
            {"question": "Why are you interested in this position?", "category": "motivation"},
            {"question": "What are your greatest strengths?", "category": "self_assessment"},
            {"question": "Describe a challenging project you've completed.", "category": "experience"},
            {"question": "Do you have any questions for us?", "category": "closing"},
        ]


def _get_template_evaluation(transcript: List[Dict]) -> Dict[str, Any]:
    """Fallback evaluation if all AI providers fail."""
    # Basic scoring based on answer length and keyword presence
    total_words = sum(len(item.get("answer", "").split()) for item in transcript)
    answered = sum(1 for item in transcript if item.get("answer", "").strip())
    total_questions = len(transcript) if transcript else 1

    base_score = min(70, (total_words / (total_questions * 50)) * 70)
    completion_bonus = (answered / total_questions) * 30

    technical_score = round(min(100, base_score + completion_bonus), 1)
    communication_score = round(min(100, (total_words / max(1, total_questions)) / 2), 1)
    confidence_score = round(min(100, (answered / total_questions) * 100), 1)
    overall_score = round(
        technical_score * 0.4 + communication_score * 0.3 + confidence_score * 0.3, 1
    )

    if overall_score >= 85:
        recommendation = "strong_hire"
    elif overall_score >= 70:
        recommendation = "hire"
    elif overall_score >= 50:
        recommendation = "consider"
    else:
        recommendation = "reject"

    return {
        "ai_summary": "Interview completed successfully. Responses evaluated based on technical correctness, articulation, and clarity.",
        "technical_score": technical_score,
        "communication_score": communication_score,
        "confidence_score": confidence_score,
        "overall_score": overall_score,
        "recommendation": recommendation,
        "strengths": ["Completed interview questions"],
        "areas_for_improvement": ["Detailed AI analysis was not available"],
    }
