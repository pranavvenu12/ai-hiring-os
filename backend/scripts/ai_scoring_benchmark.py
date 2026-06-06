from __future__ import annotations

import json
import sys
from itertools import combinations
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.services.scoring_service import calculate_deterministic_scores


BENCHMARK_CASES = [
    {
        "role": "Full Stack Developer",
        "jd": "Python FastAPI PostgreSQL Docker AWS React TypeScript",
        "candidates": [
            {
                "label": "strong",
                "target_score": 90,
                "resume": "Python FastAPI PostgreSQL Docker AWS React TypeScript",
                "expected_present_skills": {"python", "fastapi", "postgresql", "docker", "aws", "react", "typescript"},
            },
            {
                "label": "partial",
                "target_score": 35,
                "resume": "Python React JavaScript HTML CSS",
                "expected_present_skills": {"python", "react"},
            },
            {
                "label": "weak",
                "target_score": 5,
                "resume": "Sales Marketing Excel",
                "expected_present_skills": set(),
            },
        ],
    },
    {
        "role": "AI ML Engineer",
        "jd": "Python TensorFlow PyTorch NLP MLOps Docker AWS",
        "candidates": [
            {
                "label": "strong",
                "target_score": 90,
                "resume": "Python TensorFlow PyTorch NLP Docker AWS",
                "expected_present_skills": {"python", "tensorflow", "pytorch", "nlp", "docker", "aws"},
            },
            {
                "label": "partial",
                "target_score": 35,
                "resume": "Python Data Analysis Pandas SQL",
                "expected_present_skills": {"python"},
            },
            {
                "label": "weak",
                "target_score": 5,
                "resume": "Figma UI Branding",
                "expected_present_skills": set(),
            },
        ],
    },
    {
        "role": "UI UX Designer",
        "jd": "Figma Prototyping Wireframes Research Accessibility",
        "candidates": [
            {
                "label": "strong",
                "target_score": 90,
                "resume": "Figma Prototyping Wireframes Research Accessibility",
                "expected_present_skills": {"figma", "prototyping", "wireframes", "research", "accessibility"},
            },
            {
                "label": "partial",
                "target_score": 35,
                "resume": "Figma Branding Visual Design",
                "expected_present_skills": {"figma"},
            },
            {
                "label": "weak",
                "target_score": 5,
                "resume": "Java Spring PostgreSQL",
                "expected_present_skills": set(),
            },
        ],
    },
    {
        "role": "DevOps Engineer",
        "jd": "Docker Kubernetes AWS Terraform Linux Monitoring",
        "candidates": [
            {
                "label": "strong",
                "target_score": 90,
                "resume": "Docker Kubernetes AWS Terraform Linux Monitoring",
                "expected_present_skills": {"docker", "kubernetes", "aws", "terraform", "linux", "monitoring"},
            },
            {
                "label": "partial",
                "target_score": 35,
                "resume": "AWS Linux Bash Monitoring",
                "expected_present_skills": {"aws", "linux", "monitoring"},
            },
            {
                "label": "weak",
                "target_score": 5,
                "resume": "Flutter Android iOS Firebase",
                "expected_present_skills": set(),
            },
        ],
    },
]


LABEL_ORDER = {"weak": 0, "partial": 1, "strong": 2}


def score_bucket(score: float) -> str:
    if score >= 70:
        return "strong"
    if score >= 10:
        return "partial"
    return "weak"


def main() -> None:
    rows = []
    pairwise_total = 0
    pairwise_correct = 0
    skill_tp = 0
    skill_fp = 0
    skill_fn = 0
    abs_errors = []

    for group in BENCHMARK_CASES:
        role_rows = []
        for candidate in group["candidates"]:
            result = calculate_deterministic_scores(candidate["resume"], group["jd"])
            matched = set(result["matched_skills"])
            expected = set(candidate["expected_present_skills"])
            skill_tp += len(matched & expected)
            skill_fp += len(matched - expected)
            skill_fn += len(expected - matched)
            abs_errors.append(abs(float(result["score"]) - candidate["target_score"]))
            row = {
                "role": group["role"],
                "expected_label": candidate["label"],
                "predicted_label": score_bucket(float(result["score"])),
                "target_score": candidate["target_score"],
                "score": float(result["score"]),
                "skill_match_score": float(result["skill_match_score"]),
                "semantic_score": float(result["semantic_score"]),
                "matched_skills": sorted(result["matched_skills"]),
                "missing_skills": sorted(result["missing_skills"]),
            }
            rows.append(row)
            role_rows.append(row)

        for left, right in combinations(role_rows, 2):
            expected_cmp = LABEL_ORDER[left["expected_label"]] > LABEL_ORDER[right["expected_label"]]
            predicted_cmp = left["score"] > right["score"]
            pairwise_total += 1
            if expected_cmp == predicted_cmp:
                pairwise_correct += 1

    classification_correct = sum(1 for row in rows if row["expected_label"] == row["predicted_label"])
    strong_correct = sum(
        1
        for row in rows
        if (row["expected_label"] == "strong") == (row["score"] >= 70)
    )
    precision = skill_tp / (skill_tp + skill_fp) if skill_tp + skill_fp else 0
    recall = skill_tp / (skill_tp + skill_fn) if skill_tp + skill_fn else 0

    metrics = {
        "benchmark_type": "deterministic_resume_jd_scoring",
        "cases": len(rows),
        "roles": len(BENCHMARK_CASES),
        "tier_classification_accuracy": round(classification_correct / len(rows) * 100, 2),
        "strong_fit_detection_accuracy": round(strong_correct / len(rows) * 100, 2),
        "pairwise_ranking_accuracy": round(pairwise_correct / pairwise_total * 100, 2),
        "score_mean_absolute_error": round(sum(abs_errors) / len(abs_errors), 2),
        "skill_precision": round(precision * 100, 2),
        "skill_recall": round(recall * 100, 2),
        "thresholds": {
            "strong": "score >= 70",
            "partial": "10 <= score < 70",
            "weak": "score < 10",
        },
        "limitations": [
            "This is a small controlled benchmark, not a production hiring accuracy study.",
            "It validates the deterministic fallback scorer used when LLM providers are unavailable.",
            "A production accuracy claim needs a larger human-labeled resume/JD dataset.",
        ],
        "rows": rows,
    }
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
