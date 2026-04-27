"""
app/infra/ai/github_models.py — GitHub Models AI Client (RINA Chatbot)
Menggunakan model via GitHub Models endpoint API kompatibel OpenAI.
"""
from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI
from openai import AsyncAzureOpenAI
import traceback

from app.core.errors import AIProviderError
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

class GitHubModelsClient:
    """Client untuk integrasi GitHub Models yang kompatibel dengan standar OpenAI."""

    def __init__(self, api_key: str, model: str = "gpt-4o") -> None:
        if not api_key:
            raise AIProviderError("GitHub Token tidak boleh kosong")
        
        self.client = AsyncOpenAI(
            base_url="https://models.inference.ai.azure.com",
            api_key=api_key,
        )
        self.model = model
        
        logger.info(
            "github_models_initialized",
            model=model,
            key_hint=api_key[:15] + "..."
        )

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

        # Build messages for OpenAI spec
        messages = [{"role": "system", "content": RINA_SYSTEM_PROMPT}]
        for msg in history[-20:]: # We get max 20 from previous db query
            role = "user" if msg["role"] == "user" else "assistant"
            messages.append({"role": role, "content": msg["content"]})
        messages.append({"role": "user", "content": full_message})

        try:
            response = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.7,
                max_tokens=2048,
                response_format={"type": "json_object"},
            )
            raw_text = response.choices[0].message.content
            return self._parse_json(raw_text or "")
        except Exception as exc:
            logger.error("github_models_error", error=str(exc))
            raise AIProviderError(f"GitHub Models error: {exc}") from exc

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

        messages = [
            {"role": "system", "content": "Kamu adalah data extractor. Return JSON only."},
            {"role": "user", "content": extraction_prompt}
        ]

        try:
            response = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            raw_text = response.choices[0].message.content
            return json.loads(raw_text or "{}")
        except Exception as exc:
            logger.error("github_models_extraction_error", error=str(exc))
            return {}

    def _parse_json(self, raw_text: str) -> dict[str, Any]:
        """Parse JSON dari response GitHub Models, fallback regex jika ada text preamble."""
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
            logger.error("github_models_invalid_json", raw_preview=raw_text[:200])
            raise AIProviderError("Response RINA tidak valid JSON")


# ── Singleton ─────────────────────────────────────────────────

_github_models_singleton: GitHubModelsClient | None = None

def get_github_models_client() -> GitHubModelsClient:
    """Get singleton GitHub Models client."""
    import app.infra.ai.github_models as _mod
    if _mod._github_models_singleton is None:
        from app.core.config import get_settings
        settings = get_settings()
        _mod._github_models_singleton = GitHubModelsClient(
            api_key=settings.github_token,
            model=settings.github_model,
        )
    return _mod._github_models_singleton

def reset_github_models_client() -> None:
    """Reset singleton — berguna saat testing atau hot-reload config."""
    import app.infra.ai.github_models as _mod
    _mod._github_models_singleton = None
