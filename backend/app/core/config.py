"""
AI Hiring OS — Core Configuration

Centralised settings loaded from environment variables via pydantic-settings.
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings sourced from .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────
    APP_NAME: str = "AI Hiring OS"
    APP_ENV: str = "development"
    DEBUG: bool = True

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_flag(cls, value: object) -> object:
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"debug", "dev", "development"}:
                return True
        return value

    # ── Supabase ─────────────────────────────────────────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str

    # ── Database ─────────────────────────────────────────────────
    DATABASE_URL: str

    # ── AI Processing ────────────────────────────────────────────
    AI_GEMINI_KEY: str | None = None
    AI_HF_KEY: str | None = None
    AI_HF_BASE_URL: str = "https://router.huggingface.co/v1"
    AI_HF_MODEL: str = "meta-llama/Llama-3.1-8B-Instruct"

    # ── CORS ─────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def async_database_url(self) -> str:
        """
        Ensures the database URL uses the postgresql+asyncpg:// scheme.
        Handles Render/Supabase 'postgres://' or 'postgresql://' prefixes.

        NOTE: If deploying on Render and using Supabase, ensure you use the
        Connection Pooler URL (usually port 6543) instead of the direct
        connection URL (port 5432), as the latter is often IPv6-only
        which Render does not support for outbound connections.
        """
        url = self.DATABASE_URL
        if not url:
            return ""

        # Remove incompatible query parameters that asyncpg doesn't support
        # but are often included in Supabase/Render connection strings.
        import re
        url = re.sub(r"[?&]sslmode=[^&]*", "", url)
        url = re.sub(r"[?&]pgbouncer=[^&]*", "", url)

        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # Add pgbouncer-specific flag to disable statement caching
        if "prepared_statement_cache_size" not in url:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}prepared_statement_cache_size=0"

        return url


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()  # type: ignore[call-arg]
