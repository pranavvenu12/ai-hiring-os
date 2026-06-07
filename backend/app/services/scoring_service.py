"""
AI Hiring OS - Deterministic Resume/JD Scoring Service.

This is the non-LLM fallback scorer used when AI providers are unavailable.
It intentionally avoids treating plain Jaccard word overlap as "semantic AI".

The scorer uses a transparent hybrid rubric:
  1. normalized skill coverage with aliases, e.g. postgres == postgresql
  2. sentence embeddings + cosine similarity for semantic fit
  3. RAG-style JD requirement chunks matched to resume evidence chunks
  4. role/domain context overlap, e.g. backend, ai/ml, devops, product
  5. learning-to-rank style feature weighting

LLM providers can still override this result in evaluation_service.py when they
return structured JSON. This module is the explainable baseline.
"""

from __future__ import annotations

import hashlib
import math
import os
import re
from functools import lru_cache
from typing import Any


STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "have", "in", "is", "it", "of", "on", "or", "our", "the", "their",
    "this", "to", "using", "with", "you", "your", "we", "will",
}

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384

DEFAULT_LTR_WEIGHTS = {
    "skill_match_score": 0.30,
    "embedding_similarity_score": 0.25,
    "rag_evidence_score": 0.20,
    "context_score": 0.10,
    "experience_evidence_score": 0.10,
    "phrase_evidence_score": 0.05,
}


SKILL_ALIASES: dict[str, set[str]] = {
    "python": {"python", "py"},
    "java": {"java"},
    "javascript": {"javascript", "js", "ecmascript"},
    "typescript": {"typescript", "ts"},
    "react": {"react", "reactjs", "react.js"},
    "node.js": {"node", "nodejs", "node.js"},
    "express": {"express", "express.js", "expressjs"},
    "fastapi": {"fastapi", "fast api"},
    "flask": {"flask"},
    "django": {"django"},
    "html": {"html", "html5"},
    "css": {"css", "css3"},
    "tailwind": {"tailwind", "tailwindcss", "tailwind css"},
    "sql": {"sql"},
    "mysql": {"mysql", "my sql"},
    "postgresql": {"postgresql", "postgres", "postgre sql"},
    "mongodb": {"mongodb", "mongo db", "mongo"},
    "supabase": {"supabase"},
    "firebase": {"firebase"},
    "docker": {"docker", "containerization", "containers"},
    "kubernetes": {"kubernetes", "k8s"},
    "aws": {"aws", "amazon web services"},
    "azure": {"azure", "microsoft azure"},
    "gcp": {"gcp", "google cloud"},
    "terraform": {"terraform", "iac", "infrastructure as code"},
    "linux": {"linux", "ubuntu"},
    "ci/cd": {"ci/cd", "cicd", "ci cd", "continuous integration", "continuous deployment"},
    "monitoring": {"monitoring", "monitored", "monitor", "observability"},
    "git": {"git"},
    "github": {"github", "git hub"},
    "machine learning": {"machine learning", "ml"},
    "deep learning": {"deep learning", "dl"},
    "nlp": {"nlp", "natural language processing"},
    "llm": {"llm", "llms", "large language model", "large language models"},
    "generative ai": {"generative ai", "gen ai", "gen-ai", "genai"},
    "tensorflow": {"tensorflow", "tensor flow"},
    "pytorch": {"pytorch", "py torch"},
    "opencv": {"opencv", "open cv"},
    "hugging face": {"hugging face", "huggingface"},
    "openai": {"openai", "open ai"},
    "pandas": {"pandas"},
    "numpy": {"numpy"},
    "matplotlib": {"matplotlib"},
    "seaborn": {"seaborn"},
    "power bi": {"powerbi", "power bi"},
    "tableau": {"tableau"},
    "figma": {"figma"},
    "wireframing": {"wireframe", "wireframes", "wireframing"},
    "prototyping": {"prototype", "prototypes", "prototyping"},
    "user research": {"user research", "ux research", "research"},
    "accessibility": {"accessibility", "a11y"},
    "android": {"android", "android studio"},
    "ios": {"ios"},
    "flutter": {"flutter"},
    "react native": {"react native", "react-native"},
}


CONTEXT_TERMS: dict[str, set[str]] = {
    "backend": {"api", "backend", "server", "database", "microservice", "rest"},
    "frontend": {"frontend", "ui", "interface", "responsive", "component", "dashboard"},
    "ai_ml": {"model", "training", "prediction", "classification", "nlp", "llm", "computer vision", "pipeline"},
    "data": {"etl", "analytics", "visualization", "dashboard", "query", "dataset", "reporting"},
    "devops": {"deployment", "monitoring", "infrastructure", "container", "cloud", "pipeline"},
    "design": {"prototype", "wireframe", "user", "accessibility", "design system", "usability"},
    "product": {"roadmap", "stakeholder", "requirement", "prioritization", "launch"},
    "qa": {"testing", "test case", "automation", "bug", "quality", "regression"},
    "mobile": {"mobile", "android", "ios", "app", "firebase"},
}


EXPERIENCE_SIGNALS = {
    "built", "developed", "implemented", "designed", "deployed", "created",
    "managed", "optimized", "automated", "integrated", "analyzed", "led",
}


SECTION_SIGNALS = {
    "project", "projects", "experience", "internship", "internships",
    "responsibilities", "achievements", "certifications",
}


def calculate_deterministic_scores(
    resume_text: str,
    job_description: str,
) -> dict[str, Any]:
    """
    Compute explainable fallback scores for a resume against a JD.

    Returns:
        skill_match_score: normalized JD skill coverage percentage
        semantic_score: contextual relevance percentage, not plain Jaccard
        score: final weighted score
        matched_skills: normalized skills found in both JD and resume
        missing_skills: normalized JD skills not found in resume
        scoring_signals: extra debug/explainability signals
    """
    jd_skills = _extract_skills(job_description)
    resume_skills = _extract_skills(resume_text)
    matched_set = jd_skills & resume_skills
    missing_set = jd_skills - resume_skills

    skill_match_score = _percentage(len(matched_set), len(jd_skills))
    semantic_match = _semantic_matching_score(resume_text, job_description)
    embedding_similarity_score = semantic_match["embedding_similarity_score"]
    rag_evidence_score = semantic_match["rag_evidence_score"]
    context_score = _context_score(resume_text, job_description)
    evidence_score = _resume_evidence_score(resume_text)
    phrase_score = _phrase_overlap_score(resume_text, job_description)

    semantic_gate = _semantic_gate(skill_match_score, len(matched_set))
    embedding_similarity_score *= semantic_gate
    rag_evidence_score *= semantic_gate
    context_score *= semantic_gate
    phrase_score *= semantic_gate

    # Keep the persisted field name `semantic_score` for API compatibility, but
    # make the meaning stronger: embeddings + RAG evidence + role context.
    semantic_score = (
        embedding_similarity_score * 0.45
        + rag_evidence_score * 0.35
        + context_score * 0.10
        + phrase_score * 0.10
    )

    ranking_features = {
        "skill_match_score": skill_match_score,
        "embedding_similarity_score": embedding_similarity_score,
        "rag_evidence_score": rag_evidence_score,
        "context_score": context_score,
        "experience_evidence_score": evidence_score,
        "phrase_evidence_score": phrase_score,
    }
    final_score = _learning_to_rank_score(ranking_features)

    return {
        "skill_match_score": round(skill_match_score, 2),
        "semantic_score": round(semantic_score, 2),
        "score": round(final_score, 2),
        "matched_skills": sorted(matched_set),
        "missing_skills": sorted(missing_set)[:20],
        "scoring_signals": {
            "required_skills": sorted(jd_skills),
            "resume_skills": sorted(resume_skills),
            "embedding_similarity_score": round(embedding_similarity_score, 2),
            "rag_evidence_score": round(rag_evidence_score, 2),
            "semantic_gate": round(semantic_gate, 2),
            "context_score": round(context_score, 2),
            "experience_evidence_score": round(evidence_score, 2),
            "phrase_evidence_score": round(phrase_score, 2),
            "learning_to_rank_score": round(final_score, 2),
            "semantic_embedding_model": semantic_match["embedding_model"],
            "rag_evidence": semantic_match["rag_evidence"],
            "formula": (
                "learning-to-rank weighted blend: 30% skills + 25% embeddings "
                "+ 20% RAG evidence + 10% role context + 10% resume evidence "
                "+ 5% phrase evidence"
            ),
        },
    }


def rank_candidates_with_learning_to_rank(
    candidate_scores: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Rank candidate score dictionaries by the same learning-to-rank score used by
    resume scoring. This is useful for ranking multiple candidates for one JD.
    """
    return sorted(
        candidate_scores,
        key=lambda row: float(row.get("scoring_signals", {}).get("learning_to_rank_score", row.get("score", 0))),
        reverse=True,
    )


def train_learning_to_rank_weights(
    training_pairs: list[tuple[dict[str, float], dict[str, float]]],
    iterations: int = 30,
    learning_rate: float = 0.01,
) -> dict[str, float]:
    """
    Pairwise learning-to-rank trainer.

    Each pair is `(preferred_candidate_features, weaker_candidate_features)`.
    In production these labels should come from recruiter decisions, interview
    outcomes, or hired/rejected history. The function returns calibrated weights
    that can replace DEFAULT_LTR_WEIGHTS once enough real labels exist.
    """
    weights = DEFAULT_LTR_WEIGHTS.copy()
    if not training_pairs:
        return weights

    for _ in range(iterations):
        for preferred, weaker in training_pairs:
            preferred_score = _weighted_feature_score(preferred, weights)
            weaker_score = _weighted_feature_score(weaker, weights)
            if preferred_score <= weaker_score:
                for feature in weights:
                    delta = float(preferred.get(feature, 0)) - float(weaker.get(feature, 0))
                    weights[feature] = max(0.0, weights[feature] + learning_rate * delta / 100)

        total = sum(weights.values()) or 1.0
        weights = {feature: value / total for feature, value in weights.items()}

    return weights


def _semantic_matching_score(resume_text: str, job_description: str) -> dict[str, Any]:
    if not resume_text.strip() or not job_description.strip():
        return {
            "embedding_similarity_score": 0.0,
            "rag_evidence_score": 0.0,
            "embedding_model": "none",
            "rag_evidence": [],
        }

    full_embeddings = _embed_sentences([job_description, resume_text])
    embedding_similarity_score = _cosine_percent(full_embeddings[0], full_embeddings[1])

    jd_chunks = _chunk_text(job_description, max_chunks=8)
    resume_chunks = _chunk_text(resume_text, max_chunks=18)
    rag_evidence: list[dict[str, Any]] = []
    rag_scores: list[float] = []

    if jd_chunks and resume_chunks:
        chunk_embeddings = _embed_sentences(jd_chunks + resume_chunks)
        jd_vectors = chunk_embeddings[:len(jd_chunks)]
        resume_vectors = chunk_embeddings[len(jd_chunks):]

        for jd_chunk, jd_vector in zip(jd_chunks, jd_vectors):
            best_score = 0.0
            best_resume_chunk = ""
            for resume_chunk, resume_vector in zip(resume_chunks, resume_vectors):
                score = _cosine_percent(jd_vector, resume_vector)
                if score > best_score:
                    best_score = score
                    best_resume_chunk = resume_chunk

            rag_scores.append(best_score)
            if best_resume_chunk:
                rag_evidence.append({
                    "jd_requirement": jd_chunk[:220],
                    "resume_evidence": best_resume_chunk[:260],
                    "similarity_score": round(best_score, 2),
                })

    rag_evidence_score = sum(rag_scores) / len(rag_scores) if rag_scores else 0.0
    return {
        "embedding_similarity_score": embedding_similarity_score,
        "rag_evidence_score": rag_evidence_score,
        "embedding_model": _embedding_backend_name(),
        "rag_evidence": sorted(
            rag_evidence,
            key=lambda item: item["similarity_score"],
            reverse=True,
        )[:5],
    }


def _learning_to_rank_score(features: dict[str, float], weights: dict[str, float] | None = None) -> float:
    return _weighted_feature_score(features, weights or DEFAULT_LTR_WEIGHTS)


def _semantic_gate(skill_match_score: float, matched_skill_count: int) -> float:
    """
    Embeddings can find broad language similarity even when the resume has none
    of the required skills. This gate prevents semantic/RAG signals from making
    irrelevant resumes look like valid matches.
    """
    if matched_skill_count == 0:
        return 0.15
    if skill_match_score < 20:
        return 0.55
    if skill_match_score < 40:
        return 0.80
    return 1.0


def _weighted_feature_score(features: dict[str, float], weights: dict[str, float]) -> float:
    score = 0.0
    for feature, weight in weights.items():
        score += max(0.0, min(100.0, float(features.get(feature, 0.0)))) * weight
    return max(0.0, min(100.0, score))


def _chunk_text(text: str, max_chunks: int) -> list[str]:
    normalized_lines = [line.strip(" -\t") for line in text.splitlines() if line.strip()]
    sentence_chunks: list[str] = []
    for line in normalized_lines or [text]:
        parts = re.split(r"(?<=[.!?])\s+|[•\n\r]+", line)
        sentence_chunks.extend(part.strip() for part in parts if len(part.strip()) >= 18)

    if not sentence_chunks:
        words = _tokenize(text)
        sentence_chunks = [" ".join(words[idx: idx + 28]) for idx in range(0, len(words), 28)]

    merged: list[str] = []
    current = ""
    for chunk in sentence_chunks:
        if len(current) + len(chunk) < 360:
            current = f"{current} {chunk}".strip()
        else:
            if current:
                merged.append(current)
            current = chunk
    if current:
        merged.append(current)

    return merged[:max_chunks]


def _embed_sentences(sentences: list[str]) -> list[list[float]]:
    model = _load_embedding_model()
    if model is not None:
        vectors = model.encode(sentences, normalize_embeddings=True)
        return [[float(value) for value in vector] for vector in vectors]
    return [_hashed_embedding(sentence) for sentence in sentences]


@lru_cache(maxsize=1)
def _load_embedding_model():
    if os.getenv("ENABLE_LOCAL_EMBEDDINGS", "false").strip().lower() not in {"1", "true", "yes", "on"}:
        return None

    try:
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer(EMBEDDING_MODEL_NAME)
    except Exception:
        return None


def _embedding_backend_name() -> str:
    if _load_embedding_model() is not None:
        return EMBEDDING_MODEL_NAME
    return "hashed-fallback-embedding"


def _hashed_embedding(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSIONS
    tokens = _tokenize(text)
    for idx, token in enumerate(tokens):
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "big") % EMBEDDING_DIMENSIONS
        sign = 1.0 if digest[4] % 2 else -1.0
        weight = 1.0 + min(idx / 200, 0.25)
        vector[bucket] += sign * weight

    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def _cosine_percent(left: list[float], right: list[float]) -> float:
    if not left or not right:
        return 0.0
    size = min(len(left), len(right))
    dot = sum(left[idx] * right[idx] for idx in range(size))
    left_norm = math.sqrt(sum(value * value for value in left[:size]))
    right_norm = math.sqrt(sum(value * value for value in right[:size]))
    if not left_norm or not right_norm:
        return 0.0
    cosine = dot / (left_norm * right_norm)
    return max(0.0, min(100.0, (cosine + 1.0) * 50.0))


def _extract_skills(text: str) -> set[str]:
    normalized = _normalize(text)
    skills: set[str] = set()
    for canonical, aliases in SKILL_ALIASES.items():
        if any(_contains_skill_phrase(normalized, alias) for alias in aliases):
            skills.add(canonical)
    return skills


def _context_score(resume_text: str, job_description: str) -> float:
    resume_context = _extract_context_terms(resume_text)
    jd_context = _extract_context_terms(job_description)
    if not jd_context:
        return 0.0

    matched_categories = 0
    for category, jd_terms in jd_context.items():
        resume_terms = resume_context.get(category, set())
        if resume_terms & jd_terms:
            matched_categories += 1

    category_score = _percentage(matched_categories, len(jd_context))

    jd_terms_all = set().union(*jd_context.values()) if jd_context else set()
    resume_terms_all = set().union(*resume_context.values()) if resume_context else set()
    term_score = _percentage(len(jd_terms_all & resume_terms_all), len(jd_terms_all))
    return category_score * 0.55 + term_score * 0.45


def _extract_context_terms(text: str) -> dict[str, set[str]]:
    normalized = _normalize(text)
    result: dict[str, set[str]] = {}
    for category, terms in CONTEXT_TERMS.items():
        found = {term for term in terms if _contains_phrase(normalized, term)}
        if found:
            result[category] = found
    return result


def _resume_evidence_score(resume_text: str) -> float:
    tokens = _tokenize(resume_text)
    normalized = _normalize(resume_text)

    section_hits = len({signal for signal in SECTION_SIGNALS if signal in tokens})
    action_hits = len({signal for signal in EXPERIENCE_SIGNALS if signal in tokens})
    metric_hits = len(re.findall(r"\b\d+(?:\.\d+)?\s*(?:%|percent|users|months|years|x|k|m)?\b", normalized))
    link_hits = len(re.findall(r"https?://|github|linkedin", normalized))

    section_score = min(section_hits / 4, 1.0) * 30
    action_score = min(action_hits / 6, 1.0) * 35
    metric_score = min(metric_hits / 4, 1.0) * 20
    link_score = min(link_hits / 2, 1.0) * 15
    return section_score + action_score + metric_score + link_score


def _phrase_overlap_score(resume_text: str, job_description: str) -> float:
    resume_phrases = _important_phrases(resume_text)
    jd_phrases = _important_phrases(job_description)
    if not jd_phrases:
        return 0.0
    return _percentage(len(resume_phrases & jd_phrases), len(jd_phrases))


def _important_phrases(text: str) -> set[str]:
    tokens = [token for token in _tokenize(text) if token not in STOP_WORDS]
    phrases = set(tokens)
    for size in (2, 3):
        for idx in range(0, max(len(tokens) - size + 1, 0)):
            phrase = " ".join(tokens[idx: idx + size])
            if len(phrase) >= 6:
                phrases.add(phrase)
    return phrases


def _tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z0-9+#.]+", text.lower())
    return [word.strip(".") for word in words if len(word.strip(".")) > 1 and word not in STOP_WORDS]


def _normalize(text: str) -> str:
    text = text.lower()
    text = text.replace("react.js", "reactjs")
    text = text.replace("node.js", "nodejs")
    text = re.sub(r"[/.-]", " ", text)
    text = text.replace("c i c d", "ci cd")
    text = re.sub(r"[^a-z0-9+#%]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _contains_phrase(text: str, phrase: str) -> bool:
    normalized_phrase = _normalize(phrase)
    return bool(re.search(rf"(?<![a-z0-9+#]){re.escape(normalized_phrase)}(?![a-z0-9+#])", text))


def _contains_skill_phrase(text: str, phrase: str) -> bool:
    normalized_phrase = _normalize(phrase)
    pattern = rf"(?<![a-z0-9+#]){re.escape(normalized_phrase)}(?![a-z0-9+#])"
    for match in re.finditer(pattern, text):
        prefix = text[max(0, match.start() - 120): match.start()].strip()
        current_clause = re.split(r"[.;:]", prefix)[-1]
        if re.search(r"\b(no|not|without|missing|limited)\b", current_clause):
            continue
        return True
    return False


def _percentage(part: int | float, whole: int | float) -> float:
    if not whole:
        return 0.0
    return max(0.0, min(100.0, float(part) / float(whole) * 100))
