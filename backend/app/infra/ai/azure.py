"""
app/infra/ai/azure.py — Azure AI Document Intelligence Client (Stub Mode)
Ketika Azure belum dikonfigurasi, pakai stub yang return dummy data.
Swap ke real implementation saat AZURE_DOCUMENT_KEY terisi.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class OCRResult:
    """Hasil ekstraksi dari Azure Document Intelligence."""
    success: bool
    confidence: float                       # 0.0–1.0
    raw_text: str = ""
    extracted_amount: int | None = None     # total nominal dalam Rupiah
    extracted_date: str | None = None       # tanggal dokumen (ISO format)
    merchant_name: str | None = None        # nama merchant/toko
    items: list[dict] = field(default_factory=list)
    raw_response: dict = field(default_factory=dict)
    error: str | None = None


class AzureOCRClient:
    """
    Azure AI Document Intelligence wrapper.
    Supports: nota, struk, buku_kas, rekening_koran, ktp
    """

    def __init__(self, endpoint: str, key: str) -> None:
        self._endpoint = endpoint
        self._key = key
        self._configured = (
            key not in ("placeholder", "xxxx", "")
            and "placeholder" not in endpoint
        )
        if not self._configured:
            logger.warning(
                "azure_ocr_stub_mode",
                msg="Azure OCR tidak dikonfigurasi. Pakai stub mode — tidak ada OCR nyata.",
            )
        else:
            logger.info("azure_ocr_initialized", endpoint=endpoint)

    async def analyze_document(
        self,
        file_bytes: bytes,
        doc_type: str,
        filename: str = "document",
    ) -> OCRResult:
        """
        Analyze dokumen dengan Azure Document Intelligence.
        
        doc_type: nota|struk|buku_kas|rekening_koran|ktp|foto_usaha|other
        """
        if not self._configured:
            return self._stub_result(doc_type)

        try:
            from azure.ai.documentintelligence import DocumentIntelligenceClient
            from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
            from azure.core.credentials import AzureKeyCredential

            client = DocumentIntelligenceClient(
                endpoint=self._endpoint,
                credential=AzureKeyCredential(self._key),
            )

            # Pilih model berdasarkan doc_type
            model_id = self._get_model_id(doc_type)

            poller = client.begin_analyze_document(
                model_id=model_id,
                body=AnalyzeDocumentRequest(bytes_source=file_bytes),
                timeout=30,
            )
            result = poller.result()

            return self._parse_result(result, doc_type)

        except ImportError:
            logger.warning("azure_sdk_not_installed", hint="pip install azure-ai-documentintelligence")
            return self._stub_result(doc_type)
        except Exception as exc:
            logger.error("azure_ocr_error", error=str(exc), doc_type=doc_type)
            return OCRResult(success=False, confidence=0.0, error=str(exc))

    def _get_model_id(self, doc_type: str) -> str:
        mapping = {
            "nota": "prebuilt-receipt",
            "struk": "prebuilt-receipt",
            "ktp": "prebuilt-idDocument",
            "buku_kas": "prebuilt-document",
            "rekening_koran": "prebuilt-document",
        }
        return mapping.get(doc_type, "prebuilt-document")

    def _parse_result(self, result: Any, doc_type: str) -> OCRResult:
        """Parse Azure response ke OCRResult."""
        try:
            raw_text_parts = []
            extracted_amount = None
            extracted_date = None
            merchant_name = None
            confidence_scores = []

            for doc in result.documents or []:
                confidence_scores.append(doc.confidence or 0.0)

                for field_name, field_val in (doc.fields or {}).items():
                    if field_val is None:
                        continue
                    raw_text_parts.append(f"{field_name}: {field_val.content}")

                    fn_lower = field_name.lower()
                    if "total" in fn_lower and field_val.value_number:
                        extracted_amount = int(field_val.value_number)
                    if "date" in fn_lower and field_val.value_date:
                        extracted_date = str(field_val.value_date)
                    if "merchant" in fn_lower and field_val.content:
                        merchant_name = field_val.content

            avg_confidence = (
                sum(confidence_scores) / len(confidence_scores)
                if confidence_scores else 0.5
            )

            return OCRResult(
                success=True,
                confidence=avg_confidence,
                raw_text="\n".join(raw_text_parts),
                extracted_amount=extracted_amount,
                extracted_date=extracted_date,
                merchant_name=merchant_name,
            )
        except Exception as exc:
            logger.error("azure_parse_error", error=str(exc))
            return OCRResult(success=False, confidence=0.0, error=str(exc))

    def _stub_result(self, doc_type: str) -> OCRResult:
        """Stub result saat Azure belum dikonfigurasi."""
        return OCRResult(
            success=True,
            confidence=0.70,   # medium confidence untuk stub
            raw_text=f"[STUB] Dokumen {doc_type} diterima. Azure OCR belum dikonfigurasi.",
            extracted_amount=None,
            error=None,
        )


_azure_singleton: AzureOCRClient | None = None


def get_azure_client() -> AzureOCRClient:
    """Singleton Azure OCR client."""
    from app.core.config import get_settings
    import app.infra.ai.azure as _mod
    if _mod._azure_singleton is None:
        settings = get_settings()
        _mod._azure_singleton = AzureOCRClient(
            endpoint=settings.azure_document_endpoint,
            key=settings.azure_document_key,
        )
    return _mod._azure_singleton
