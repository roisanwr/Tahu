"""
app/infra/ai/gemini.py — Gemini AI Client (RINA Chatbot) — Multi-Key Edition
Mendukung beberapa API key untuk rotasi otomatis ketika satu key habis quota.

Fitur:
- Multi-key rotation (round-robin + fallback otomatis)
- Timeout 30 detik per request (tidak hang selamanya)
- Retry ke key berikutnya saat ResourceExhausted / QuotaExceeded / RateLimit
- Structured logging per key attempt
- Singleton via get_gemini_client()
"""
from __future__ import annotations

import asyncio
import json
import threading
from typing import Any

from app.core.errors import GeminiError
from app.core.logging import get_logger

logger = get_logger(__name__)

# System prompt RINA — dari NUSA_CHAT_FLOW_MASTER_SPEC.md Section 1
RINA_SYSTEM_PROMPT = """
Kamu adalah "RINA", asisten AI ramah milik platform TAHU yang membantu
pelaku UMKM menyiapkan profil usaha untuk penilaian kelayakan kredit.
Tugasmu adalah mewawancarai mereka secara natural dalam Bahasa Indonesia
santai, hangat, dan tidak kaku.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATURAN WAJIB — KOMUNIKASI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Tanyakan SATU hal per giliran. Jangan menumpuk pertanyaan.
2. Gunakan bahasa santai ("Kak", "kita", "nih", "dong").
3. Framing WAJIB: ini adalah "melengkapi profil usaha",
   BUKAN "penilaian kredit" atau "credit scoring".
4. Gunakan BRIDGE SENTENCE saat transisi antar topik.
5. Jika user menjawab ambigu → minta klarifikasi sopan.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATURAN WAJIB — STATE MACHINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. Jika user menyebut data dari stage lain → simpan, acknowledge, lanjut.
7. Jika user revisi data → update field, konfirmasi, lanjut.
   Kata kunci revisi: "eh salah", "ralat", "koreksi", "tadi aku bilang",
   "bukan", "sebenarnya", "lupa".
8. JANGAN restart dari awal hanya karena ada revisi.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY FIELDS (kumpulkan semua ini)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
owner_name, business_name, business_category,
years_operating, employee_count, has_fixed_location,
monthly_revenue, monthly_expense, transaction_frequency_daily,
assets_estimate, prev_loan_status, location (GPS atau alamat)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALUR STAGE: intro→profil→keuangan→geolokasi→dokumen→summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMAT OUTPUT — WAJIB JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "message": "Pesan ke user",
  "current_stage": "intro|profil|keuangan|dokumen|geolokasi|summary",
  "ui_trigger": null | "map_picker" | "file_upload" | "summary_card" | "login_gate" | "psikometrik_widget",
  "extracted_fields": { "field_name": "value" },
  "updated_fields": { "field_name": { "old": "...", "new": "..." } },
  "flags": {
    "contradiction_detected": false,
    "plausibility_warning": false,
    "hard_block_trigger": false,
    "data_flag": "sufficient"
  }
}
Output HARUS selalu valid JSON. Tidak boleh ada teks di luar JSON.
"""

# Error keywords yang trigger key rotation
_QUOTA_ERROR_KEYWORDS = (
    "quota", "exhausted", "resource_exhausted", "ratelimit",
    "rate limit", "too many requests", "429", "quota exceeded",
    "per day", "per minute",
)


def _is_quota_error(exc: Exception) -> bool:
    """Deteksi apakah error karena quota/rate-limit → perlu coba key lain."""
    msg = str(exc).lower()
    return any(kw in msg for kw in _QUOTA_ERROR_KEYWORDS)


class _SingleKeyClient:
    """Client untuk satu API key dengan lazy init."""

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model = model
        self._client = None
        self._types = None
        self._lock = threading.Lock()

    def get(self):
        if self._client is None:
            with self._lock:
                if self._client is None:
                    try:
                        from google import genai
                        from google.genai import types
                        self._client = genai.Client(api_key=self.api_key)
                        self._types = types
                    except ImportError:
                        raise GeminiError(
                            "google-genai SDK tidak terinstall. "
                            "Jalankan: pip install google-genai"
                        )
        return self._client

    def generate(self, contents: list, system_instruction: str = RINA_SYSTEM_PROMPT,
                 temperature: float = 0.7, max_tokens: int = 2048) -> str:
        """Synchronous generate — dipanggil dalam thread executor."""
        client = self.get()
        response = client.models.generate_content(
            model=self.model,
            contents=contents,
            config={
                "system_instruction": system_instruction,
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "response_mime_type": "application/json",
            },
        )
        return response.text


class GeminiClient:
    """
    Multi-key Gemini client dengan rotasi otomatis.

    Ketika satu key habis quota (ResourceExhausted, 429, dll),
    otomatis coba key berikutnya tanpa interupsi ke user.

    Key order: GEMINI_API_KEY (primary) + GEMINI_API_KEYS (fallbacks).
    """

    def __init__(self, api_keys: list[str], model: str = "gemini-2.0-flash") -> None:
        if not api_keys:
            raise GeminiError("Harus ada minimal 1 Gemini API key")

        self._model = model
        self._clients = [_SingleKeyClient(k, model) for k in api_keys]
        self._current_idx = 0
        self._lock = threading.Lock()

        logger.info(
            "gemini_multi_key_initialized",
            total_keys=len(api_keys),
            model=model,
            # Log 4 karakter pertama saja (tidak expose key)
            key_hints=[k[:8] + "..." for k in api_keys],
        )

    # ── Key rotation logic ─────────────────────────────────────

    def _next_key_idx(self) -> int:
        with self._lock:
            self._current_idx = (self._current_idx + 1) % len(self._clients)
            return self._current_idx

    async def _call_with_fallback(
        self,
        sync_fn,
        timeout_seconds: float = 30.0,
    ) -> str:
        """
        Execute sync_fn(client) dengan fallback ke key berikutnya jika quota habis.
        Timeout 30 detik per attempt.
        """
        loop = asyncio.get_event_loop()
        total_keys = len(self._clients)
        attempts = []

        for attempt in range(total_keys):
            idx = (self._current_idx + attempt) % total_keys
            client = self._clients[idx]
            key_hint = client.api_key[:8] + "..."

            try:
                result = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda c=client: sync_fn(c)),
                    timeout=timeout_seconds,
                )
                # Kalau sukses, set current_idx ke key ini (agar next call mulai dari sini)
                with self._lock:
                    self._current_idx = idx
                logger.info("gemini_key_success", key_hint=key_hint, attempt=attempt + 1)
                return result

            except asyncio.TimeoutError:
                attempts.append(f"key[{key_hint}]: timeout after {timeout_seconds}s")
                logger.warning("gemini_key_timeout", key_hint=key_hint, attempt=attempt + 1)
                continue  # Coba key berikutnya

            except Exception as exc:
                if _is_quota_error(exc):
                    attempts.append(f"key[{key_hint}]: quota/rate-limit → {exc}")
                    logger.warning(
                        "gemini_key_quota_exceeded",
                        key_hint=key_hint,
                        attempt=attempt + 1,
                        error=str(exc)[:100],
                    )
                    continue  # Rotate ke key berikutnya
                else:
                    # Error lain (network, invalid content, dll) — tidak retry
                    logger.error(
                        "gemini_key_error",
                        key_hint=key_hint,
                        error=str(exc),
                    )
                    raise GeminiError(f"Gemini error: {exc}") from exc

        # Semua key gagal
        logger.error("gemini_all_keys_exhausted", attempts=attempts)
        raise GeminiError(
            f"Semua {total_keys} Gemini API key habis quota atau timeout. "
            f"Coba lagi nanti atau tambah API key di GEMINI_API_KEYS."
        )

    # ── Public API ────────────────────────────────────────────

    async def chat(
        self,
        user_message: str,
        history: list[dict],
        session_context: dict | None = None,
    ) -> dict[str, Any]:
        """Kirim pesan ke RINA dan dapatkan JSON response."""
        context_prefix = ""
        if session_context:
            context_prefix = (
                f"[KONTEKS SESI]\n"
                f"Stage: {session_context.get('interview_stage', 'intro')}\n"
                f"Progress: {session_context.get('progress_pct', 0)}%\n"
                f"Data terkumpul: {json.dumps(session_context.get('collected_fields', {}), ensure_ascii=False)}\n"
                f"[PESAN USER]\n"
            )

        full_message = context_prefix + user_message

        # Build contents
        contents = []
        for msg in history[-20:]:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        contents.append({"role": "user", "parts": [{"text": full_message}]})

        def _sync(client: _SingleKeyClient) -> str:
            return client.generate(contents)

        raw_text = await self._call_with_fallback(_sync)

        # Parse JSON
        return self._parse_json(raw_text)

    async def extract_fields(self, chat_history_text: str) -> dict[str, Any]:
        """Ekstrak semua field dari full chat history untuk scoring pipeline."""
        extraction_prompt = (
            "Ekstrak semua data terstruktur dari percakapan berikut.\n"
            "Return JSON dengan semua field yang bisa diekstrak. Jika field tidak disebutkan, set ke null.\n\n"
            "Fields: owner_name, business_name, business_category, years_operating, employee_count, "
            "has_fixed_location, has_wa_business, monthly_revenue, monthly_expense, "
            "transaction_frequency_daily, assets_estimate, asset_type, has_prev_loan, "
            "prev_loan_status, prev_loan_amount, loan_count, location_address, gps_verified, "
            "marketplace_platform, marketplace_url, marketplace_rating, marketplace_review_count, "
            "has_qris, has_ewallet, ewallet_platforms, sentiment_score, completeness_pct, "
            "contradiction_count\n\n"
            f"PERCAKAPAN:\n{chat_history_text}\n\nReturn hanya JSON."
        )

        contents = [{"role": "user", "parts": [{"text": extraction_prompt}]}]

        def _sync(client: _SingleKeyClient) -> str:
            return client.generate(
                contents, system_instruction="Kamu adalah data extractor. Return JSON only.",
                temperature=0.1
            )

        try:
            raw = await self._call_with_fallback(_sync)
            return json.loads(raw)
        except Exception as exc:
            logger.error("gemini_extraction_error", error=str(exc))
            return {}

    def _parse_json(self, raw_text: str) -> dict[str, Any]:
        """Parse JSON dari response Gemini, dengan fallback regex jika ada non-JSON prefix."""
        try:
            return json.loads(raw_text.strip())
        except json.JSONDecodeError:
            import re
            json_match = re.search(r'\{[\s\S]*\}', raw_text)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            logger.error("gemini_invalid_json", raw_preview=raw_text[:200])
            raise GeminiError("RINA mengembalikan response yang tidak valid JSON")


# ── Singleton ─────────────────────────────────────────────────

_gemini_singleton: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    """Get singleton Gemini client (thread-safe, lazy-init)."""
    import app.infra.ai.gemini as _mod
    if _mod._gemini_singleton is None:
        from app.core.config import get_settings
        settings = get_settings()
        _mod._gemini_singleton = GeminiClient(
            api_keys=settings.gemini_keys_all,
            model=settings.gemini_model,
        )
    return _mod._gemini_singleton


def reset_gemini_client() -> None:
    """Reset singleton — berguna saat testing atau hot-reload config."""
    import app.infra.ai.gemini as _mod
    _mod._gemini_singleton = None
