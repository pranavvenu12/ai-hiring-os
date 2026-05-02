"""
AI Hiring OS — Text Extraction Service
"""

from __future__ import annotations

import fitz  # PyMuPDF


async def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract all text from a PDF binary."""
    text = ""
    with fitz.open(stream=file_content, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text.strip()
