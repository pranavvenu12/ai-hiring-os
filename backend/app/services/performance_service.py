"""
AI Hiring OS — Performance Service

Business logic for performance reviews and analytics.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.performance import PerformanceReview
from app.schemas.performance import PerformanceCreate


async def create_review(
    db: AsyncSession,
    payload: PerformanceCreate,
    reviewer_id: uuid.UUID,
    company_id: uuid.UUID,
) -> PerformanceReview:
    """Create a performance review."""
    review = PerformanceReview(
        employee_id=payload.employee_id,
        reviewer_id=reviewer_id,
        company_id=company_id,
        rating=payload.rating,
        strengths=payload.strengths,
        improvements=payload.improvements,
        comments=payload.comments,
        review_date=payload.review_date or date.today(),
    )
    db.add(review)
    await db.flush()
    await db.refresh(review)
    return review


async def get_my_reviews(
    db: AsyncSession,
    employee_id: uuid.UUID,
    *,
    skip: int = 0,
    limit: int = 20,
) -> list[dict]:
    """Get performance reviews for a specific employee."""
    result = await db.execute(
        select(PerformanceReview, Employee.full_name)
        .join(Employee, PerformanceReview.reviewer_id == Employee.id)
        .where(PerformanceReview.employee_id == employee_id)
        .order_by(PerformanceReview.review_date.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()

    reviews = []
    for review, reviewer_name in rows:
        reviews.append({
            "id": str(review.id),
            "employee_id": str(review.employee_id),
            "reviewer_id": str(review.reviewer_id),
            "company_id": str(review.company_id),
            "rating": review.rating,
            "strengths": review.strengths,
            "improvements": review.improvements,
            "comments": review.comments,
            "review_date": review.review_date.isoformat(),
            "created_at": review.created_at.isoformat(),
            "reviewer_name": reviewer_name,
        })
    return reviews


async def get_team_reviews(
    db: AsyncSession,
    manager_employee_id: uuid.UUID,
    company_id: uuid.UUID,
) -> list[dict]:
    """Get reviews for all direct reports of a manager."""
    # Get team member IDs
    team_result = await db.execute(
        select(Employee.id).where(
            Employee.manager_id == manager_employee_id,
            Employee.company_id == company_id,
        )
    )
    team_ids = [row[0] for row in team_result.all()]

    if not team_ids:
        return []

    result = await db.execute(
        select(PerformanceReview, Employee.full_name)
        .join(Employee, PerformanceReview.employee_id == Employee.id)
        .where(PerformanceReview.employee_id.in_(team_ids))
        .order_by(PerformanceReview.review_date.desc())
    )
    rows = result.all()

    reviews = []
    for review, emp_name in rows:
        reviews.append({
            "id": str(review.id),
            "employee_id": str(review.employee_id),
            "reviewer_id": str(review.reviewer_id),
            "company_id": str(review.company_id),
            "rating": review.rating,
            "strengths": review.strengths,
            "improvements": review.improvements,
            "comments": review.comments,
            "review_date": review.review_date.isoformat(),
            "created_at": review.created_at.isoformat(),
            "employee_name": emp_name,
        })
    return reviews


async def get_company_performance(
    db: AsyncSession,
    company_id: uuid.UUID,
) -> dict:
    """Get company-wide performance analytics."""
    # All reviews
    result = await db.execute(
        select(PerformanceReview, Employee.full_name, Employee.department)
        .join(Employee, PerformanceReview.employee_id == Employee.id)
        .where(PerformanceReview.company_id == company_id)
        .order_by(PerformanceReview.review_date.desc())
    )
    rows = result.all()

    if not rows:
        return {
            "avg_rating": 0.0,
            "total_reviews": 0,
            "top_performers": [],
            "department_performance": [],
            "reviews": [],
        }

    total_rating = 0.0
    employee_ratings = defaultdict(lambda: {"total": 0.0, "count": 0, "name": "", "department": None})
    dept_ratings = defaultdict(lambda: {"total": 0.0, "count": 0, "employees": set()})
    reviews = []

    for review, emp_name, dept in rows:
        total_rating += review.rating

        emp_key = str(review.employee_id)
        employee_ratings[emp_key]["total"] += review.rating
        employee_ratings[emp_key]["count"] += 1
        employee_ratings[emp_key]["name"] = emp_name
        employee_ratings[emp_key]["department"] = dept

        if dept:
            dept_ratings[dept]["total"] += review.rating
            dept_ratings[dept]["count"] += 1
            dept_ratings[dept]["employees"].add(emp_key)

        reviews.append({
            "id": str(review.id),
            "employee_id": str(review.employee_id),
            "reviewer_id": str(review.reviewer_id),
            "company_id": str(review.company_id),
            "rating": review.rating,
            "strengths": review.strengths,
            "improvements": review.improvements,
            "comments": review.comments,
            "review_date": review.review_date.isoformat(),
            "created_at": review.created_at.isoformat(),
            "employee_name": emp_name,
        })

    avg_rating = round(total_rating / len(rows), 2)

    # Top performers
    top_performers = sorted(
        [
            {
                "employee_id": emp_id,
                "employee_name": data["name"],
                "department": data["department"],
                "avg_rating": round(data["total"] / data["count"], 2),
                "review_count": data["count"],
            }
            for emp_id, data in employee_ratings.items()
        ],
        key=lambda x: x["avg_rating"],
        reverse=True,
    )[:10]

    # Department performance
    department_performance = sorted(
        [
            {
                "department": dept,
                "avg_rating": round(data["total"] / data["count"], 2),
                "employee_count": len(data["employees"]),
            }
            for dept, data in dept_ratings.items()
        ],
        key=lambda x: x["avg_rating"],
        reverse=True,
    )

    return {
        "avg_rating": avg_rating,
        "total_reviews": len(rows),
        "top_performers": top_performers,
        "department_performance": department_performance,
        "reviews": reviews[:20],
    }
