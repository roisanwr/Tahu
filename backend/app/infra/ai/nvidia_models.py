"""
app/infra/ai/nvidia_models.py — NVIDIA NIM Dual-Model AI Client
=================================================================

Arsitektur: 2 model, 2 API key, 1 file.

  GLMChatClient          → z-ai/glm4.7 (api_key_1)
      └─ .chat()         → dipakai di chat/router.py (RINA interview)

  DeepSeekExtractClient  → deepseek-ai/deepseek-v4-pro (api_key_2)
      └─ .extract_fields() → dipakai di scoring pipeline

Kedua client:
  - Menggunakan AsyncOpenAI SDK dengan NVIDIA base_url
  - asyncio.wait_for() timeout 60s agar tidak hang selamanya
  - Retry 2x dengan exponential backoff (1s, 2s)
  - Logging key_hint (12 char) untuk tracing tanpa expose secret
"""
from __future__ import annotations

import asyncio
import json
import re
from typing import Any

from openai import AsyncOpenAI, APITimeoutError, APIConnectionError, APIStatusError

from app.core.errors import AIProviderError
from app.core.logging import get_logger
from app.infra.ai.system_prompt import RINA_SYSTEM_PROMPT as _SHARED_RINA_PROMPT

logger = get_logger(__name__)

# ── Shared constants ───────────────────────────────────────────
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
_CHAT_TIMEOUT_S = 30        # timeout untuk GLM chat (turun dari 60s)
_EXTRACT_TIMEOUT_S = 120    # timeout untuk DeepSeek extraction (turun dari 180s)
_MAX_RETRIES = 1            # retry maksimum sebelum raise error (turun dari 2)
_MAX_HISTORY = 10           # max history messages (turun dari 20)


# ── System prompt RINA ─────────────────────────────────────────
# System prompt diimpor dari shared module (single source of truth)
RINA_SYSTEM_PROMPT = _SHARED_RINA_PROMPT


# ── Base client ────────────────────────────────────────────────

class _NvidiaBaseClient:
    """
    Base class untuk semua NVIDIA NIM clients.
    Menyediakan streaming completion dengan timeout dan retry.
    """

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key or not api_key.startswith("nvapi-"):
            raise AIProviderError(
                f"NVIDIA API key tidak valid untuk model {model}. "
                "Format: nvapi-<token>"
            )
        self.model = model
        self._client = AsyncOpenAI(
            base_url=NVIDIA_BASE_URL,
            api_key=api_key,
        )
        logger.info(
            "nvidia_client_initialized",
            model=model,
            key_hint=api_key[:12] + "...",
        )

    async def _stream_completion(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
        extra_body: dict | None = None,
        timeout_s: int = _CHAT_TIMEOUT_S,
    ) -> tuple[str, str]:
        """
        Streaming completion dengan timeout dan retry.

        Returns:
            (content, reasoning) — keduanya string.

        Raises:
            AIProviderError — setelah semua retry habis.
        """
        last_exc: Exception | None = None

        for attempt in range(1, _MAX_RETRIES + 2):  # attempt 1, 2, 3
            try:
                content, reasoning = await asyncio.wait_for(
                    self._do_stream(
                        messages=messages,
                        temperature=temperature,
                        top_p=top_p,
                        max_tokens=max_tokens,
                        extra_body=extra_body,
                    ),
                    timeout=timeout_s,
                )
                return content, reasoning

            except asyncio.TimeoutError:
                logger.warning(
                    "nvidia_stream_timeout",
                    model=self.model,
                    attempt=attempt,
                    timeout_s=timeout_s,
                )
                last_exc = asyncio.TimeoutError(
                    f"NVIDIA stream timeout setelah {timeout_s}s"
                )

            except (APIConnectionError, APITimeoutError) as exc:
                logger.warning(
                    "nvidia_connection_error",
                    model=self.model,
                    attempt=attempt,
                    error=str(exc),
                )
                last_exc = exc

            except APIStatusError as exc:
                # 4xx errors — jangan retry, langsung raise
                logger.error(
                    "nvidia_api_status_error",
                    model=self.model,
                    status_code=exc.status_code,
                    error=str(exc),
                )
                raise AIProviderError(
                    f"NVIDIA API error {exc.status_code}: {exc.message}"
                ) from exc

            except Exception as exc:
                logger.error(
                    "nvidia_unexpected_error",
                    model=self.model,
                    attempt=attempt,
                    error=str(exc),
                )
                last_exc = exc

            # Backoff sebelum retry: 1s, 2s
            if attempt <= _MAX_RETRIES:
                backoff = attempt  # 1s, 2s
                logger.info(
                    "nvidia_retry_backoff",
                    model=self.model,
                    attempt=attempt,
                    backoff_s=backoff,
                )
                await asyncio.sleep(backoff)

        raise AIProviderError(
            f"NVIDIA NIM ({self.model}) gagal setelah {_MAX_RETRIES + 1} percobaan: {last_exc}"
        ) from last_exc

    async def _do_stream(
        self,
        messages: list[dict],
        temperature: float,
        top_p: float,
        max_tokens: int,
        extra_body: dict | None,
    ) -> tuple[str, str]:
        """Satu percobaan streaming tanpa retry."""
        kwargs: dict[str, Any] = dict(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
            stream=True,
        )
        if extra_body:
            kwargs["extra_body"] = extra_body

        content_parts: list[str] = []
        reasoning_parts: list[str] = []

        stream = await self._client.chat.completions.create(**kwargs)

        async for chunk in stream:
            if not getattr(chunk, "choices", None):
                continue
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta

            # Reasoning tokens (DeepSeek-R1 style)
            reasoning = (
                getattr(delta, "reasoning", None)
                or getattr(delta, "reasoning_content", None)
            )
            if reasoning:
                reasoning_parts.append(reasoning)

            if delta.content is not None:
                content_parts.append(delta.content)

        return "".join(content_parts), "".join(reasoning_parts)

    @staticmethod
    def _parse_json(raw_text: str, model_name: str) -> dict[str, Any]:
        """
        Parse JSON dari raw response.
        Fallback ke regex extraction jika ada text preamble di luar JSON.
        """
        text = raw_text.strip()
        # Hapus markdown code fences jika ada
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
            text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Fallback: cari blok JSON di dalam teks
        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        logger.warning(
            "nvidia_invalid_json_fallback",
            model=model_name,
            raw_preview=raw_text[:200],
        )
        return {
            "message": raw_text.strip() or "Maaf, aku lagi kurang fokus. Bisa diulangi?",
            "current_stage": None,
            "ui_trigger": None,
            "extracted_fields": {},
            "flags": {"plain_text_fallback": True}
        }


# ── GLM Chat Client ────────────────────────────────────────────

class GLMChatClient(_NvidiaBaseClient):
    """
    Client untuk z-ai/glm4.7 — digunakan untuk chat interview RINA.
    Optimized untuk percakapan natural berbahasa Indonesia.
    """

    def __init__(self, api_key: str, model: str = "z-ai/glm4.7") -> None:
        super().__init__(api_key=api_key, model=model)

    async def chat(
        self,
        user_message: str,
        history: list[dict],
        session_context: dict | None = None,
    ) -> dict[str, Any]:
        """
        Kirim pesan ke RINA (GLM model) dan dapatkan JSON response yang sudah di-parse.

        Args:
            user_message: pesan dari user
            history: list of {"role": "user"|"model", "content": str}
            session_context: {"interview_stage", "progress_pct", "collected_fields"}

        Returns:
            dict dengan keys: message, current_stage, ui_trigger,
                              extracted_fields, updated_fields, flags
        """
        messages = self._build_chat_messages(user_message, history, session_context)

        try:
            raw_content, reasoning = await self._stream_completion(
                messages=messages,
                temperature=0.7,    # Turun dari 1.0 — lebih cepat & stabil
                top_p=0.95,
                max_tokens=2048,    # Turun dari 16384 — RINA response max ~500 token
                # Thinking mode DIMATIKAN — menambah 5-15s latency tanpa benefit signifikan untuk chat
            )
        except AIProviderError:
            raise
        except Exception as exc:
            logger.error("glm_chat_error", error=str(exc))
            raise AIProviderError(f"GLM chat error: {exc}") from exc

        if reasoning:
            logger.debug("glm_reasoning_captured", chars=len(reasoning))

        return self._parse_json(raw_content, self.model)

    def _build_chat_messages(
        self,
        user_message: str,
        history: list[dict],
        session_context: dict | None,
    ) -> list[dict]:
        """Susun messages list sesuai format OpenAI Chat Completions."""
        context_prefix = ""
        if session_context:
            context_prefix = (
                f"[KONTEKS SESI]\n"
                f"Stage: {session_context.get('interview_stage', 'intro')}\n"
                f"Progress: {session_context.get('progress_pct', 0)}%\n"
                f"Data terkumpul: {json.dumps(session_context.get('collected_fields', {}), ensure_ascii=False)}\n"
                f"[PESAN USER]\n"
            )

        messages: list[dict] = [{"role": "system", "content": RINA_SYSTEM_PROMPT}]

        for msg in history[-_MAX_HISTORY:]:
            role = "user" if msg["role"] == "user" else "assistant"
            messages.append({"role": role, "content": msg["content"]})

        messages.append({"role": "user", "content": context_prefix + user_message})
        return messages


# ── DeepSeek Extract Client ────────────────────────────────────

class DeepSeekExtractClient(_NvidiaBaseClient):
    """
    Client untuk deepseek-ai/deepseek-v4-pro — digunakan untuk ekstraksi data
    terstruktur dari chat history (scoring pipeline).
    Optimized untuk determinisme dan akurasi JSON output.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "deepseek-ai/deepseek-v4-pro",
    ) -> None:
        super().__init__(api_key=api_key, model=model)

    async def extract_fields(self, chat_history_text: str) -> dict[str, Any]:
        """
        Ekstrak semua field terstruktur dari full chat history.
        Dipakai oleh scoring pipeline, bukan per-turn.
        Menggunakan temperature rendah untuk determinisme.

        Args:
            chat_history_text: seluruh chat history sebagai teks

        Returns:
            dict dengan semua field yang berhasil diekstrak, null jika tidak ada
        """
        extraction_prompt = (
            "Ekstrak semua data terstruktur dari percakapan berikut.\n"
            "Return JSON dengan semua field yang bisa diekstrak. "
            "Jika field tidak disebutkan, set ke null.\n\n"
            "Fields: owner_name, business_name, business_category, years_operating, "
            "employee_count, has_fixed_location, has_wa_business, monthly_revenue, "
            "monthly_expense, transaction_frequency_daily, assets_estimate, asset_type, "
            "has_prev_loan, prev_loan_status, prev_loan_amount, loan_count, "
            "location_address, gps_verified, marketplace_platform, marketplace_url, "
            "marketplace_rating, marketplace_review_count, has_qris, has_ewallet, "
            "ewallet_platforms, sentiment_score, completeness_pct, contradiction_count\n\n"
            f"PERCAKAPAN:\n{chat_history_text}\n\nReturn hanya JSON."
        )

        messages = [
            {"role": "system", "content": "Kamu adalah data extractor. Return JSON only."},
            {"role": "user", "content": extraction_prompt},
        ]

        try:
            raw_content, _ = await self._stream_completion(
                messages=messages,
                temperature=0.1,    # rendah untuk konsistensi output
                top_p=0.95,
                max_tokens=2048,
                extra_body={"chat_template_kwargs": {"thinking": False}},
                timeout_s=_EXTRACT_TIMEOUT_S,   # 180s — DeepSeek perlu waktu lebih
            )
            # DeepSeek kadang wrap dalam markdown — _parse_json sudah handle ini
            return self._parse_json(raw_content, self.model)
        except AIProviderError:
            # Jika extract gagal, return empty — jangan crash scoring pipeline
            logger.error(
                "deepseek_extraction_failed",
                model=self.model,
            )
            return {}
        except json.JSONDecodeError as exc:
            logger.error("deepseek_extraction_invalid_json", error=str(exc))
            return {}
        except Exception as exc:
            logger.error("deepseek_extraction_unexpected_error", error=str(exc))
            return {}


# ── Singletons ─────────────────────────────────────────────────

_chat_singleton: GLMChatClient | None = None
_extract_singleton: DeepSeekExtractClient | None = None


def get_chat_client() -> GLMChatClient:
    """
    Kembalikan singleton GLMChatClient (z-ai/glm4.7).
    Dipakai di chat/router.py untuk interview RINA.
    Lazy-init saat pertama kali dipanggil.
    """
    import app.infra.ai.nvidia_models as _mod

    if _mod._chat_singleton is None:
        from app.core.config import get_settings
        cfg = get_settings()
        _mod._chat_singleton = GLMChatClient(
            api_key=cfg.nvidia_chat_api_key,
            model=cfg.nvidia_chat_model,
        )
    return _mod._chat_singleton


def get_extraction_client() -> DeepSeekExtractClient:
    """
    Kembalikan singleton DeepSeekExtractClient (deepseek-ai/deepseek-v4-pro).
    Dipakai di scoring pipeline untuk ekstraksi data terstruktur.
    Lazy-init saat pertama kali dipanggil.
    """
    import app.infra.ai.nvidia_models as _mod

    if _mod._extract_singleton is None:
        from app.core.config import get_settings
        cfg = get_settings()
        _mod._extract_singleton = DeepSeekExtractClient(
            api_key=cfg.nvidia_extract_api_key,
            model=cfg.nvidia_extract_model,
        )
    return _mod._extract_singleton


def reset_nvidia_clients() -> None:
    """Reset semua singleton — berguna saat testing atau hot-reload config."""
    import app.infra.ai.nvidia_models as _mod
    _mod._chat_singleton = None
    _mod._extract_singleton = None


# ── Backward compatibility alias (untuk kode yang belum dimigrate) ──
def get_nvidia_client() -> GLMChatClient:
    """Alias ke get_chat_client() untuk backward compatibility."""
    return get_chat_client()
