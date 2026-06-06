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
        "jd": (
            "Full Stack Developer required to build backend REST APIs, responsive frontend dashboards, "
            "database-backed services, deployment pipelines, and cloud integrations using Python, FastAPI, "
            "PostgreSQL, Docker, AWS, React, and TypeScript."
        ),
        "candidates": [
            {
                "label": "strong",
                "target_score": 90,
                "resume": (
                    "Projects: Built and deployed a full-stack hiring dashboard with Python, FastAPI, "
                    "PostgreSQL, Docker, AWS, React, and TypeScript. Implemented REST APIs, responsive UI "
                    "components, database queries, authentication, and production deployment. GitHub and "
                    "LinkedIn links included."
                ),
                "expected_present_skills": {"python", "fastapi", "postgresql", "docker", "aws", "react", "typescript"},
            },
            {
                "label": "partial",
                "target_score": 35,
                "resume": (
                    "Projects: Created frontend dashboards using React, JavaScript, HTML, and CSS. "
                    "Completed a Python internship and built small API scripts, but no cloud deployment "
                    "or PostgreSQL production backend experience."
                ),
                "expected_present_skills": {"python", "react"},
            },
            {
                "label": "weak",
                "target_score": 5,
                "resume": "Experience in sales operations, marketing reports, Excel dashboards, and client outreach.",
                "expected_present_skills": set(),
            },
        ],
    },
    {
        "role": "AI ML Engineer",
        "jd": (
            "AI ML Engineer needed for model training, NLP pipelines, classification systems, deployment, "
            "and cloud-based machine learning workflows using Python, TensorFlow, PyTorch, NLP, Docker, and AWS."
        ),
        "candidates": [
            {
                "label": "strong",
                "target_score": 90,
                "resume": (
                    "Projects: Developed NLP classification models in Python using TensorFlow and PyTorch. "
                    "Built machine learning model training pipelines, deployed Docker containers on AWS, "
                    "analyzed datasets, and optimized prediction quality by 18 percent."
                ),
                "expected_present_skills": {"python", "tensorflow", "pytorch", "nlp", "docker", "aws", "machine learning"},
            },
            {
                "label": "partial",
                "target_score": 35,
                "resume": (
                    "Projects: Analyzed datasets using Python, Pandas, NumPy, and SQL. Built reporting "
                    "dashboards and simple prediction notebooks, but no TensorFlow, PyTorch, NLP, Docker, "
                    "or AWS deployment work."
                ),
                "expected_present_skills": {"python"},
            },
            {
                "label": "weak",
                "target_score": 5,
                "resume": "Portfolio: Figma UI branding, visual design, typography, and landing page mockups.",
                "expected_present_skills": set(),
            },
        ],
    },
    {
        "role": "UI UX Designer",
        "jd": (
            "UI UX Designer required for user research, wireframing, prototyping, usability testing, "
            "accessibility, responsive product design, and design system work using Figma."
        ),
        "candidates": [
            {
                "label": "strong",
                "target_score": 90,
                "resume": (
                    "Experience: Designed responsive SaaS dashboards in Figma, created wireframes and "
                    "interactive prototypes, conducted user research and usability testing, improved "
                    "accessibility, and maintained a design system."
                ),
                "expected_present_skills": {"figma", "prototyping", "wireframes", "research", "accessibility"},
            },
            {
                "label": "partial",
                "target_score": 35,
                "resume": (
                    "Portfolio: Created Figma visual design screens, branding layouts, landing pages, "
                    "and UI mockups. Limited research, accessibility, or wireframing evidence."
                ),
                "expected_present_skills": {"figma"},
            },
            {
                "label": "weak",
                "target_score": 5,
                "resume": "Projects: Java Spring backend APIs, PostgreSQL schemas, and server-side authentication.",
                "expected_present_skills": set(),
            },
        ],
    },
    {
        "role": "DevOps Engineer",
        "jd": (
            "DevOps Engineer required for deployment automation, cloud infrastructure, monitoring, "
            "container orchestration, Linux operations, CI/CD pipelines, Docker, Kubernetes, AWS, and Terraform."
        ),
        "candidates": [
            {
                "label": "strong",
                "target_score": 90,
                "resume": (
                    "Experience: Automated CI/CD deployment pipelines, managed Linux servers, deployed "
                    "Docker containers to Kubernetes on AWS, wrote Terraform infrastructure modules, "
                    "and implemented monitoring dashboards that reduced incident response time by 25 percent."
                ),
                "expected_present_skills": {"docker", "kubernetes", "aws", "terraform", "linux", "monitoring", "ci/cd"},
            },
            {
                "label": "partial",
                "target_score": 35,
                "resume": (
                    "Experience: Supported AWS Linux servers, wrote Bash scripts, and monitored cloud "
                    "services. No Kubernetes, Terraform, Docker orchestration, or complete CI/CD ownership."
                ),
                "expected_present_skills": {"aws", "linux", "monitoring"},
            },
            {
                "label": "weak",
                "target_score": 5,
                "resume": "Projects: Flutter mobile app, Android screens, iOS layouts, Firebase auth, and mobile analytics.",
                "expected_present_skills": set(),
            },
        ],
    },
]


LABEL_ORDER = {"weak": 0, "partial": 1, "strong": 2}


def score_bucket(score: float) -> str:
    if score >= 65:
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
        if (row["expected_label"] == "strong") == (row["score"] >= 65)
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
            "strong": "score >= 65",
            "partial": "10 <= score < 65",
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
