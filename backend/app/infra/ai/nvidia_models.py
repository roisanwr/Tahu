"""
app/infra/ai/nvidia_models.py — NVIDIA NIM AI Client (RINA Chatbot)
Menggunakan model via NVIDIA Inference Microservices (NIM) endpoint
yang kompatibel dengan OpenAI SDK. Mendukung streaming & reasoning tokens.
"""
from __future__ import annotations

import json
import re
from typing import Any, AsyncIterator

from openai import AsyncOpenAI

from app.core.errors import AIProviderError
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Konstanta model ────────────────────────────────────────────
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL   = "deepseek-ai/deepseek-v3-0324"

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


class NvidiaModelsClient:
    """
    Client untuk integrasi NVIDIA NIM (NVIDIA Inference Microservices).
    Kompatibel dengan OpenAI SDK — menggunakan AsyncOpenAI dengan base_url custom.
    Mendukung thinking/reasoning tokens pada model yang kompatibel.
    """

    def __init__(self, api_key: str, model: str = DEFAULT_MODEL) -> None:
        if not api_key:
            raise AIProviderError("NVIDIA API key tidak boleh kosong.")

        self.model = model
        self._client = AsyncOpenAI(
            base_url=NVIDIA_BASE_URL,
            api_key=api_key,
        )

        logger.info(
            "nvidia_nim_initialized",
            model=model,
            base_url=NVIDIA_BASE_URL,
            key_hint=api_key[:12] + "...",
        )

    # ── Public API ─────────────────────────────────────────────

    async def chat(
        self,
        user_message: str,
        history: list[dict],
        session_context: dict | None = None,
    ) -> dict[str, Any]:
        """
        Kirim pesan ke RINA dan dapatkan JSON response yang sudah di-parse.

        Alur:
        1. Build messages list (system + history + user).
        2. Panggil NVIDIA NIM endpoint dengan streaming.
        3. Kumpulkan reasoning tokens (thinking) dan content tokens.
        4. Parse JSON dari final content.
        """
        messages = self._build_messages(user_message, history, session_context)

        try:
            raw_content, reasoning = await self._stream_completion(
                messages=messages,
                temperature=0.7,
                top_p=0.95,
                max_tokens=4096,
            )
        except Exception as exc:
            logger.error("nvidia_nim_chat_error", error=str(exc), model=self.model)
            raise AIProviderError(f"NVIDIA NIM chat error: {exc}") from exc

        if reasoning:
            logger.debug("nvidia_nim_reasoning_captured", chars=len(reasoning))

        return self._parse_json(raw_content)

    async def extract_fields(self, chat_history_text: str) -> dict[str, Any]:
        """
        Ekstrak semua field terstruktur dari full chat history.
        Dipakai oleh scoring pipeline, bukan per-turn.
        Menggunakan temperature rendah untuk determinisme.
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
                temperature=0.1,
                top_p=0.95,
                max_tokens=2048,
            )
            return json.loads(raw_content or "{}")
        except json.JSONDecodeError as exc:
            logger.error("nvidia_nim_extraction_invalid_json", error=str(exc))
            return {}
        except Exception as exc:
            logger.error("nvidia_nim_extraction_error", error=str(exc))
            return {}

    # ── Internal helpers ───────────────────────────────────────

    def _build_messages(
        self,
        user_message: str,
        history: list[dict],
        session_context: dict | None,
    ) -> list[dict]:
        """Susun daftar messages sesuai format OpenAI Chat Completions."""
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

        # Ambil maks 20 history terakhir
        for msg in history[-20:]:
            role = "user" if msg["role"] == "user" else "assistant"
            messages.append({"role": role, "content": msg["content"]})

        messages.append({"role": "user", "content": context_prefix + user_message})
        return messages

    async def _stream_completion(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        top_p: float = 0.95,
        max_tokens: int = 4096,
    ) -> tuple[str, str]:
        """
        Jalankan streaming completion dan kumpulkan konten + reasoning.

        Returns:
            (content, reasoning) — keduanya string.
        """
        content_parts: list[str] = []
        reasoning_parts: list[str] = []

        stream = await self._client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
            stream=True,
        )

        async for chunk in stream:
            if not getattr(chunk, "choices", None):
                continue

            delta = chunk.choices[0].delta

            # Tangkap reasoning/thinking tokens (DeepSeek-R1 style)
            reasoning = (
                getattr(delta, "reasoning", None)
                or getattr(delta, "reasoning_content", None)
            )
            if reasoning:
                reasoning_parts.append(reasoning)

            # Tangkap content tokens
            if delta.content is not None:
                content_parts.append(delta.content)

        return "".join(content_parts), "".join(reasoning_parts)

    def _parse_json(self, raw_text: str) -> dict[str, Any]:
        """
        Parse JSON dari raw response.
        Fallback ke regex extraction jika ada text preamble di luar JSON.
        """
        try:
            return json.loads(raw_text.strip())
        except json.JSONDecodeError:
            json_match = re.search(r"\{[\s\S]*\}", raw_text)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass

        logger.error(
            "nvidia_nim_invalid_json",
            raw_preview=raw_text[:300],
            model=self.model,
        )
        raise AIProviderError("Response RINA tidak valid JSON dari NVIDIA NIM.")


# ── Singleton factory ──────────────────────────────────────────

_nvidia_singleton: NvidiaModelsClient | None = None


def get_nvidia_client() -> NvidiaModelsClient:
    """
    Kembalikan singleton NvidiaModelsClient.
    Lazy-init saat pertama kali dipanggil.
    """
    import app.infra.ai.nvidia_models as _mod

    if _mod._nvidia_singleton is None:
        from app.core.config import get_settings

        cfg = get_settings()
        _mod._nvidia_singleton = NvidiaModelsClient(
            api_key=cfg.nvidia_api_key,
            model=cfg.nvidia_model,
        )
    return _mod._nvidia_singleton


def reset_nvidia_client() -> None:
    """Reset singleton — berguna saat testing atau hot-reload config."""
    import app.infra.ai.nvidia_models as _mod

    _mod._nvidia_singleton = None
