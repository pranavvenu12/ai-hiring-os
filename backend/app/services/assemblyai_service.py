"""
AssemblyAI-backed voice interview transcription and speech analytics.
"""

from __future__ import annotations

import asyncio
from statistics import mean
from typing import Any

import httpx

from app.core.config import get_settings

settings = get_settings()

ASSEMBLYAI_BASE_URL = "https://api.assemblyai.com/v2"
FILLER_WORDS = {
    "um",
    "umm",
    "uh",
    "uhh",
    "er",
    "erm",
    "ah",
    "like",
    "you know",
    "basically",
    "actually",
    "so",
}


class AssemblyAIUnavailable(RuntimeError):
    """Raised when AssemblyAI cannot process the audio."""


def _headers() -> dict[str, str]:
    if not settings.ASSEMBLYAI_API_KEY:
        raise AssemblyAIUnavailable("ASSEMBLYAI_API_KEY is not configured.")
    return {"Authorization": settings.ASSEMBLYAI_API_KEY}


async def transcribe_audio(
    audio_bytes: bytes,
    *,
    filename: str,
    content_type: str | None = None,
) -> dict[str, Any]:
    """Upload audio to AssemblyAI, transcribe it, and return transcript plus metrics."""
    if not audio_bytes:
        raise AssemblyAIUnavailable("Audio file is empty.")

    async with httpx.AsyncClient(timeout=60.0) as client:
        upload = await client.post(
            f"{ASSEMBLYAI_BASE_URL}/upload",
            headers={**_headers(), "Content-Type": content_type or "application/octet-stream"},
            content=audio_bytes,
        )
        upload.raise_for_status()
        upload_url = upload.json()["upload_url"]

        transcript_response = await client.post(
            f"{ASSEMBLYAI_BASE_URL}/transcript",
            headers=_headers(),
            json={
                "audio_url": upload_url,
                "speech_model": "universal",
                "disfluencies": True,
                "format_text": True,
                "punctuate": True,
                "speaker_labels": False,
            },
        )
        transcript_response.raise_for_status()
        transcript_id = transcript_response.json()["id"]

        transcript = await _poll_transcript(client, transcript_id)

    text = transcript.get("text") or ""
    words = transcript.get("words") or []
    metrics = build_voice_metrics(text, words, transcript.get("confidence"))

    return {
        "assemblyai_id": transcript_id,
        "audio_url": upload_url,
        "text": text,
        "words": words,
        "metrics": metrics,
        "raw": {
            "status": transcript.get("status"),
            "confidence": transcript.get("confidence"),
            "audio_duration": transcript.get("audio_duration"),
        },
        "filename": filename,
    }


async def _poll_transcript(client: httpx.AsyncClient, transcript_id: str) -> dict[str, Any]:
    for _ in range(60):
        response = await client.get(
            f"{ASSEMBLYAI_BASE_URL}/transcript/{transcript_id}",
            headers=_headers(),
        )
        response.raise_for_status()
        data = response.json()
        status = data.get("status")
        if status == "completed":
            return data
        if status == "error":
            raise AssemblyAIUnavailable(data.get("error") or "AssemblyAI transcription failed.")
        await asyncio.sleep(2)
    raise AssemblyAIUnavailable("AssemblyAI transcription timed out.")


def build_voice_metrics(
    text: str,
    words: list[dict[str, Any]],
    transcript_confidence: float | None = None,
) -> dict[str, Any]:
    normalized_words = [word for word in words if word.get("text")]
    word_count = len(normalized_words) or len(text.split())
    duration_ms = _duration_ms(normalized_words)
    minutes = max(duration_ms / 60000, 0.01)
    speaking_pace = round(word_count / minutes, 1)
    filler_hits = _filler_hits(text, normalized_words)
    filler_rate = round((len(filler_hits) / max(word_count, 1)) * 100, 1)
    confidences = [
        float(word["confidence"])
        for word in normalized_words
        if isinstance(word.get("confidence"), (int, float))
    ]
    avg_confidence = (
        float(transcript_confidence)
        if transcript_confidence is not None
        else (mean(confidences) if confidences else 0.75)
    )

    communication_score = _score(72 + min(word_count, 120) * 0.08 - filler_rate * 1.4)
    confidence_score = _score(avg_confidence * 100)
    fluency_score = _score(100 - abs(speaking_pace - 140) * 0.28 - filler_rate * 1.6)

    return {
        "word_count": word_count,
        "duration_seconds": round(duration_ms / 1000, 1),
        "speaking_pace_wpm": speaking_pace,
        "filler_words": filler_hits,
        "filler_word_count": len(filler_hits),
        "filler_word_rate": filler_rate,
        "communication_score": communication_score,
        "confidence_score": confidence_score,
        "fluency_score": fluency_score,
    }


def _duration_ms(words: list[dict[str, Any]]) -> float:
    if not words:
        return 0.0
    starts = [float(word.get("start", 0)) for word in words if word.get("start") is not None]
    ends = [float(word.get("end", 0)) for word in words if word.get("end") is not None]
    if not starts or not ends:
        return 0.0
    return max(max(ends) - min(starts), 0.0)


def _filler_hits(text: str, words: list[dict[str, Any]]) -> list[dict[str, Any]]:
    hits = []
    for word in words:
        token = str(word.get("text", "")).strip(".,!?;:\"'()[]{}").lower()
        if token in FILLER_WORDS:
            hits.append({
                "word": word.get("text"),
                "start": word.get("start"),
                "end": word.get("end"),
            })

    lowered = f" {text.lower()} "
    for phrase in ["you know"]:
        count = lowered.count(f" {phrase} ")
        for _ in range(count):
            hits.append({"word": phrase, "start": None, "end": None})
    return hits


def _score(value: float) -> int:
    return int(round(min(max(value, 0), 100)))
