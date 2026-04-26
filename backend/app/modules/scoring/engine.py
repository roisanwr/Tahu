"""
app/modules/scoring/engine.py — Scoring Engine V3.1 Pure Functions
ZERO database dependencies. Semua input via parameter. Deterministic & testable.

Source of truth: docs/scoringv3/SCORING_ENGINE_V3_1.md
"""
from __future__ import annotations

from typing import Literal


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


# ─────────────────────────────────────────────────────────────
# CATEGORY HPP TABLE (untuk Basic mode F1)
# ─────────────────────────────────────────────────────────────
CATEGORY_HPP: dict[str, float] = {
    "kuliner": 0.55,
    "retail": 0.65,
    "jasa": 0.30,
    "online": 0.40,
    "produksi": 0.50,
    "lainnya": 0.50,   # default
}

ROAD_SCORES: dict[str, int] = {
    "trunk": 30,
    "primary": 25,
    "secondary": 20,
    "residential": 10,
    "other": 5,
}

WEIGHTS = {
    "financial": 0.40,
    "collateral": 0.25,
    "experience": 0.15,
    "location": 0.10,
    "character": 0.10,
}

# ─────────────────────────────────────────────────────────────
# S_FINANCIAL
# ─────────────────────────────────────────────────────────────

def calc_F1(
    revenue: int,
    expense: int,
    category: str = "lainnya",
    mode: Literal["basic", "advanced"] = "basic",
) -> float:
    """F1 — Profitability (0–100). Piecewise linear normalization."""
    if revenue <= 0:
        return 5.0

    if mode == "basic":
        hpp_ratio = CATEGORY_HPP.get(category.lower(), 0.50)
        expense = int(revenue * hpp_ratio)

    npm = (revenue - expense) / revenue

    if npm >= 0.30:
        return 100.0
    elif npm >= 0.20:
        return 70.0 + (npm - 0.20) / 0.10 * 30
    elif npm >= 0.10:
        return 40.0 + (npm - 0.10) / 0.10 * 30
    elif npm >= 0.05:
        return 20.0 + (npm - 0.05) / 0.05 * 20
    elif npm > 0:
        return 5.0 + (npm / 0.05) * 15
    else:
        return 5.0  # floor — tidak pernah 0


def calc_F2(
    revenue: int,
    tx_freq_daily: int,
    has_multiple_months: bool = False,
) -> float:
    """F2 — Volume & Consistency (0–100)."""
    # Revenue tier (0–50)
    if revenue >= 50_000_000:
        rev = 50
    elif revenue >= 20_000_000:
        rev = 40
    elif revenue >= 10_000_000:
        rev = 30
    elif revenue >= 5_000_000:
        rev = 20
    elif revenue >= 2_000_000:
        rev = 15
    else:
        rev = 5

    # Transaction frequency (0–30)
    if tx_freq_daily >= 20:
        tx = 30
    elif tx_freq_daily >= 10:
        tx = 25
    elif tx_freq_daily >= 5:
        tx = 15
    elif tx_freq_daily >= 1:
        tx = 10
    else:
        tx = 5

    # Consistency bonus (0–20)
    consistency = 20 if has_multiple_months else 5

    return min(float(rev + tx + consistency), 100.0)


def calc_F3(
    has_qris: bool,
    has_ewallet: bool,
    bank_linked: bool,
    qris_verified: bool,
) -> float:
    """F3 — Digital Cashflow (0–100). Advanced mode only."""
    score = 0.0
    if has_qris:
        score += 25
    if qris_verified:
        score += 25
    if has_ewallet:
        score += 20
    if bank_linked:
        score += 30
    return min(score, 100.0)


def calc_S_financial(
    F1: float,
    F2: float,
    F3: float,
    mode: Literal["basic", "advanced"] = "basic",
) -> float:
    """Aggregasi S_financial. Basic mode: F1×0.65 + F2×0.35. Advanced: F1×0.50 + F2×0.30 + F3×0.20."""
    if mode == "basic":
        return F1 * 0.65 + F2 * 0.35
    else:
        return F1 * 0.50 + F2 * 0.30 + F3 * 0.20


# ─────────────────────────────────────────────────────────────
# S_COLLATERAL
# ─────────────────────────────────────────────────────────────

LIQUIDATION_FACTORS: dict[str, float] = {
    "property": 0.80,
    "vehicle": 0.60,
    "equipment": 0.50,
    "inventory": 0.40,
    "mixed": 0.55,
}


def calc_C1(
    assets_estimate: int,
    monthly_revenue: int,
    asset_type: str = "mixed",
) -> float:
    """C1 — Asset Coverage Ratio (0–100)."""
    if monthly_revenue == 0:
        return 10.0

    coverage = assets_estimate / (monthly_revenue * 12)
    lf = LIQUIDATION_FACTORS.get(asset_type, 0.55)
    adj = coverage * lf

    if adj >= 2.0:
        return 100.0
    elif adj >= 1.0:
        return 70.0 + (adj - 1.0) * 30
    elif adj >= 0.5:
        return 40.0 + (adj - 0.5) * 60
    elif adj >= 0.2:
        return 15.0 + (adj - 0.2) * 83.3
    else:
        return max(5.0, adj * 75)


def calc_C2(
    has_fixed_location: bool,
    photo_verified: bool,
    photo_condition_score: float,
) -> float:
    """C2 — Physical Verification (0–100). photo_condition_score: 0–100."""
    score = 0.0
    if has_fixed_location:
        score += 40
    if photo_verified:
        score += 30
    score += photo_condition_score * 0.30   # max 30
    return min(round(score), 100.0)


def calc_S_collateral(C1: float, C2: float) -> float:
    return C1 * 0.70 + C2 * 0.30


# ─────────────────────────────────────────────────────────────
# S_EXPERIENCE
# ─────────────────────────────────────────────────────────────

def calc_E1(years: float) -> float:
    """E1 — Years Operating (0–100)."""
    if years >= 10:
        return 100.0
    elif years >= 5:
        return 70.0 + (years - 5) / 5 * 30
    elif years >= 3:
        return 50.0 + (years - 3) / 2 * 20
    elif years >= 1:
        return 25.0 + (years - 1) / 2 * 25
    elif years >= 0.5:
        return 15.0
    else:
        return 5.0


def calc_E2(employee_count: int, has_wa_business: bool = False) -> float:
    """E2 — Employee & Digital Presence (0–100)."""
    if employee_count >= 20:
        emp = 70
    elif employee_count >= 10:
        emp = 60
    elif employee_count >= 5:
        emp = 45
    elif employee_count >= 2:
        emp = 30
    elif employee_count >= 1:
        emp = 15
    else:
        emp = 5

    wa_bonus = 30 if has_wa_business else 0
    return min(float(emp + wa_bonus), 100.0)


def calc_E3(
    loan_count: int,
    latest_status: str,
    years_since_last: float,
) -> float:
    """E3 — Loan History (0–100)."""
    if loan_count == 0:
        return 50.0   # neutral — belum ada history

    status_base = {
        "lunas": 70,
        "cicilan_lancar": 60,
        "macet": 10,
        "belum_ada": 50,
    }
    base = float(status_base.get(latest_status, 50))

    # Recency bonus
    if years_since_last <= 1:
        recency = 20
    elif years_since_last <= 3:
        recency = 15
    elif years_since_last <= 5:
        recency = 10
    else:
        recency = 5

    # Volume bonus (capped)
    vol_bonus = min(loan_count * 5, 20)

    return min(base + recency + vol_bonus, 100.0)


def calc_S_experience(E1: float, E2: float, E3: float) -> float:
    return E1 * 0.40 + E2 * 0.30 + E3 * 0.30


# ─────────────────────────────────────────────────────────────
# S_LOCATION
# ─────────────────────────────────────────────────────────────

def calc_L1(market_distance_km: float) -> float:
    """L1 — Market Proximity (0–100)."""
    if market_distance_km <= 0.5:
        return 100.0
    elif market_distance_km <= 1.0:
        return 80.0
    elif market_distance_km <= 2.0:
        return 60.0
    elif market_distance_km <= 5.0:
        return 35.0
    elif market_distance_km <= 10.0:
        return 15.0
    else:
        return 5.0


def calc_L2(business_count_500m: int) -> float:
    """L2 — Business Density (0–100)."""
    if business_count_500m >= 50:
        return 100.0
    elif business_count_500m >= 20:
        return 75.0
    elif business_count_500m >= 10:
        return 50.0
    elif business_count_500m >= 5:
        return 30.0
    else:
        return 10.0


def calc_L3(road_type: str, road_access: bool, bank_nearby: bool) -> float:
    """L3 — Infrastructure (0–100)."""
    score = float(ROAD_SCORES.get(road_type, 5))
    if road_access:
        score += 35
    if bank_nearby:
        score += 35
    return min(score, 100.0)


def calc_S_location(L1: float, L2: float, L3: float) -> float:
    return L1 * 0.40 + L2 * 0.30 + L3 * 0.30


# ─────────────────────────────────────────────────────────────
# S_CHARACTER
# ─────────────────────────────────────────────────────────────

def calc_CH1(
    rating: float,
    total_reviews: int,
    monthly_orders: int,
    followers: int = 0,
) -> float:
    """CH1 — Marketplace Reputation (0–100)."""
    if total_reviews == 0 and monthly_orders == 0:
        return 50.0   # neutral — no marketplace

    # Rating component (0–40)
    if rating >= 4.5:
        r = 40
    elif rating >= 4.0:
        r = 30
    elif rating >= 3.5:
        r = 20
    else:
        r = 10

    # Review volume (0–30)
    if total_reviews >= 100:
        rv = 30
    elif total_reviews >= 50:
        rv = 20
    elif total_reviews >= 10:
        rv = 15
    else:
        rv = 5

    # Orders/activity (0–30)
    if monthly_orders >= 50:
        o = 30
    elif monthly_orders >= 20:
        o = 20
    elif monthly_orders >= 5:
        o = 15
    else:
        o = 5

    return min(float(r + rv + o), 100.0)


def calc_CH2(
    sentiment_score: float,
    completeness_pct: float,
    contradiction_count: int,
) -> float:
    """CH2 — Sentiment & Behavioral (0–100)."""
    # Sentiment (0–35) — -1.0 to 1.0
    if sentiment_score >= 0.5:
        sent = 35
    elif sentiment_score >= 0.2:
        sent = 30
    elif sentiment_score >= 0.0:
        sent = 25
    elif sentiment_score >= -0.3:
        sent = 15
    else:
        sent = 5

    # Completeness (0–35)
    if completeness_pct >= 90:
        comp = 35
    elif completeness_pct >= 70:
        comp = 25
    elif completeness_pct >= 50:
        comp = 15
    else:
        comp = 5

    # Contradiction penalty exponential (0–30)
    if contradiction_count == 0:
        hon = 30
    elif contradiction_count <= 1:
        hon = 20
    elif contradiction_count <= 2:
        hon = 10
    elif contradiction_count <= 4:
        hon = 5
    else:
        hon = 0

    return min(float(sent + comp + hon), 100.0)


def calc_CH3(
    psychometric_score: float,
    mode: Literal["basic", "advanced"] = "basic",
) -> float:
    """CH3 — Psychometric (0–100). Basic mode → default 50."""
    if mode == "basic":
        return 50.0
    return _clamp(psychometric_score, 0.0, 100.0)


def calc_S_character(
    CH1: float,
    CH2: float,
    CH3: float,
    mode: Literal["basic", "advanced"] = "basic",
) -> float:
    return CH1 * 0.50 + CH2 * 0.30 + CH3 * 0.20


# ─────────────────────────────────────────────────────────────
# FINAL SCORE & POST-PROCESSING
# ─────────────────────────────────────────────────────────────

def calculate_final_score(
    sub_scores: list[float],
    multipliers: list[float],
    weights: list[float],
) -> int:
    """
    Step 1: Apply multipliers → adjusted
    Step 2: Weighted aggregation → raw_score (0–100)
    Step 3: Map to 300–850: final = 300 + raw_score × 5.50
    Step 4: Clamp [300, 850]
    """
    adjusted = [s * m for s, m in zip(sub_scores, multipliers)]
    raw_score = sum(a * w for a, w in zip(adjusted, weights))
    final = round(300 + raw_score * 5.50)
    return max(300, min(850, final))


def get_risk_level(score: int) -> str:
    if score >= 750:
        return "Very Low"
    elif score >= 650:
        return "Low"
    elif score >= 550:
        return "Medium"
    elif score >= 450:
        return "High"
    else:
        return "Very High"


def check_hard_blocks(
    prev_loan_status: str,
    prev_loan_amount: int,
    contradiction_count: int,
) -> dict:
    """Return {'blocked': bool, 'final_score': int, 'reason': str}."""
    if prev_loan_status == "macet" and prev_loan_amount > 10_000_000:
        return {
            "blocked": True,
            "final_score": 380,
            "risk_level": "Very High",
            "reason": "Riwayat pinjaman macet lebih dari Rp 10 juta",
        }
    if contradiction_count > 6:
        return {
            "blocked": True,
            "final_score": 380,
            "risk_level": "Very High",
            "reason": "Terlalu banyak kontradiksi dalam jawaban",
        }
    return {"blocked": False}


def apply_soft_cap(final_score: int, fraud_flag: bool) -> int:
    """Jika fraud flag aktif → cap skor di 579."""
    if fraud_flag:
        return min(final_score, 579)
    return final_score


def recommend_loan(
    final_score: int,
    monthly_revenue: int,
    fraud_flag: bool,
) -> dict:
    """Rekomendasi pinjaman berdasarkan skor."""
    if fraud_flag:
        return {
            "eligible": False,
            "max_amount": 0,
            "tenor_months": 0,
            "interest_range": "N/A",
            "reason": "Terdeteksi anomali data — perlu verifikasi manual",
        }

    if final_score >= 750:
        return {
            "eligible": True,
            "max_amount": monthly_revenue * 3,
            "tenor_months": 24,
            "interest_range": "10-14%",
        }
    elif final_score >= 650:
        return {
            "eligible": True,
            "max_amount": monthly_revenue * 2,
            "tenor_months": 12,
            "interest_range": "14-18%",
        }
    elif final_score >= 550:
        return {
            "eligible": True,
            "max_amount": monthly_revenue * 1,
            "tenor_months": 6,
            "interest_range": "18-24%",
        }
    elif final_score >= 450:
        return {
            "eligible": True,
            "max_amount": int(monthly_revenue * 0.5),
            "tenor_months": 3,
            "interest_range": "24-30%",
        }
    else:
        return {
            "eligible": False,
            "max_amount": 0,
            "tenor_months": 0,
            "interest_range": "N/A",
            "reason": "Skor terlalu rendah untuk rekomendasi pinjaman",
        }
