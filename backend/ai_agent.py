"""
ai_agent.py — Gemini API Wrapper (Placeholder)

Akan diimplementasikan penuh di Day 3.
Saat ini menyediakan interface + stub responses.
"""
from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()

# Day 3: import google.generativeai as genai


class AIAgent:
    """
    Wrapper untuk Gemini API sebagai AI interviewer.
    
    Responsibilities (Day 3+):
    - Maintain conversation context (last N messages)
    - Guided interview flow state machine
    - Data extraction dari conversation ke structured JSON
    - Sentiment analysis dari gaya bicara UMKM
    """

    SYSTEM_PROMPT = """
    Kamu adalah Analis Kredit AI yang ramah dan profesional untuk platform Tahu.
    Tugasmu adalah mewawancarai pelaku UMKM Indonesia untuk menilai kelayakan kredit mereka.
    
    Panduan:
    - Gunakan bahasa Indonesia yang santai tapi profesional
    - Tanyakan satu hal per giliran, jangan membanjiri dengan pertanyaan
    - Perhatikan konsistensi antara jawaban user
    - Flow: intro → profil usaha → keuangan → dokumen → lokasi → summary
    
    [Implementasi penuh: Day 3]
    """

    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        # Day 3: genai.configure(api_key=self.api_key)
        # Day 3: self.model = genai.GenerativeModel("gemini-1.5-flash")

    async def send_message(
        self,
        session_id: str,
        user_message: str,
        chat_history: list[dict[str, str]],
        current_stage: str,
    ) -> dict[str, Any]:
        """
        Kirim pesan user ke Gemini + context, kembalikan AI response.
        
        Returns:
            {
                "ai_response": str,
                "next_stage": str,
                "extracted_data": dict | None,
                "ui_component": str | None
            }
        
        [Placeholder — Day 3]
        """
        # Stub response untuk development
        return {
            "ai_response": (
                f"[AI Stub] Terima kasih atas pesanmu: '{user_message}'. "
                "Fitur AI akan aktif di Day 3. Cerita lebih lanjut tentang usahamu!"
            ),
            "next_stage": current_stage,
            "extracted_data": None,
            "ui_component": None,
        }

    async def extract_business_data(
        self, chat_history: list[dict[str, str]]
    ) -> dict[str, Any]:
        """
        Ekstrak data bisnis terstruktur dari seluruh riwayat chat.
        [Placeholder — Day 6]
        """
        return {}

    async def analyze_sentiment(
        self, chat_history: list[dict[str, str]]
    ) -> dict[str, Any]:
        """
        Analisis sentimen dan konsistensi dari pola jawaban UMKM.
        [Placeholder — Day 8]
        """
        return {
            "overall_sentiment": "neutral",
            "confidence_level": "low",
            "behavioral_signals": {},
            "key_observations": [],
        }
