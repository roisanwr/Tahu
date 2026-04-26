"""
app/infra/ai/gemini.py — Gemini AI Client (RINA Chatbot)
Menggunakan google-genai SDK (bukan google-generativeai yang deprecated).
"""
from __future__ import annotations

import json
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


class GeminiClient:
    """Gemini client menggunakan google-genai SDK (terbaru)."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash") -> None:
        self._api_key = api_key
        self._model_name = model
        self._client = None
        self._initialized = False
        logger.info("gemini_client_created", model=model)

    def _get_client(self):
        """Lazy init Gemini client."""
        if self._client is None:
            try:
                from google import genai
                from google.genai import types
                self._client = genai.Client(api_key=self._api_key)
                self._types = types
                self._initialized = True
                logger.info("gemini_client_initialized", model=self._model_name)
            except ImportError:
                logger.error("google_genai_not_installed", hint="pip install google-genai")
                raise GeminiError("google-genai SDK tidak terinstall. Jalankan: pip install google-genai")
        return self._client

    async def chat(
        self,
        user_message: str,
        history: list[dict],
        session_context: dict | None = None,
    ) -> dict[str, Any]:
        """
        Kirim pesan ke RINA dan dapatkan JSON response.
        """
        import asyncio

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

        try:
            client = self._get_client()

            # Build contents
            contents = []
            for msg in history[-20:]:
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg["content"]}]})
            contents.append({"role": "user", "parts": [{"text": full_message}]})

            # Call Gemini — run in thread executor untuk non-blocking
            def _sync_call():
                response = client.models.generate_content(
                    model=self._model_name,
                    contents=contents,
                    config={
                        "system_instruction": RINA_SYSTEM_PROMPT,
                        "temperature": 0.7,
                        "max_output_tokens": 2048,
                        "response_mime_type": "application/json",
                    },
                )
                return response.text

            loop = asyncio.get_event_loop()
            raw_text = await loop.run_in_executor(None, _sync_call)

            # Parse JSON
            try:
                return json.loads(raw_text.strip())
            except json.JSONDecodeError:
                import re
                json_match = re.search(r'\{[\s\S]*\}', raw_text)
                if json_match:
                    return json.loads(json_match.group())
                logger.error("gemini_invalid_json", raw=raw_text[:200])
                raise GeminiError("RINA mengembalikan response yang tidak valid")

        except GeminiError:
            raise
        except Exception as exc:
            logger.error("gemini_chat_error", error=str(exc))
            raise GeminiError(f"Gagal berkomunikasi dengan AI: {exc}")

    async def extract_fields(self, chat_history_text: str) -> dict[str, Any]:
        """Ekstrak semua field dari full chat history untuk scoring pipeline."""
        import asyncio

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

        try:
            client = self._get_client()

            def _sync_extract():
                resp = client.models.generate_content(
                    model=self._model_name,
                    contents=[{"role": "user", "parts": [{"text": extraction_prompt}]}],
                    config={"temperature": 0.1, "max_output_tokens": 2048, "response_mime_type": "application/json"},
                )
                return resp.text

            loop = asyncio.get_event_loop()
            raw = await loop.run_in_executor(None, _sync_extract)
            return json.loads(raw)
        except Exception as exc:
            logger.error("gemini_extraction_error", error=str(exc))
            return {}


# Module-level singleton
_gemini_singleton: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    """Get singleton Gemini client."""
    import app.infra.ai.gemini as _mod
    if _mod._gemini_singleton is None:
        from app.core.config import get_settings
        settings = get_settings()
        _mod._gemini_singleton = GeminiClient(
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
        )
    return _mod._gemini_singleton
