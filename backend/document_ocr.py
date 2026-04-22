"""
document_ocr.py — Azure AI Document Intelligence Wrapper (Placeholder)

Akan diimplementasikan penuh di Day 4.
Saat ini menyediakan interface + stub responses.
"""
from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv

load_dotenv()

# Day 4: from azure.ai.formrecognizer import DocumentAnalysisClient
# Day 4: from azure.core.credentials import AzureKeyCredential


class DocumentOCR:
    """
    Wrapper untuk Azure AI Document Intelligence.
    
    Responsibilities (Day 4+):
    - Analisis gambar nota, struk, buku kas, rekening koran
    - Ekstrak: total amount, item list, tanggal, merchant name
    - Return confidence score (0.0–1.0) untuk scoring engine
    - Handle berbagai format: jpg, png, pdf (max 10MB)
    """

    SUPPORTED_DOC_TYPES = {
        "nota": "prebuilt-receipt",
        "struk": "prebuilt-receipt",
        "buku_kas": "prebuilt-document",
        "rekening_koran": "prebuilt-document",
        "ktp": "prebuilt-idDocument",
        "other": "prebuilt-document",
    }

    def __init__(self) -> None:
        self.endpoint = os.getenv("AZURE_DOCUMENT_ENDPOINT", "")
        self.api_key = os.getenv("AZURE_DOCUMENT_KEY", "")
        # Day 4:
        # self.client = DocumentAnalysisClient(
        #     endpoint=self.endpoint,
        #     credential=AzureKeyCredential(self.api_key)
        # )

    async def analyze_document(
        self,
        file_content: bytes,
        doc_type: str,
        file_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Kirim dokumen ke Azure OCR, kembalikan data terstruktur.
        
        Returns:
            {
                "success": bool,
                "extracted": {
                    "total_amount": float | None,
                    "items": list[dict],
                    "date": str | None,
                    "merchant_name": str | None
                },
                "confidence": float,  # 0.0–1.0
                "raw_text": str
            }
        
        [Placeholder — Day 4]
        """
        # Stub response untuk development
        return {
            "success": True,
            "extracted": {
                "total_amount": None,
                "items": [],
                "date": None,
                "merchant_name": "[OCR Stub — aktif Day 4]",
            },
            "confidence": 0.0,
            "raw_text": "[OCR Stub] Azure Document Intelligence akan aktif di Day 4.",
        }

    def _parse_receipt(self, result: Any) -> dict[str, Any]:
        """
        Parse Azure receipt analysis result ke format standar.
        [Placeholder — Day 4]
        """
        return {}

    def _calculate_confidence(self, result: Any) -> float:
        """
        Hitung aggregate confidence score dari hasil Azure OCR.
        [Placeholder — Day 4]
        """
        return 0.0
