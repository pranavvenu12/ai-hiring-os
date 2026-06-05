"""Email helpers for candidate interview invitations."""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

settings = get_settings()


async def send_interview_invite(
    *,
    to_email: str | None,
    candidate_name: str,
    job_title: str,
    interview_url: str,
) -> dict:
    """Send an interview invite when SMTP is configured; otherwise report skipped."""
    if not to_email:
        return {"sent": False, "status": "missing_candidate_email"}

    required = [
        settings.SMTP_HOST,
        settings.SMTP_USERNAME,
        settings.SMTP_PASSWORD,
        settings.SMTP_FROM_EMAIL,
    ]
    if not all(required):
        return {
            "sent": False,
            "status": "smtp_not_configured",
            "interview_url": interview_url,
        }

    message = EmailMessage()
    message["Subject"] = f"Interview invitation for {job_title}"
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = to_email
    message.set_content(
        f"Hi {candidate_name},\n\n"
        f"You have been shortlisted for {job_title}.\n\n"
        f"Please complete your AI interview here:\n{interview_url}\n\n"
        "This is an automated interview link. The hiring team will review the results.\n\n"
        "Regards,\nAI Hiring OS"
    )

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    except Exception as exc:
        return {"sent": False, "status": "send_failed", "error": str(exc), "interview_url": interview_url}

    return {"sent": True, "status": "sent", "interview_url": interview_url}
