"""
routers/documents.py — Document Upload & OCR Endpoints

POST /v1/upload-document → Upload file + Azure OCR extraction
"""
from __future__ import annotations

import os
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from supabase import Client

from database import get_supabase
from document_ocr import DocumentOCR
from models.schemas import DocumentUploadResponse, OCRExtracted

router = APIRouter(prefix="/upload-document", tags=["Documents"])

_ocr = DocumentOCR()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp", "application/pdf"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

VALID_DOC_TYPES = {
    "nota", "struk", "ktp", "buku_kas",
    "rekening_koran", "foto_usaha", "screenshot_marketplace", "other"
}


@router.post(
    "",
    response_model=DocumentUploadResponse,
    summary="Upload dokumen dan ekstrak via Azure OCR",
)
async def upload_document(
    session_id: UUID = Form(...),
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    db: Client = Depends(get_supabase),
) -> DocumentUploadResponse:
    """
    Terima file upload (foto nota/struk/ktp/dll),
    simpan ke Supabase Storage, jalankan Azure OCR,
    simpan hasil ke tabel documents.
    
    Full Azure OCR integration: Day 4.
    """
    # Validasi doc_type
    if doc_type not in VALID_DOC_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": f"doc_type '{doc_type}' tidak valid. Pilihan: {sorted(VALID_DOC_TYPES)}",
            },
        )

    # Validasi content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VALIDATION_ERROR",
                "message": f"Format file tidak didukung: {file.content_type}. Gunakan jpg/png/pdf.",
            },
        )

    # Baca file
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": "Ukuran file melebihi 10MB"},
        )

    # Upload ke Supabase Storage (bucket: "documents")
    file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
    storage_path = f"{session_id}/{uuid4()}.{file_ext}"

    try:
        db.storage.from_("documents").upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": file.content_type},
        )
        file_url = db.storage.from_("documents").get_public_url(storage_path)
    except Exception:
        # Jika storage belum dikonfigurasi, gunakan placeholder URL
        file_url = f"[storage-pending]/{storage_path}"

    # Jalankan OCR (stub hingga Day 4)
    ocr_result = await _ocr.analyze_document(
        file_content=file_content,
        doc_type=doc_type,
        file_url=file_url,
    )

    # Simpan record ke tabel documents
    doc_id = str(uuid4())
    db.table("documents").insert(
        {
            "id": doc_id,
            "session_id": str(session_id),
            "doc_type": doc_type,
            "file_url": file_url,
            "file_size": len(file_content),
            "ocr_status": "done" if ocr_result["success"] else "failed",
            "ocr_result": ocr_result.get("extracted"),
            "ocr_confidence": ocr_result.get("confidence"),
            "ocr_raw_text": ocr_result.get("raw_text"),
        }
    ).execute()

    extracted = ocr_result.get("extracted") or {}
    return DocumentUploadResponse(
        document_id=UUID(doc_id),
        doc_type=doc_type,
        ocr_status="success" if ocr_result["success"] else "failed",
        extracted=OCRExtracted(**extracted) if extracted else None,
        confidence=ocr_result.get("confidence"),
        raw_text=ocr_result.get("raw_text"),
    )
