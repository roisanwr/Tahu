"""
app/infra/ai/fallback_router.py — AI Provider Fallback Router
=============================================================

Menyediakan dua router yang mengimplementasikan strategi Primary → Fallback:

  FallbackChatRouter
      primary  : AzureOpenAIChatClient
      fallback : GLMChatClient (NVIDIA NIM z-ai/glm4.7)
      method   : .chat(user_message, history, session_context) -> dict

  FallbackExtractRouter
      primary  : AzureOpenAIExtractClient
      fallback : DeepSeekExtractClient (NVIDIA NIM deepseek-ai/deepseek-v4-pro)
      method   : .extract_fields(chat_history_text) -> dict

Kedua router memiliki interface yang identik dengan class NVIDIA aslinya,
sehingga chat/router.py dan scoring/pipeline.py tidak perlu diubah sama sekali.

Singleton factories:
  get_chat_client()       → FallbackChatRouter  (dipanggil dari chat/router.py)
  get_extraction_client() → FallbackExtractRouter (dipanggil dari scoring/pipeline.py)
"""
from __future__ import annotations

from typing import Any

from app.core.errors import AIProviderError
from app.core.logging import get_logger

logger = get_logger(__name__)


# ── Fallback Chat Router ────────────────────────────────────────

class FallbackChatRouter:
    """
    Router chat: Azure OpenAI (primary) → NVIDIA GLM4.7 (fallback).

    Interface identik dengan GLMChatClient — method .chat() dengan signature sama.
    Caller di chat/router.py tidak perlu tahu sedang berbicara dengan siapa.
    """

    def __init__(self, primary: Any, fallback: Any) -> None:
        self._primary = primary
        self._fallback = fallback

    async def chat(
        self,
        user_message: str,
        history: list[dict],
        session_context: dict | None = None,
    ) -> dict[str, Any]:
        """
        Coba Azure OpenAI dulu, fallback ke NVIDIA jika gagal.

        Returns:
            dict dengan keys: message, current_stage, ui_trigger,
                              extracted_fields, updated_fields, flags

        Raises:
            AIProviderError — hanya jika KEDUA provider gagal.
        """
        # ── Primary: GitHub Models ──────────────────────────────
        try:
            result = await self._primary.chat(
                user_message=user_message,
                history=history,
                session_context=session_context,
            )
            logger.info(
                "chat_provider_github_success",
                provider="github_models",
            )
            return result

        except Exception as primary_exc:
            logger.warning(
                "chat_primary_failed_fallback_nvidia",
                provider="github_models",
                error=str(primary_exc),
                error_type=type(primary_exc).__name__,
                fallback_to="nvidia_glm4.7",
            )

        # ── Fallback: NVIDIA GLM4.7 ────────────────────────────
        try:
            result = await self._fallback.chat(
                user_message=user_message,
                history=history,
                session_context=session_context,
            )
            logger.info(
                "chat_provider_nvidia_fallback_success",
                provider="nvidia_glm4.7",
            )
            return result

        except Exception as fallback_exc:
            logger.error(
                "chat_both_providers_failed",
                primary_error="(see previous warning log)",
                nvidia_error=str(fallback_exc),
            )
            raise AIProviderError(
                f"Semua AI provider gagal. "
                f"Primary: (lihat log sebelumnya). "
                f"NVIDIA: {fallback_exc}"
            ) from fallback_exc


# ── Fallback Extract Router ─────────────────────────────────────

class FallbackExtractRouter:
    """
    Router extraction: Azure OpenAI (primary) → NVIDIA DeepSeek (fallback).

    Interface identik dengan DeepSeekExtractClient — method .extract_fields().
    """

    def __init__(self, primary: Any, fallback: Any) -> None:
        self._primary = primary
        self._fallback = fallback

    async def extract_fields(self, chat_history_text: str) -> dict[str, Any]:
        """
        Coba Azure OpenAI dulu, fallback ke NVIDIA DeepSeek jika gagal.

        Returns:
            dict dengan semua field yang berhasil diekstrak.
            Mengembalikan {} jika KEDUA provider gagal (tidak crash pipeline).
        """
        # ── Primary: GitHub Models ──────────────────────────────
        try:
            result = await self._primary.extract_fields(chat_history_text)
            logger.info(
                "extract_provider_github_success",
                provider="github_models",
            )
            return result

        except Exception as primary_exc:
            logger.warning(
                "extract_primary_failed_fallback_nvidia",
                provider="github_models",
                error=str(primary_exc),
                error_type=type(primary_exc).__name__,
                fallback_to="nvidia_deepseek",
            )

        # ── Fallback: NVIDIA DeepSeek ──────────────────────────
        try:
            result = await self._fallback.extract_fields(chat_history_text)
            logger.info(
                "extract_provider_nvidia_fallback_success",
                provider="nvidia_deepseek",
            )
            return result

        except Exception as fallback_exc:
            logger.error(
                "extract_both_providers_failed",
                nvidia_error=str(fallback_exc),
            )
            # Extraction pipeline tidak boleh crash — return kosong
            return {}


# ── Singleton Factories ────────────────────────────────────────

_chat_router_singleton: FallbackChatRouter | None = None
_extract_router_singleton: FallbackExtractRouter | None = None


def get_chat_client() -> FallbackChatRouter:
    """
    Kembalikan singleton FallbackChatRouter.

    Jika Azure OpenAI dikonfigurasi → Azure primary, NVIDIA fallback.
    Jika Azure tidak dikonfigurasi → NVIDIA langsung (tanpa wrapper).

    Dipanggil dari chat/router.py — interface sama persis dengan GLMChatClient.
    """
    import app.infra.ai.fallback_router as _mod

    if _mod._chat_router_singleton is None:
        from app.core.config import get_settings
        cfg = get_settings()

        # ── NVIDIA Fallback (selalu diinisialisasi) ─────────────
        from app.infra.ai.nvidia_models import GLMChatClient
        nvidia_client = GLMChatClient(
            api_key=cfg.nvidia_chat_api_key,
            model=cfg.nvidia_chat_model,
        )

        if cfg.github_configured:
            # ── GitHub Primary tersedia → buat router ───────────
            from app.infra.ai.github_models import get_github_models_client
            github_client = get_github_models_client()
            _mod._chat_router_singleton = FallbackChatRouter(
                primary=github_client,
                fallback=nvidia_client,
            )
            logger.info(
                "chat_router_initialized",
                mode="github_primary_nvidia_fallback",
            )
        else:
            # ── GitHub tidak dikonfigurasi → NVIDIA langsung ─────
            # Bungkus NVIDIA dalam router tanpa primary untuk interface konsisten
            _mod._chat_router_singleton = _NvidiaOnlyChatRouter(nvidia_client)
            logger.info(
                "chat_router_initialized",
                mode="nvidia_only",
                reason="GitHub Models tidak dikonfigurasi (GITHUB_TOKEN kosong)",
            )

    return _mod._chat_router_singleton


def get_extraction_client() -> FallbackExtractRouter:
    """
    Kembalikan singleton FallbackExtractRouter.

    Jika Azure OpenAI dikonfigurasi → Azure primary, NVIDIA DeepSeek fallback.
    Jika Azure tidak dikonfigurasi → NVIDIA DeepSeek langsung.

    Dipanggil dari scoring pipeline — interface sama persis dengan DeepSeekExtractClient.
    """
    import app.infra.ai.fallback_router as _mod

    if _mod._extract_router_singleton is None:
        from app.core.config import get_settings
        cfg = get_settings()

        # ── NVIDIA DeepSeek Fallback (selalu diinisialisasi) ────
        from app.infra.ai.nvidia_models import DeepSeekExtractClient
        nvidia_client = DeepSeekExtractClient(
            api_key=cfg.nvidia_extract_api_key,
            model=cfg.nvidia_extract_model,
        )

        if cfg.github_configured:
            # ── GitHub Primary tersedia → buat router ───────────
            from app.infra.ai.github_models import get_github_models_client
            github_client = get_github_models_client()
            _mod._extract_router_singleton = FallbackExtractRouter(
                primary=github_client,
                fallback=nvidia_client,
            )
            logger.info(
                "extract_router_initialized",
                mode="github_primary_nvidia_fallback",
            )
        else:
            # ── GitHub tidak dikonfigurasi → NVIDIA DeepSeek langsung ─
            _mod._extract_router_singleton = _NvidiaOnlyExtractRouter(nvidia_client)
            logger.info(
                "extract_router_initialized",
                mode="nvidia_only",
                reason="GitHub Models tidak dikonfigurasi",
            )

    return _mod._extract_router_singleton


def reset_ai_clients() -> None:
    """Reset semua singleton — berguna saat testing atau hot-reload config."""
    import app.infra.ai.fallback_router as _mod
    _mod._chat_router_singleton = None
    _mod._extract_router_singleton = None


# ── Thin wrappers saat Azure tidak dikonfigurasi ───────────────
# Menjaga interface tetap konsisten tanpa duplikasi logika fallback.

class _NvidiaOnlyChatRouter:
    """Thin wrapper agar interface sama ketika Azure tidak dikonfigurasi."""

    def __init__(self, client: Any) -> None:
        self._client = client

    async def chat(
        self,
        user_message: str,
        history: list[dict],
        session_context: dict | None = None,
    ) -> dict[str, Any]:
        return await self._client.chat(
            user_message=user_message,
            history=history,
            session_context=session_context,
        )


class _NvidiaOnlyExtractRouter:
    """Thin wrapper agar interface sama ketika Azure tidak dikonfigurasi."""

    def __init__(self, client: Any) -> None:
        self._client = client

    async def extract_fields(self, chat_history_text: str) -> dict[str, Any]:
        return await self._client.extract_fields(chat_history_text)
