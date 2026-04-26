"""
app/modules/documents/router.py — Document Upload & OCR Endpoints
POST /v1/sessions/{session_id}/documents → Upload dokumen
GET  /v1/sessions/{session_id}/documents → List dokumen
"""
from __future__ import annotations

import hashlib
import io
import uuid
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, DBClient
from app.core.logging import get_logger
from app.infra.ai.azure import get_azure_client
from app.modules.documents.forensics import analyze_document_forensics

logger = get_logger(__name__)
router = APIRouter(tags=["Documents"])

ALLOWED_DOC_TYPES = {
    "nota", "struk", "ktp", "buku_kas", "rekening_koran",
    "foto_usaha", "screenshot_marketplace", "video_pitching", "other"
}
MAX_FILE_SIZE_MB = 10


class DocumentResponse(BaseModel):
    document_id: str
    session_id: str
    doc_type: str
    file_url: str
    file_name: str | None
    ocr_status: str
    ocr_confidence: float | None
    ocr_extracted_amount: int | None
    ocr_extracted_date: str | None
    duplicate_flag: bool
    image_forgery_score: float | None
    created_at: str


@router.post("/{session_id}/documents", response_model=DocumentResponse, status_code=201)
async def upload_document(
    session_id: str,
    user: CurrentUser,
    db: DBClient,
    file: UploadFile = File(...),
    doc_type: str = Form("other"),
) -> DocumentResponse:
    """Upload dokumen dan proses OCR + forensics."""
    # Verify session
    session = _get_session(db, session_id, user["id"])

    # Validate doc_type
    if doc_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_DOC_TYPE", "message": f"doc_type harus salah satu dari: {', '.join(ALLOWED_DOC_TYPES)}"})

    # Read file
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail={"code": "FILE_TOO_LARGE", "message": f"Maksimum file size {MAX_FILE_SIZE_MB}MB"})

    # Generate file path: {user_id}/{session_id}/{doc_id}.ext
    doc_id = str(uuid.uuid4())
    ext = (file.filename or "file").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    storage_path = f"{user['id']}/{session_id}/{doc_id}.{ext}"

    # Upload ke Supabase Storage
    try:
        storage_result = db.storage.from_("documents").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
        from app.core.config import get_settings
        settings = get_settings()
        file_url = f"{settings.supabase_url}/storage/v1/object/sign/documents/{storage_path}"
    except Exception as exc:
        logger.error("storage_upload_failed", error=str(exc))
        raise HTTPException(status_code=500, detail={"code": "STORAGE_ERROR", "message": "Gagal upload file"})

    # ── Forensics (untuk image/PDF) ──────────────────────────
    forensics = {"image_phash": None, "exif_meta": None, "image_forgery_score": 0.0,
                 "has_exif": False, "exif_plausible": True, "duplicate_flag": False}
    if doc_type in ("foto_usaha", "screenshot_marketplace", "nota", "struk", "ktp"):
        try:
            forensics = await analyze_document_forensics(content, db, session_id)
        except Exception as exc:
            logger.warning("forensics_failed", error=str(exc))

    # ── Azure OCR ────────────────────────────────────────────
    ocr_result = None
    if doc_type in ("nota", "struk", "buku_kas", "rekening_koran", "ktp"):
        try:
            azure = get_azure_client()
            ocr_result = await azure.analyze_document(content, doc_type, file.filename or "document")
        except Exception as exc:
            logger.warning("ocr_failed", error=str(exc))

    # ── Save to DB ───────────────────────────────────────────
    insert_data = {
        "id": doc_id,
        "session_id": session_id,
        "doc_type": doc_type,
        "file_url": file_url,
        "file_name": file.filename,
        "file_size": len(content),
        "ocr_status": "done" if ocr_result and ocr_result.success else ("failed" if ocr_result else "skipped"),
        "ocr_confidence": ocr_result.confidence if ocr_result else None,
        "ocr_raw_text": ocr_result.raw_text if ocr_result else None,
        "ocr_extracted_amount": ocr_result.extracted_amount if ocr_result else None,
        "ocr_extracted_date": str(ocr_result.extracted_date) if ocr_result and ocr_result.extracted_date else None,
        "ocr_merchant_name": ocr_result.merchant_name if ocr_result else None,
        **{k: v for k, v in forensics.items()},
    }

    doc_result = db.table("documents").insert(insert_data).execute()

    # If fraud score high → log fraud signal
    if forensics.get("image_forgery_score", 0) > 0.7:
        try:
            db.rpc("insert_fraud_signal", {
                "p_session_id": session_id,
                "p_business_id": session["business_id"],
                "p_user_id": user["id"],
                "p_type": "forgery_score_high",
                "p_severity": "high",
                "p_details": {"doc_id": doc_id, "forgery_score": forensics["image_forgery_score"]},
            }).execute()
        except Exception as exc:
            logger.warning("fraud_signal_insert_failed", error=str(exc))

    d = doc_result.data[0] if doc_result.data else insert_data
    return DocumentResponse(
        document_id=d.get("id", doc_id),
        session_id=session_id,
        doc_type=doc_type,
        file_url=file_url,
        file_name=file.filename,
        ocr_status=d.get("ocr_status", "skipped"),
        ocr_confidence=d.get("ocr_confidence"),
        ocr_extracted_amount=d.get("ocr_extracted_amount"),
        ocr_extracted_date=d.get("ocr_extracted_date"),
        duplicate_flag=forensics.get("duplicate_flag", False),
        image_forgery_score=forensics.get("image_forgery_score"),
        created_at=d.get("created_at", ""),
    )


@router.get("/{session_id}/documents", response_model=list[DocumentResponse])
async def list_documents(session_id: str, user: CurrentUser, db: DBClient) -> list[DocumentResponse]:
    _get_session(db, session_id, user["id"])
    result = (
        db.table("documents")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [
        DocumentResponse(
            document_id=d["id"],
            session_id=session_id,
            doc_type=d["doc_type"],
            file_url=d["file_url"],
            file_name=d.get("file_name"),
            ocr_status=d.get("ocr_status", "pending"),
            ocr_confidence=d.get("ocr_confidence"),
            ocr_extracted_amount=d.get("ocr_extracted_amount"),
            ocr_extracted_date=d.get("ocr_extracted_date"),
            duplicate_flag=d.get("duplicate_flag", False),
            image_forgery_score=d.get("image_forgery_score"),
            created_at=d["created_at"],
        )
        for d in (result.data or [])
    ]


def _get_session(db, session_id: str, user_id: str) -> dict:
    result = (
        db.table("sessions")
        .select("*, business_profiles!inner(user_id)")
        .eq("id", session_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Sesi tidak ditemukan"})
    if result.data["business_profiles"]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Bukan sesimu"})
    return result.data
