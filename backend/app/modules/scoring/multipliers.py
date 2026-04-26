"""
app/modules/scoring/multipliers.py — Confidence Multipliers V3.1
Setiap pilar punya multiplier 0.50–1.00 yang merepresentasikan
seberapa reliable data yang mendukung skor pilar tersebut.
"""
from __future__ import annotations

from typing import Literal

from app.modules.scoring.engine import _clamp


def calc_M_financial(
    ocr_docs_count: int,
    ocr_avg_confidence: float,
    self_vs_ocr_delta_pct: float,
    has_F3: bool,
    has_anomaly: bool,
) -> float:
    """M_financial: 0.50–1.00. Base: 0.60."""
    m = 0.60

    if ocr_docs_count >= 2:
        m += 0.15
    elif ocr_docs_count == 1:
        m += 0.08

    if ocr_avg_confidence >= 0.90:
        m += 0.10
    elif ocr_avg_confidence >= 0.75:
        m += 0.05

    if self_vs_ocr_delta_pct <= 10:
        m += 0.10
    elif self_vs_ocr_delta_pct <= 20:
        m += 0.05
    elif self_vs_ocr_delta_pct > 30:
        m -= 0.10   # penalty: data tidak konsisten dengan OCR

    if has_F3:
        m += 0.05   # digital cashflow tersedia

    if has_anomaly:   # wash-trading heuristic triggered
        return 0.50  # FRAUD FLAG → triggers soft cap

    return _clamp(m, 0.50, 1.00)


def calc_M_collateral(
    photo_count: int,
    has_exif: bool,
    exif_plausible: bool,
    photo_forgery_score: float,
) -> float:
    """M_collateral: 0.50–1.00. Base: 0.65."""
    m = 0.65

    if photo_count >= 2:
        m += 0.10
    if has_exif and exif_plausible:
        m += 0.10
    if photo_forgery_score < 0.3:
        m += 0.10   # low forgery risk
    elif photo_forgery_score > 0.7:
        m -= 0.15   # high forgery risk

    if photo_count == 0:
        m = 0.50    # floor jika tidak ada foto sama sekali

    return _clamp(m, 0.50, 1.00)


def calc_M_experience(
    has_loan_docs: bool,
    years_verifiable: bool,
) -> float:
    """M_experience: 0.50–1.00. Base: 0.70."""
    m = 0.70
    if has_loan_docs:
        m += 0.15
    if years_verifiable:
        m += 0.15
    return _clamp(m, 0.50, 1.00)


def calc_M_location(
    gps_plausibility_score: float,
    device_vs_pin_km: float,
) -> float:
    """M_location: 0.50–1.00. Base: 0.75."""
    m = 0.75

    if gps_plausibility_score >= 0.9:
        m += 0.15
    elif gps_plausibility_score >= 0.7:
        m += 0.05
    else:
        m -= 0.10

    if device_vs_pin_km > 2.0:
        m -= 0.15   # suspicious: device GPS jauh dari pin manual
    elif device_vs_pin_km > 1.0:
        m -= 0.05

    return _clamp(m, 0.50, 1.00)


def calc_M_character(
    has_marketplace: bool,
    has_psychometric: bool,
    sentiment_confidence: Literal["high", "medium", "low"],
) -> float:
    """M_character: 0.50–1.00. Base: 0.65."""
    m = 0.65
    if has_marketplace:
        m += 0.15
    if has_psychometric:
        m += 0.10
    if sentiment_confidence == "high":
        m += 0.10
    elif sentiment_confidence == "medium":
        m += 0.05
    return _clamp(m, 0.50, 1.00)


def calc_GCS(
    multipliers: list[float],
    weights: list[float],
) -> tuple[float, str]:
    """
    Global Confidence Score = Σ(M_i × w_i)
    
    Returns: (gcs_value, bucket)
    Buckets:
      >= 0.90 → "sufficient"
      >= 0.75 → "limited"
      <  0.75 → "insufficient"
    """
    gcs = sum(m * w for m, w in zip(multipliers, weights))
    gcs = _clamp(gcs, 0.0, 1.0)

    if gcs >= 0.90:
        bucket = "sufficient"
    elif gcs >= 0.75:
        bucket = "limited"
    else:
        bucket = "insufficient"

    return gcs, bucket
