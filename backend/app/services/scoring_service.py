"""
AI Hiring OS — Deterministic Scoring Service

Provides non-LLM based scoring using keyword matching and token similarity.
"""

from __future__ import annotations

import re
from typing import Dict, List, Set, Tuple


def calculate_deterministic_scores(
    resume_text: str,
    job_description: str
) -> Dict[str, any]:
    """
    Compute scores based on keyword overlap and token similarity.
    
    Returns:
        Dict with skill_match_score, semantic_score, final_score, matched_skills, missing_skills.
    """
    # Clean and tokenize
    resume_words = _tokenize(resume_text)
    job_words = _tokenize(job_description)
    
    # 1. Skill Match Score (Based on JD keywords)
    # Extract potential skills from JD (simple heuristic: capitalized words or words with special chars)
    # For a production app, we'd use a predefined skills taxonomy.
    # Here we'll treat all unique words in JD as "required" for simplicity in this logic.
    jd_keywords = _extract_keywords(job_description)
    resume_keywords = _extract_keywords(resume_text)
    
    matched_set = jd_keywords.intersection(resume_keywords)
    missing_set = jd_keywords.difference(resume_keywords)
    
    skill_match_score = 0.0
    if jd_keywords:
        skill_match_score = (len(matched_set) / len(jd_keywords)) * 100
        
    # 2. Semantic Score (Token Set Overlap / Jaccard Similarity)
    intersection = resume_words.intersection(job_words)
    union = resume_words.union(job_words)
    
    semantic_score = 0.0
    if union:
        semantic_score = (len(intersection) / len(union)) * 100
        
    # 3. Final Weighted Score
    # Weight: 60% Skills, 40% Semantic overlap
    final_score = (skill_match_score * 0.6) + (semantic_score * 0.4)
    
    return {
        "skill_match_score": round(skill_match_score, 2),
        "semantic_score": round(semantic_score, 2),
        "score": round(final_score, 2),
        "matched_skills": list(matched_set),
        "missing_skills": list(missing_set)[:20],  # Limit missing skills for brevity
    }


def _tokenize(text: str) -> Set[str]:
    """Convert text to a set of unique, lowercase alphanumeric tokens."""
    words = re.findall(r'\w+', text.lower())
    # Filter out common stop words if needed, but for simple overlap this is fine
    stop_words = {'and', 'the', 'is', 'in', 'at', 'of', 'with', 'a', 'for', 'to'}
    return set(w for w in words if len(w) > 2 and w not in stop_words)


def _extract_keywords(text: str) -> Set[str]:
    """Extract potential technical keywords (capitalized words, abbreviations)."""
    # Look for common tech terms patterns or just capitalized words
    # In a real app, this would use a Skills DB.
    keywords = set(re.findall(r'\b[A-Z][a-zA-Z0-9+#.]+\b', text))
    # Also add lowercase tokens for matching
    return {k.lower() for k in keywords}
