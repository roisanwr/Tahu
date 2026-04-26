"""
app/core/config.py — Pydantic Settings (Fail-fast on startup)
Semua env vars divalidasi saat server start. Kalau ada yang missing → crash loud.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",            # ignore unknown keys in .env
        case_sensitive=False,
    )

    # ── Supabase ─────────────────────────────────────────────
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str = ""   # optional — pakai untuk verify JWT offline

    # ── Gemini AI ─────────────────────────────────────────────
    gemini_api_key: str
    gemini_model: str = "gemini-2.0-flash"

    # ── Azure OCR (optional — stub jika belum ada) ────────────
    azure_document_endpoint: str = "https://placeholder.cognitiveservices.azure.com/"
    azure_document_key: str = "placeholder"

    # ── CORS ──────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000"
    frontend_url: str = "http://localhost:3000"

    # ── App ───────────────────────────────────────────────────
    app_env: str = "development"
    app_version: str = "0.1.0"

    # ── Computed ──────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def azure_configured(self) -> bool:
        return (
            self.azure_document_key != "placeholder"
            and "placeholder" not in self.azure_document_endpoint
        )

    @field_validator("supabase_url")
    @classmethod
    def validate_supabase_url(cls, v: str) -> str:
        if not v.startswith("https://") or "supabase.co" not in v:
            raise ValueError(
                "SUPABASE_URL tidak valid. Format: https://xxxx.supabase.co"
            )
        return v.rstrip("/")

    @field_validator("gemini_api_key")
    @classmethod
    def validate_gemini_key(cls, v: str) -> str:
        if not v or v in ("xxxx", "placeholder"):
            raise ValueError("GEMINI_API_KEY belum diisi di .env")
        return v

    @model_validator(mode="after")
    def warn_missing_optional(self) -> "Settings":
        if not self.azure_configured:
            import warnings
            warnings.warn(
                "Azure OCR tidak dikonfigurasi. Document upload akan pakai stub mode.",
                UserWarning,
                stacklevel=2,
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Singleton settings — cached setelah pertama kali dipanggil."""
    return Settings()
