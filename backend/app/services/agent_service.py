"""
Practical agentic AI service for the Recruiter Copilot.

The agent plans read-only tool calls, executes tenant-scoped tools, records a
trace, and returns recommendations that require human approval.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import AgentAction, AgentSession
from app.models.user import User
from app.services import agent_tools, realtime_service


SAFE_POLICY = "I can recommend and explain, but I cannot hire, reject, approve payroll, or modify employee data."


async def ask_agent(db: AsyncSession, current_user: User, message: str) -> dict[str, Any]:
    session = AgentSession(
        company_id=current_user.company_id,
        user_id=current_user.id,
        message=message,
        status="running",
        tools_used=[],
        suggested_actions=[],
    )
    db.add(session)
    await db.flush()

    await realtime_service.publish_event(current_user.company_id, "agent_started", {
        "session_id": str(session.id),
        "message": message,
    })

    plan = _plan_tools(message)
    tool_outputs: dict[str, Any] = {}
    tools_used: list[str] = []

    for step in plan:
        tool_name = step["tool_name"]
        tool = agent_tools.TOOL_REGISTRY.get(tool_name)
        if not tool:
            continue

        args = step.get("input", {})
        await realtime_service.publish_event(current_user.company_id, "agent_tool_called", {
            "session_id": str(session.id),
            "tool_name": tool_name,
            "input": args,
        })

        output = await tool(db, current_user.company_id, **args)
        tools_used.append(tool_name)
        tool_outputs[tool_name] = output
        db.add(AgentAction(
            session_id=session.id,
            tool_name=tool_name,
            input=args,
            output=output,
            reasoning=step.get("reasoning"),
        ))
        await db.flush()

    answer, suggested_actions = _compose_answer(message, tool_outputs)
    session.answer = answer
    session.tools_used = tools_used
    session.suggested_actions = suggested_actions
    session.status = "completed"
    await db.commit()

    await realtime_service.publish_event(current_user.company_id, "agent_completed", {
        "session_id": str(session.id),
        "tools_used": tools_used,
        "suggested_actions": suggested_actions,
    })

    return {
        "answer": answer,
        "tools_used": tools_used,
        "suggested_actions": suggested_actions,
    }


def _plan_tools(message: str) -> list[dict[str, Any]]:
    text = message.lower()
    title = _extract_role_hint(message)
    candidate_name = _extract_candidate_name(message)
    steps: list[dict[str, Any]] = []

    if any(term in text for term in ["payroll", "salary", "paid", "approval"]):
        steps.append({"tool_name": "get_payroll_summary", "input": {}, "reasoning": "Payroll question needs read-only payroll statistics."})

    if any(term in text for term in ["employee", "attendance", "performance", "team"]):
        steps.append({"tool_name": "get_employee_stats", "input": {}, "reasoning": "HR operations question needs employee statistics."})

    if "why" in text and candidate_name:
        steps.append({
            "tool_name": "get_candidate_profile",
            "input": {"candidate_name": candidate_name},
            "reasoning": "The user asked for an explanation about a candidate ranking.",
        })
        steps.append({
            "tool_name": "get_interview_results",
            "input": {},
            "reasoning": "Interview results add evidence to the ranking explanation.",
        })
        return steps

    if any(term in text for term in ["top", "rank", "best", "compare", "shortlist", "manual review", "interview plan", "candidates"]):
        steps.append({"tool_name": "list_jobs", "input": {}, "reasoning": "Find tenant jobs and infer the target hiring role."})
        steps.append({
            "tool_name": "list_candidates",
            "input": {"title": title} if title else {},
            "reasoning": "Retrieve candidate scores and skill gaps for the requested role.",
        })
        if "compare" in text or "rank" in text or "top" in text:
            steps.append({
                "tool_name": "compare_candidates",
                "input": {"title": title} if title else {},
                "reasoning": "Rank candidates using resume and interview evidence.",
            })
        if any(term in text for term in ["shortlist", "manual review", "interview plan", "top"]):
            steps.append({
                "tool_name": "recommend_shortlist",
                "input": {"title": title, "limit": 3} if title else {"limit": 3},
                "reasoning": "Prepare advisory shortlist and manual-review buckets.",
            })
        return steps

    if any(term in text for term in ["job", "opening", "role"]):
        steps.append({"tool_name": "list_jobs", "input": {}, "reasoning": "User asked about available hiring roles."})
        if title:
            steps.append({"tool_name": "get_job_details", "input": {"title": title}, "reasoning": "Fetch details for the referenced job."})
        return steps

    return [
        {"tool_name": "list_jobs", "input": {}, "reasoning": "Default orientation for recruiter copilot."},
        {"tool_name": "get_employee_stats", "input": {}, "reasoning": "Add HR operating context."},
    ]


def _extract_role_hint(message: str) -> str | None:
    text = re.sub(r"[^A-Za-z0-9 ]+", " ", message).strip()
    patterns = [
        r"for ([A-Za-z0-9 ]+)",
        r"top ([A-Za-z0-9 ]+) candidates",
        r"best ([A-Za-z0-9 ]+) candidates",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            value = re.sub(r"\b(candidates|candidate|role|job|position)\b", "", value, flags=re.IGNORECASE).strip()
            return value or None
    return None


def _extract_candidate_name(message: str) -> str | None:
    match = re.search(r"why (?:was|is)?\s*([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)", message)
    if match:
        return match.group(1).strip()
    return None


def _compose_answer(message: str, outputs: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
    suggested_actions: list[dict[str, Any]] = []

    if "get_candidate_profile" in outputs and outputs["get_candidate_profile"]:
        profile = outputs["get_candidate_profile"]
        lines = [
            f"{profile['candidate_name']} is being ranked using candidate intelligence, ATS analysis, project evidence, and interview evidence.",
            f"Candidate intelligence score: {profile.get('candidate_intelligence_score', profile.get('score', 0))}/100, ATS score: {profile.get('ats_score', 0)}/100, skill match: {profile.get('skill_match_score', 0)}%, semantic fit: {profile.get('semantic_score', 0)}%.",
        ]
        if profile.get("explicit_skills"):
            lines.append(f"Explicit skills: {', '.join(map(str, profile['explicit_skills'][:6]))}.")
        if profile.get("inferred_skills"):
            lines.append(f"Inferred skills: {', '.join(map(str, profile['inferred_skills'][:5]))}.")
        if profile.get("missing_skills"):
            lines.append(f"Skill gaps: {', '.join(map(str, profile['missing_skills'][:6]))}.")
        if profile.get("project_analysis"):
            project = profile["project_analysis"][0]
            lines.append(f"Project signal: {project.get('name')} is marked {project.get('complexity')} complexity with {', '.join(project.get('technologies') or [])}.")
        if profile.get("github_analysis"):
            lines.append(f"GitHub signal: score {profile['github_analysis'].get('github_score')}/100, quality {profile['github_analysis'].get('project_quality')}.")
        if profile.get("portfolio_analysis"):
            lines.append(f"Portfolio signal: score {profile['portfolio_analysis'].get('portfolio_score')}/100.")
        if profile.get("candidate_strengths"):
            lines.append(f"Strengths: {' '.join(map(str, profile['candidate_strengths'][:2]))}")
        if profile.get("candidate_weaknesses"):
            lines.append(f"Weaknesses: {' '.join(map(str, profile['candidate_weaknesses'][:2]))}")
        if profile.get("interview_focus_areas"):
            lines.append(f"Interview focus: {', '.join(map(str, profile['interview_focus_areas'][:5]))}.")
        if profile.get("interview_score") is not None:
            lines.append(f"Interview score: {profile.get('interview_score')} with recommendation {profile.get('interview_recommendation')}.")
        suggested_actions.append({"type": "review_candidate", "label": "Open candidate profile", "candidate_id": profile["resume_id"]})
        return " ".join(lines) + f" {SAFE_POLICY}", suggested_actions

    if "recommend_shortlist" in outputs:
        data = outputs["recommend_shortlist"]
        shortlist = data.get("recommended_shortlist", [])
        manual = data.get("manual_review", [])
        lines = ["Here is the advisory hiring plan:"]
        if shortlist:
            ranked = "; ".join(
                f"{idx + 1}. {item['candidate_name']} ({item['score']}%, {item.get('recommendation', 'review')})"
                for idx, item in enumerate(shortlist)
            )
            lines.append(f"Recommended shortlist: {ranked}.")
            suggested_actions.extend([
                {"type": "schedule_interview", "label": f"Schedule adaptive interview for {item['candidate_name']}", "candidate_id": item["resume_id"]}
                for item in shortlist
            ])
        else:
            lines.append("No candidates currently meet the recommended shortlist threshold.")
        if manual:
            lines.append("Manual review: " + "; ".join(f"{item['candidate_name']} - {item['concern']}" for item in manual) + ".")
        lines.append(SAFE_POLICY)
        return " ".join(lines), suggested_actions

    if "compare_candidates" in outputs:
        ranked = outputs["compare_candidates"].get("ranked_candidates", [])
        if ranked:
            lines = ["Candidate comparison:"]
            lines.extend(
                f"{idx + 1}. {candidate['candidate_name']} - intelligence {candidate.get('candidate_intelligence_score', candidate.get('score', 0))}/100, ATS {candidate.get('ats_score', 0)}/100, recommendation {candidate.get('hiring_recommendation')}, interview {candidate.get('interview_score') or 'not completed'}."
                for idx, candidate in enumerate(ranked[:5])
            )
            return " ".join(lines) + f" {SAFE_POLICY}", suggested_actions

    if "get_payroll_summary" in outputs:
        payroll = outputs["get_payroll_summary"]
        return (
            f"Payroll has {payroll['records']} records, total net cost {payroll['total_payroll_cost']}, "
            f"{payroll['pending']} pending, {payroll['approved']} approved, and {payroll['paid']} paid. {SAFE_POLICY}"
        ), suggested_actions

    if "get_employee_stats" in outputs:
        stats = outputs["get_employee_stats"]
        return (
            f"Employee snapshot: {stats['active_employees']} active employees out of {stats['total_employees']}, "
            f"{stats['attendance_records']} attendance records, average performance rating {stats['average_performance_rating']}/5. {SAFE_POLICY}"
        ), suggested_actions

    jobs = outputs.get("list_jobs", [])
    if jobs:
        return (
            "Open hiring context: "
            + "; ".join(f"{job['title']} ({job.get('candidate_count', 0)} candidates)" for job in jobs[:6])
            + f". {SAFE_POLICY}"
        ), suggested_actions

    return f"I could not find enough tenant data to answer that yet. {SAFE_POLICY}", suggested_actions
