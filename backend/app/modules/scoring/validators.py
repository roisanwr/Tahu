"""
app/modules/scoring/validators.py — Server-side Validation Rules
Source: docs/scoringv3/SCORING_V3_1_MITIGATIONS.md
Semua validasi di sini deterministic — tidak melibatkan LLM.
"""
from __future__ import annotations

import math
import re
from datetime import date, datetime


# ── NIK Validation ───────────────────────────────────────────

def validate_nik(nik: str) -> dict:
    """NIK harus 16 digit numerik dengan checksum valid."""
    if not nik or not nik.isdigit() or len(nik) != 16:
        return {"valid": False, "reason": "Format NIK harus 16 digit numerik"}

    # Basic checksum (adapted)
    s = sum(int(d) for d in nik)
    if s % 7 == 0:
        return {"valid": False, "reason": "NIK checksum tidak valid"}

    return {"valid": True}


# ── Numeric Range Validation ─────────────────────────────────

BPS_MEDIAN_REVENUE = {
    "kuliner": 8_000_000,
    "retail": 15_000_000,
    "jasa": 6_000_000,
    "online": 10_000_000,
    "produksi": 12_000_000,
    "lainnya": 10_000_000,
}


def validate_numeric_ranges(
    revenue: int,
    expense: int,
    tx_freq: int,
    assets: int,
) -> list[dict]:
    """
    Validasi range numerik. Return list of flags.
    Empty list = tidak ada masalah.
    """
    flags = []

    # Revenue
    if revenue <= 0:
        flags.append({"field": "monthly_revenue", "type": "zero_revenue", "severity": "critical"})
    elif revenue > 1_000_000_000:
        flags.append({"field": "monthly_revenue", "type": "revenue_too_high", "severity": "warning"})

    # Expense
    if expense < 0:
        flags.append({"field": "monthly_expense", "type": "negative_expense", "severity": "error"})
    elif expense > revenue and revenue > 0:
        flags.append({"field": "monthly_expense", "type": "expense_exceeds_revenue", "severity": "warning"})

    # Transaction frequency
    if tx_freq > 10_000:
        flags.append({"field": "tx_freq_daily", "type": "tx_freq_unrealistic", "severity": "error"})

    # Assets
    if assets < 0:
        flags.append({"field": "assets_estimate", "type": "negative_assets", "severity": "error"})
    elif revenue > 0 and assets > 100 * revenue:
        flags.append({"field": "assets_estimate", "type": "assets_100x_revenue", "severity": "warning"})

    return flags


def check_cross_field(
    revenue: int,
    expense: int,
    tx_freq: int,
    category: str,
) -> list[dict]:
    """Cross-field consistency checks."""
    flags = []

    # Thin margin untuk trading categories
    if revenue > 0 and (revenue - expense) < 0.05 * revenue:
        if category in ("retail", "kuliner"):
            flags.append({
                "type": "thin_margin",
                "severity": "medium",
                "hint": "Margin sangat tipis, pertimbangkan klarifikasi HPP",
            })

    # Avg ticket implausible
    if tx_freq > 0 and revenue > 0:
        avg_ticket = revenue / (tx_freq * 30)
        if avg_ticket > 5_000_000:
            flags.append({
                "type": "high_avg_ticket",
                "severity": "medium",
                "hint": f"Rata-rata transaksi Rp {avg_ticket:,.0f} — sangat tinggi untuk UMKM",
            })

    return flags


def check_revenue_plausibility(revenue: int, category: str) -> dict:
    """Bandingkan revenue dengan BPS median per kategori."""
    median = BPS_MEDIAN_REVENUE.get(category.lower(), 10_000_000)

    if revenue > median * 10:
        return {"plausible": False, "flag": "revenue_10x_above_median"}
    if revenue > 0 and revenue < median * 0.05:
        return {"plausible": False, "flag": "revenue_extremely_low"}
    return {"plausible": True}


# ── GPS Validation ────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Hitung jarak antara dua titik GPS dalam kilometer."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# Indonesia bounding box
INDONESIA_LAT = (-11.0, 6.1)
INDONESIA_LON = (95.0, 141.1)


def validate_gps(
    device_lat: float | None,
    device_lon: float | None,
    manual_lat: float | None = None,
    manual_lon: float | None = None,
) -> dict:
    """
    Validasi koordinat GPS.
    Return: {plausibility_score, flag, device_vs_pin_km}
    """
    if device_lat is None or device_lon is None:
        return {"plausibility_score": 0.5, "flag": "gps_not_provided", "device_vs_pin_km": 0.0}

    # Indonesia bounding box check
    if not (INDONESIA_LAT[0] <= device_lat <= INDONESIA_LAT[1]):
        return {"plausibility_score": 0.0, "flag": "gps_outside_indonesia", "device_vs_pin_km": 0.0}
    if not (INDONESIA_LON[0] <= device_lon <= INDONESIA_LON[1]):
        return {"plausibility_score": 0.0, "flag": "gps_outside_indonesia", "device_vs_pin_km": 0.0}

    # Compare device vs manual pin
    if manual_lat is not None and manual_lon is not None:
        dist_km = haversine_km(device_lat, device_lon, manual_lat, manual_lon)
        if dist_km > 5.0:
            return {"plausibility_score": 0.1, "flag": "gps_mismatch_critical", "device_vs_pin_km": dist_km}
        elif dist_km > 2.0:
            return {"plausibility_score": 0.4, "flag": "gps_mismatch_warning", "device_vs_pin_km": dist_km}
        elif dist_km > 1.0:
            return {"plausibility_score": 0.7, "flag": "gps_minor_offset", "device_vs_pin_km": dist_km}
        else:
            return {"plausibility_score": 1.0, "flag": None, "device_vs_pin_km": dist_km}

    return {"plausibility_score": 0.85, "flag": None, "device_vs_pin_km": 0.0}


# ── Document Age Validation ───────────────────────────────────

def check_document_age(
    ocr_date: date | str | None,
    session_created_at: datetime | str,
    max_age_days: int = 90,
) -> dict:
    """Dokumen harus <= 90 hari dari session creation date."""
    if ocr_date is None:
        return {"valid": True, "age_days": None, "warning": None}

    try:
        if isinstance(ocr_date, str):
            ocr_date = date.fromisoformat(ocr_date)
        if isinstance(session_created_at, str):
            session_created_at = datetime.fromisoformat(session_created_at)

        session_date = session_created_at.date() if isinstance(session_created_at, datetime) else session_created_at
        age_days = (session_date - ocr_date).days

        if age_days > max_age_days:
            return {
                "valid": False,
                "age_days": age_days,
                "warning": f"Dokumen terlalu lama ({age_days} hari). Maksimum {max_age_days} hari.",
            }
        return {"valid": True, "age_days": age_days, "warning": None}
    except Exception:
        return {"valid": True, "age_days": None, "warning": None}
