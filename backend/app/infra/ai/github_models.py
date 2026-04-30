"""
app/infra/ai/github_models.py — GitHub Models AI Client (RINA Chatbot)
Menggunakan model via GitHub Models endpoint API kompatibel OpenAI.
"""
from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI
import httpx

from app.core.errors import AIProviderError
from app.core.logging import get_logger
from app.infra.ai.system_prompt import RINA_SYSTEM_PROMPT

logger = get_logger(__name__)

# ── Timeout & limits ──────────────────────────────────────────
_GITHUB_TIMEOUT_S = 30      # max 30 detik per request (sebelumnya: default SDK 10 menit!)
_MAX_HISTORY = 10            # kirim max 10 pesan history (sebelumnya: 20)


class GitHubModelsClient:
    """Client untuk integrasi GitHub Models yang kompatibel dengan standar OpenAI."""

    def __init__(self, api_key: str, model: str = "gpt-4o") -> None:
        if not api_key:
            raise AIProviderError("GitHub Token tidak boleh kosong")
        
        self.client = AsyncOpenAI(
            base_url="https://models.inference.ai.azure.com",
            api_key=api_key,
            timeout=httpx.Timeout(_GITHUB_TIMEOUT_S, connect=10.0),
        )
        self.model = model
        
        logger.info(
            "github_models_initialized",
            model=model,
            timeout_s=_GITHUB_TIMEOUT_S,
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
            collected = session_context.get('collected_fields', {})
            collected_str = json.dumps(collected, ensure_ascii=False) if collected else "Belum ada"
            missing = session_context.get('missing_fields', [])
            missing_str = ", ".join(missing) if missing else "Semua field sudah lengkap!"
            context_prefix = (
                f"[KONTEKS SESI]\n"
                f"Stage: {session_context.get('interview_stage', 'intro')}\n"
                f"Progress: {session_context.get('progress_pct', 0)}%\n"
                f"Data terkumpul: {collected_str}\n"
                f"Field BELUM terkumpul di stage ini: {missing_str}\n"
                f"ATURAN: JANGAN tanyakan field yang sudah ada di 'Data terkumpul'. Tanyakan HANYA dari 'Field BELUM terkumpul'!\n"
                f"[PESAN USER]\n"
            )

        full_message = context_prefix + user_message

        # Build messages for OpenAI spec — batasi history
        messages = [{"role": "system", "content": RINA_SYSTEM_PROMPT}]
        for msg in history[-_MAX_HISTORY:]:
            role = "user" if msg["role"] == "user" else "assistant"
            messages.append({"role": role, "content": msg["content"]})
        messages.append({"role": "user", "content": full_message})

        try:
            response = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.7,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            raw_text = response.choices[0].message.content
            return self._parse_json(raw_text or "")
        except Exception as exc:
            logger.error(
                "github_models_chat_error",
                error=str(exc),
                error_type=type(exc).__name__,
            )
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
            {"role": "system", "content": "Kamu adalah data extractor. Output harus selalu berupa JSON valid."},
            {"role": "user", "content": extraction_prompt}
        ]

        try:
            response = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.1,
            )
            raw_text = response.choices[0].message.content or "{}"
            try:
                return json.loads(raw_text.strip())
            except json.JSONDecodeError:
                import re
                match = re.search(r'\{[\s\S]*\}', raw_text)
                if match:
                    return json.loads(match.group())
                return {}
        except Exception as exc:
            logger.error(
                "github_models_extraction_error",
                error=str(exc),
                error_type=type(exc).__name__,
            )
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
            logger.warning("github_models_invalid_json_fallback", raw_preview=raw_text[:200])
            # Graceful fallback instead of error
            return {
                "message": raw_text.strip() or "Maaf, aku lagi kurang fokus. Bisa diulangi?",
                "current_stage": None,
                "ui_trigger": None,
                "extracted_fields": {},
                "flags": {"plain_text_fallback": True}
            }


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
