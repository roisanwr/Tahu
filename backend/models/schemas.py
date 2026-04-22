"""
models/schemas.py — Pydantic Request/Response Models
Kontrak API sesuai API_SPEC.md
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────
# 1. Health
# ─────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    timestamp: datetime


# ─────────────────────────────────────────────
# 2. Sessions
# ─────────────────────────────────────────────
class SessionCreate(BaseModel):
    user_id: UUID
    mode: Literal["basic", "advanced"] = "basic"


class SessionResponse(BaseModel):
    session_id: UUID
    user_id: UUID
    status: Literal["active", "completed", "expired", "abandoned"]
    interview_stage: Literal["intro", "profil", "keuangan", "dokumen", "geolokasi", "summary"]
    mode: Literal["basic", "advanced"]
    progress_pct: int = Field(ge=0, le=100)
    created_at: datetime
    updated_at: datetime


class SessionCreateResponse(BaseModel):
    session_id: UUID
    status: str
    interview_stage: str
    created_at: datetime


# ─────────────────────────────────────────────
# 3. Chat
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: UUID
    message: str = Field(min_length=1, max_length=4000)
    message_type: Literal["text", "image", "location"] = "text"


class ChatResponse(BaseModel):
    ai_response: str
    interview_stage: str
    progress_pct: int = Field(ge=0, le=100)
    extracted_data: dict[str, Any] | None = None
    ui_component: Literal["map_picker", "file_upload", "summary_card"] | None = None


# ─────────────────────────────────────────────
# 4. Document Upload / OCR
# ─────────────────────────────────────────────
class OCRItem(BaseModel):
    name: str
    qty: int | None = None
    price: float | None = None


class OCRExtracted(BaseModel):
    total_amount: float | None = None
    items: list[OCRItem] = []
    date: str | None = None
    merchant_name: str | None = None


class DocumentUploadResponse(BaseModel):
    document_id: UUID
    doc_type: str
    ocr_status: Literal["success", "failed", "skipped"]
    extracted: OCRExtracted | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    raw_text: str | None = None


# ─────────────────────────────────────────────
# 5. Geospatial Scoring
# ─────────────────────────────────────────────
class GeoScoreRequest(BaseModel):
    session_id: UUID
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: str | None = None


class GeoFactorDetail(BaseModel):
    score: int = Field(ge=0, le=100)
    nearest: str | None = None
    distance_km: float | None = None
    count_500m: int | None = None
    road_access: bool | None = None
    bank_nearby: bool | None = None


class GeoScoreResponse(BaseModel):
    location_score: int = Field(ge=0, le=100)
    factors: dict[str, GeoFactorDetail]
    coordinates: dict[str, float]


# ─────────────────────────────────────────────
# 6. Credit Scoring
# ─────────────────────────────────────────────
class ScoreCalculateRequest(BaseModel):
    session_id: UUID


class SubScoreDetail(BaseModel):
    score: int = Field(ge=0, le=100)
    weight: float = Field(ge=0.0, le=1.0)


class LoanRecommendation(BaseModel):
    max_amount: int
    suggested_tenor: int
    interest_range: str


class ScoreResponse(BaseModel):
    assessment_id: UUID
    final_score: int = Field(ge=300, le=850)
    risk_level: Literal["Very Low", "Low", "Medium", "High", "Very High"]
    sub_scores: dict[str, SubScoreDetail]
    explanation: str
    loan_recommendation: LoanRecommendation


# ─────────────────────────────────────────────
# 7. Error (standar semua endpoint)
# ─────────────────────────────────────────────
class ErrorResponse(BaseModel):
    error: bool = True
    code: str
    message: str
    details: dict[str, Any] = {}
