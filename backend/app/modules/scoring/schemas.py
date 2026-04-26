"""
app/modules/scoring/schemas.py — Pydantic schemas untuk Scoring Engine
Input/output contracts yang ketat dan typed.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


# ── Input ─────────────────────────────────────────────────────

class ScoringInput(BaseModel):
    """Semua data yang dibutuhkan scoring engine. From session + business profile."""
    session_id: str
    mode: Literal["basic", "advanced"] = "basic"

    # ── Financial (F1, F2, F3) ──
    monthly_revenue: int = Field(0, ge=0)
    monthly_expense: int = Field(0, ge=0)
    transaction_frequency_daily: int = Field(0, ge=0)
    has_multiple_months: bool = False
    business_category: str = "lainnya"

    # F3 — Advanced only
    has_qris: bool = False
    qris_verified: bool = False
    has_ewallet: bool = False
    bank_linked: bool = False

    # ── Collateral (C1, C2) ──
    assets_estimate: int = Field(0, ge=0)
    asset_type: Literal["property", "vehicle", "equipment", "inventory", "mixed"] = "mixed"
    has_fixed_location: bool = False
    photo_verified: bool = False      # foto usaha berhasil di-upload
    photo_condition_score: float = Field(50.0, ge=0.0, le=100.0)

    # ── Experience (E1, E2, E3) ──
    years_operating: float = Field(0.0, ge=0.0)
    employee_count: int = Field(0, ge=0)
    has_wa_business: bool = False
    loan_count: int = Field(0, ge=0)
    prev_loan_status: Literal["lunas", "cicilan_lancar", "macet", "belum_ada"] = "belum_ada"
    prev_loan_amount: int = Field(0, ge=0)
    years_since_last_loan: float = Field(0.0, ge=0.0)

    # ── Location (L1, L2, L3) — dari geospatial_scores ──
    market_distance_km: float = Field(5.0, ge=0.0)
    business_count_500m: int = Field(0, ge=0)
    road_type: str = "other"
    road_access: bool = False
    bank_nearby: bool = False

    # ── Character (CH1, CH2, CH3) ──
    marketplace_rating: float = Field(0.0, ge=0.0, le=5.0)
    marketplace_review_count: int = Field(0, ge=0)
    marketplace_monthly_orders: int = Field(0, ge=0)
    socmed_followers: int = Field(0, ge=0)
    sentiment_score: float = Field(0.0, ge=-1.0, le=1.0)
    completeness_pct: float = Field(50.0, ge=0.0, le=100.0)
    contradiction_count: int = Field(0, ge=0)
    psychometric_score: float = Field(50.0, ge=0.0, le=100.0)

    # ── Multiplier inputs ──
    ocr_docs_count: int = Field(0, ge=0)
    ocr_avg_confidence: float = Field(0.0, ge=0.0, le=1.0)
    self_vs_ocr_delta_pct: float = Field(0.0, ge=0.0)
    has_anomaly: bool = False
    photo_count: int = Field(0, ge=0)
    has_exif: bool = False
    exif_plausible: bool = True
    photo_forgery_score: float = Field(0.0, ge=0.0, le=1.0)
    has_loan_docs: bool = False
    years_verifiable: bool = False
    gps_plausibility_score: float = Field(0.75, ge=0.0, le=1.0)
    device_vs_pin_km: float = Field(0.0, ge=0.0)
    has_marketplace: bool = False
    has_psychometric: bool = False
    sentiment_confidence: Literal["high", "medium", "low"] = "medium"


# ── Sub-score results ─────────────────────────────────────────

class SubScoreBreakdown(BaseModel):
    raw: float           # 0–100 sebelum multiplier
    multiplier: float    # 0.50–1.00
    adjusted: float      # raw × multiplier
    weight: float        # bobot pilar


class FinancialBreakdown(BaseModel):
    F1: float
    F2: float
    F3: float | None
    S_financial: float


class CollateralBreakdown(BaseModel):
    C1: float
    C2: float
    S_collateral: float


class ExperienceBreakdown(BaseModel):
    E1: float
    E2: float
    E3: float
    S_experience: float


class LocationBreakdown(BaseModel):
    L1: float
    L2: float
    L3: float
    S_location: float


class CharacterBreakdown(BaseModel):
    CH1: float
    CH2: float
    CH3: float
    S_character: float


class RawScores(BaseModel):
    financial: FinancialBreakdown
    collateral: CollateralBreakdown
    experience: ExperienceBreakdown
    location: LocationBreakdown
    character: CharacterBreakdown


class LoanRecommendation(BaseModel):
    eligible: bool
    max_amount: int = 0
    tenor_months: int = 0
    interest_range: str = "N/A"
    reason: str | None = None


# ── Final Output ──────────────────────────────────────────────

class ScoringResult(BaseModel):
    """Output lengkap dari scoring pipeline. Disimpan ke credit_assessments."""
    session_id: str
    final_score: int = Field(..., ge=300, le=850)
    risk_level: str
    blocked: bool = False
    block_reason: str | None = None

    sub_scores: dict[str, SubScoreBreakdown]
    raw_scores: RawScores
    confidence_multipliers: dict[str, float]

    gcs: float
    gcs_bucket: Literal["sufficient", "limited", "insufficient"]
    data_flag: Literal["sufficient", "limited", "insufficient"]
    fraud_flag: bool = False

    loan_recommendation: LoanRecommendation
    weights: dict[str, float]

    explanation: str = ""
    extras: dict[str, Any] = {}
