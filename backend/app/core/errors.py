"""
app/core/errors.py — Error Taxonomy
Semua error yang mungkin terjadi di aplikasi dengan HTTP code yang konsisten.
Tidak ada lebih exception-swallowing atau semua-jadi-500.
"""
from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base untuk semua application errors."""
    status_code: int = 500
    code: str = "INTERNAL_ERROR"
    message: str = "Terjadi kesalahan pada server"

    def __init__(self, message: str | None = None, details: Any = None) -> None:
        self.message = message or self.__class__.message
        self.details = details
        super().__init__(self.message)

    def to_dict(self, request_id: str = "") -> dict:
        payload: dict = {
            "error": {
                "code": self.code,
                "message": self.message,
            }
        }
        if self.details:
            payload["error"]["details"] = self.details
        if request_id:
            payload["error"]["request_id"] = request_id
        return payload


# ── 400 ──────────────────────────────────────────────────────
class ValidationError(AppError):
    status_code = 400
    code = "VALIDATION_ERROR"
    message = "Data yang dikirim tidak valid"


class PlausibilityError(AppError):
    status_code = 400
    code = "PLAUSIBILITY_ERROR"
    message = "Data angka tidak masuk akal, mohon periksa kembali"


# ── 401 ──────────────────────────────────────────────────────
class AuthError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
    message = "Autentikasi diperlukan"


class TokenExpiredError(AuthError):
    code = "TOKEN_EXPIRED"
    message = "Sesi telah berakhir, silakan login kembali"


# ── 403 ──────────────────────────────────────────────────────
class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"
    message = "Kamu tidak memiliki akses ke resource ini"


# ── 404 ──────────────────────────────────────────────────────
class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    message = "Resource tidak ditemukan"


# ── 409 ──────────────────────────────────────────────────────
class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    message = "Resource sudah ada atau ada konflik"


class SessionLimitError(ConflictError):
    code = "SESSION_LIMIT"
    message = "Batas maksimum sesi aktif telah tercapai"


# ── 429 ──────────────────────────────────────────────────────
class RateLimitError(AppError):
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"
    message = "Terlalu banyak request, coba sebentar lagi"


# ── 500 / 502 / 503 ──────────────────────────────────────────
class InternalError(AppError):
    status_code = 500
    code = "INTERNAL_ERROR"
    message = "Terjadi kesalahan pada server"


class ScoringError(InternalError):
    code = "SCORING_ERROR"
    message = "Gagal menghitung credit score"


class OCRError(AppError):
    status_code = 502
    code = "OCR_FAILED"
    message = "Gagal memproses dokumen (Azure OCR error)"


class GeminiError(AppError):
    status_code = 502
    code = "AI_ERROR"
    message = "Gagal memproses pesan AI"


class DatabaseError(AppError):
    status_code = 503
    code = "DATABASE_ERROR"
    message = "Gagal terhubung ke database"
