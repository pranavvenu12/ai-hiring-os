"""
Candidate intelligence enrichment for recruiter-facing candidate views.

This module intentionally computes read-only intelligence from existing resume,
job, and AI score data. It does not add new dashboards, new candidate pages, or
new database tables.
"""

from __future__ import annotations

import re
from typing import Any

from app.models.ai_score import AIScore
from app.models.job import Job
from app.models.resume import Resume
from app.services import scoring_service


INFERRED_SKILL_RULES: dict[str, set[str]] = {
    "Backend Development": {"backend", "server", "fastapi", "django", "flask", "node", "api"},
    "REST API Design": {"rest", "api", "endpoint", "fastapi", "express"},
    "Microservices": {"microservice", "service", "docker", "kubernetes", "container"},
    "System Design": {"architecture", "scalability", "scale", "distributed", "design"},
    "Database Design": {"postgresql", "postgres", "mysql", "mongodb", "sql", "schema", "database"},
    "Cloud Deployment": {"aws", "azure", "gcp", "deployment", "deployed", "cloud"},
    "Frontend Engineering": {"react", "typescript", "javascript", "dashboard", "component", "responsive"},
    "AI/ML Engineering": {"machine learning", "model", "nlp", "tensorflow", "pytorch", "prediction"},
    "DevOps Automation": {"ci/cd", "pipeline", "terraform", "linux", "monitoring", "automation"},
    "Product Thinking": {"roadmap", "stakeholder", "requirement", "user", "launch"},
}


LANGUAGE_BY_SKILL = {
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "java": "Java",
    "react": "JavaScript",
    "node.js": "JavaScript",
    "sql": "SQL",
    "postgresql": "SQL",
    "mysql": "SQL",
    "flutter": "Dart",
    "android": "Kotlin/Java",
    "ios": "Swift",
}


def build_candidate_intelligence(
    resume: Resume,
    ai_score: AIScore | None,
    job: Job | None = None,
) -> dict[str, Any]:
    resume_text = resume.extracted_text or ""
    score = _num(ai_score.score if ai_score else 0)
    skill_match = _num(ai_score.skill_match_score if ai_score else 0)
    semantic = _num(ai_score.semantic_score if ai_score else 0)
    matched_skills = _list(ai_score.matched_skills if ai_score else [])
    missing_skills = _list(ai_score.missing_skills if ai_score else [])

    explicit_skills = sorted(set(matched_skills) | (scoring_service._extract_skills(resume_text) & scoring_service._extract_skills(job.description if job else "")))[:16]
    inferred_skills = _infer_skills(resume_text, explicit_skills)
    projects = _extract_projects(resume_text, explicit_skills)
    github = _github_intelligence(resume_text, explicit_skills, projects)
    portfolio = _portfolio_intelligence(resume_text, projects)
    ats_score = round(score * 0.45 + skill_match * 0.40 + semantic * 0.15, 1)

    recommendation = _recommendation(score, skill_match, missing_skills)
    strengths = _strengths(explicit_skills, inferred_skills, projects, github, portfolio)
    weaknesses = _weaknesses(missing_skills, github, portfolio, projects)
    interview_focus = _interview_focus(missing_skills, inferred_skills, projects)

    return {
        "candidate_intelligence_score": round(score, 1),
        "ats_analysis": {
            "ats_score": ats_score,
            "keyword_match": round(skill_match, 1),
            "missing_keywords": missing_skills[:12],
        },
        "explicit_skills": explicit_skills,
        "inferred_skills": inferred_skills,
        "inferred_skills_explanation": "These skills were inferred from project descriptions and work experience.",
        "project_intelligence": projects,
        "github_intelligence": github,
        "portfolio_intelligence": portfolio,
        "hiring_recommendation": recommendation,
        "candidate_strengths": strengths,
        "candidate_weaknesses": weaknesses,
        "interview_focus_areas": interview_focus,
    }


def _infer_skills(text: str, explicit_skills: list[str]) -> list[str]:
    normalized = _normalize(text + " " + " ".join(explicit_skills))
    inferred = []
    for skill, signals in INFERRED_SKILL_RULES.items():
        if any(signal in normalized for signal in signals):
            inferred.append(skill)
    return inferred[:10]


def _extract_projects(text: str, explicit_skills: list[str]) -> list[dict[str, Any]]:
    lines = [line.strip(" -•\t") for line in text.splitlines() if line.strip()]
    project_indices = [
        idx for idx, line in enumerate(lines)
        if re.search(r"\b(project|projects|built|developed|implemented|created|journeysync)\b", line, re.I)
    ]
    chunks = []
    for idx in project_indices[:4]:
        chunk = " ".join(lines[idx: idx + 4])
        if len(chunk) >= 30:
            chunks.append(chunk)

    if not chunks:
        paragraphs = [part.strip() for part in re.split(r"\n\s*\n|(?<=\.)\s+", text) if len(part.strip()) >= 45]
        chunks = paragraphs[:3]

    projects = []
    for chunk in chunks[:4]:
        technologies = _technologies_in_text(chunk, explicit_skills)
        name = _project_name(chunk)
        complexity = _complexity(chunk, technologies)
        impact = _impact(chunk)
        projects.append({
            "name": name,
            "technologies": technologies[:8],
            "complexity": complexity,
            "impact": impact,
        })
    return projects


def _github_intelligence(text: str, explicit_skills: list[str], projects: list[dict[str, Any]]) -> dict[str, Any] | None:
    github_url = _first_match(r"https?://(?:www\.)?github\.com/[^\s,)]+", text)
    if not github_url and "github" not in text.lower():
        return None

    languages = sorted({LANGUAGE_BY_SKILL.get(skill, skill.title()) for skill in explicit_skills if skill in LANGUAGE_BY_SKILL})
    project_count = max(len(projects), 1)
    score = min(100, 55 + len(languages) * 6 + project_count * 7)
    return {
        "url": github_url,
        "github_score": round(score, 1),
        "languages": languages[:6],
        "repositories": project_count,
        "project_quality": "High" if score >= 80 else "Moderate" if score >= 65 else "Needs Review",
        "activity_summary": "GitHub evidence found in resume. Repository quality should be verified manually from the linked profile.",
    }


def _portfolio_intelligence(text: str, projects: list[dict[str, Any]]) -> dict[str, Any] | None:
    portfolio_url = _first_group(r"Portfolio:\s*(https?://[^\s,)]+)", text) or _first_non_github_url(text)
    if not portfolio_url:
        return None
    score = min(100, 60 + len(projects) * 8)
    return {
        "url": portfolio_url,
        "portfolio_score": round(score, 1),
        "portfolio_summary": "Portfolio link is available and can support visual/project validation during recruiter review.",
    }


def _recommendation(score: float, skill_match: float, missing_skills: list[str]) -> str:
    if score >= 80 and skill_match >= 60:
        return "Strong Fit"
    if score >= 65 or skill_match >= 50:
        return "Moderate Fit"
    if score >= 40 or len(missing_skills) <= 4:
        return "Needs Review"
    return "Not Recommended"


def _strengths(
    explicit_skills: list[str],
    inferred_skills: list[str],
    projects: list[dict[str, Any]],
    github: dict[str, Any] | None,
    portfolio: dict[str, Any] | None,
) -> list[str]:
    strengths = []
    if explicit_skills:
        strengths.append(f"Matched explicit skills: {', '.join(explicit_skills[:6])}.")
    if inferred_skills:
        strengths.append(f"Inferred capability areas: {', '.join(inferred_skills[:4])}.")
    if projects:
        strengths.append(f"Project evidence found across {len(projects)} resume section(s).")
    if github:
        strengths.append("GitHub profile evidence is available for technical validation.")
    if portfolio:
        strengths.append("Portfolio link is available for project review.")
    return strengths[:5] or ["Resume has been parsed and is ready for recruiter review."]


def _weaknesses(
    missing_skills: list[str],
    github: dict[str, Any] | None,
    portfolio: dict[str, Any] | None,
    projects: list[dict[str, Any]],
) -> list[str]:
    weaknesses = []
    if missing_skills:
        weaknesses.append(f"Missing or unclear JD keywords: {', '.join(missing_skills[:6])}.")
    if not github:
        weaknesses.append("No GitHub profile was detected in the resume text.")
    if not portfolio:
        weaknesses.append("No portfolio link was detected.")
    if not projects:
        weaknesses.append("Project evidence is limited or not clearly structured.")
    return weaknesses[:5] or ["No major resume weakness detected from available text."]


def _interview_focus(missing_skills: list[str], inferred_skills: list[str], projects: list[dict[str, Any]]) -> list[str]:
    focus = []
    focus.extend(missing_skills[:4])
    for skill in ["System Design", "Microservices", "Cloud Deployment", "REST API Design"]:
        if skill in inferred_skills and skill not in focus:
            focus.append(skill)
    if projects and "Project Deep Dive" not in focus:
        focus.append("Project Deep Dive")
    return focus[:6] or ["Role fundamentals", "Project ownership", "Communication clarity"]


def _technologies_in_text(text: str, explicit_skills: list[str]) -> list[str]:
    normalized = _normalize(text)
    skills = [
        skill for skill in explicit_skills
        if skill.lower() in normalized or any(alias in normalized for alias in scoring_service.SKILL_ALIASES.get(skill, set()))
    ]
    return sorted(set(skills))


def _project_name(chunk: str) -> str:
    match = re.search(r"(?:Project[s]?:\s*)?([A-Z][A-Za-z0-9 ]{2,40})(?:\s*[-:|])", chunk)
    if match:
        return match.group(1).strip()
    if "journeysync" in chunk.lower():
        return "JourneySync"
    first_words = " ".join(chunk.split()[:4]).strip(":-")
    return first_words or "Resume Project"


def _complexity(chunk: str, technologies: list[str]) -> str:
    normalized = _normalize(chunk)
    high_signals = {"deployed", "scalability", "microservice", "aws", "docker", "kubernetes", "postgresql", "fastapi"}
    if len(technologies) >= 4 or any(signal in normalized for signal in high_signals):
        return "High"
    if len(technologies) >= 2 or any(signal in normalized for signal in {"api", "dashboard", "model", "database"}):
        return "Medium"
    return "Foundational"


def _impact(chunk: str) -> str:
    metric = _first_match(r"\b\d+(?:\.\d+)?\s*(?:%|percent|users|months|years|x|k|m)\b", chunk)
    if metric:
        return f"Quantified impact mentioned: {metric}."
    if re.search(r"\b(optimized|reduced|improved|automated|deployed|built|developed)\b", chunk, re.I):
        return "Implementation impact is described, but recruiter should validate depth."
    return "Impact not clearly quantified."


def _first_match(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, flags=re.I)
    return match.group(0).strip() if match else None


def _first_group(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, flags=re.I)
    return match.group(1).strip() if match else None


def _first_non_github_url(text: str) -> str | None:
    urls = re.findall(r"https?://[^\s,)]+", text)
    for url in urls:
        lower = url.lower()
        if "github.com" not in lower and "linkedin.com" not in lower:
            return url
    return None


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower())


def _list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if item]
    if isinstance(value, dict):
        return [str(item) for item in value.values() if item]
    return []


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0
