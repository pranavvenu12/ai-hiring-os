"""
AI Hiring OS — Storage Service
"""

from __future__ import annotations

import uuid

from app.auth.supabase_auth import get_supabase_client

BUCKET_NAME = "resumes"


async def upload_resume(file_content: bytes, filename: str, company_id: uuid.UUID) -> str:
    """
    Upload a resume file to Supabase Storage.
    
    Path: {company_id}/{unique_id}-{filename}
    """
    client = get_supabase_client()
    
    # Ensure bucket exists (optional, usually pre-configured)
    # try:
    #     client.storage.create_bucket(BUCKET_NAME)
    # except Exception:
    #     pass

    file_extension = filename.split(".")[-1] if "." in filename else "pdf"
    file_path = f"{company_id}/{uuid.uuid4()}.{file_extension}"

    # Supabase-py upload is synchronous
    client.storage.from_(BUCKET_NAME).upload(
        path=file_path,
        file=file_content,
        file_options={"content-type": "application/pdf"}
    )

    # Return the public URL
    return client.storage.from_(BUCKET_NAME).get_public_url(file_path)
