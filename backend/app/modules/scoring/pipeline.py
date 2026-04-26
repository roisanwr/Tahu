"""
app/modules/scoring/pipeline.py — Full Scoring Pipeline Orchestrator
Merangkai semua: hard blocks → sub-scores → multipliers → GCS → final → soft cap → loan rec.
Input: ScoringInput. Output: ScoringResult.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.modules.scoring.engine import (
    WEIGHTS,
    apply_soft_cap,
    calc_C1, calc_C2, calc_S_collateral,
    calc_CH1, calc_CH2, calc_CH3, calc_S_character,
    calc_E1, calc_E2, calc_E3, calc_S_experience,
    calc_F1, calc_F2, calc_F3, calc_S_financial,
    calc_L1, calc_L2, calc_L3, calc_S_location,
    calculate_final_score,
    check_hard_blocks,
    get_risk_level,
    recommend_loan,
)
from app.modules.scoring.multipliers import (
    calc_GCS,
    calc_M_character,
    calc_M_collateral,
    calc_M_experience,
    calc_M_financial,
    calc_M_location,
)
from app.modules.scoring.schemas import (
    CharacterBreakdown,
    CollateralBreakdown,
    ExperienceBreakdown,
    FinancialBreakdown,
    LocationBreakdown,
    LoanRecommendation,
    RawScores,
    ScoringInput,
    ScoringResult,
    SubScoreBreakdown,
)

logger = get_logger(__name__)


def run_scoring_pipeline(data: ScoringInput) -> ScoringResult:
    """
    Complete scoring pipeline V3.1.

    Steps:
    1. Hard blocks check
    2. Calculate sub-scores per pilar
    3. Calculate confidence multipliers
    4. Calculate GCS
    5. Calculate final score (300–850)
    6. Apply soft cap (fraud)
    7. Loan recommendation
    8. Return full ScoringResult
    """
    logger.info("scoring_pipeline_start", session_id=data.session_id, mode=data.mode)

    # ── Step 1: Hard blocks ────────────────────────────────────
    block_result = check_hard_blocks(
        prev_loan_status=data.prev_loan_status,
        prev_loan_amount=data.prev_loan_amount,
        contradiction_count=data.contradiction_count,
    )

    if block_result["blocked"]:
        logger.warning(
            "scoring_hard_block",
            session_id=data.session_id,
            reason=block_result["reason"],
        )
        return ScoringResult(
            session_id=data.session_id,
            final_score=block_result["final_score"],
            risk_level=block_result["risk_level"],
            blocked=True,
            block_reason=block_result["reason"],
            sub_scores={},
            raw_scores=_empty_raw_scores(),
            confidence_multipliers={},
            gcs=0.0,
            gcs_bucket="insufficient",
            data_flag="insufficient",
            fraud_flag=False,
            loan_recommendation=LoanRecommendation(
                eligible=False,
                reason=block_result["reason"],
            ),
            weights=WEIGHTS,
            explanation=f"Aplikasi ditolak: {block_result['reason']}",
        )

    # ── Step 2: Sub-scores ────────────────────────────────────
    mode = data.mode

    # Financial
    F1 = calc_F1(data.monthly_revenue, data.monthly_expense, data.business_category, mode)
    F2 = calc_F2(data.monthly_revenue, data.transaction_frequency_daily, data.has_multiple_months)
    F3 = calc_F3(data.has_qris, data.has_ewallet, data.bank_linked, data.qris_verified) if mode == "advanced" else 0.0
    S_fin = calc_S_financial(F1, F2, F3, mode)

    # Collateral
    C1 = calc_C1(data.assets_estimate, data.monthly_revenue, data.asset_type)
    C2 = calc_C2(data.has_fixed_location, data.photo_verified, data.photo_condition_score)
    S_col = calc_S_collateral(C1, C2)

    # Experience
    E1 = calc_E1(data.years_operating)
    E2 = calc_E2(data.employee_count, data.has_wa_business)
    E3 = calc_E3(data.loan_count, data.prev_loan_status, data.years_since_last_loan)
    S_exp = calc_S_experience(E1, E2, E3)

    # Location
    L1 = calc_L1(data.market_distance_km)
    L2 = calc_L2(data.business_count_500m)
    L3 = calc_L3(data.road_type, data.road_access, data.bank_nearby)
    S_loc = calc_S_location(L1, L2, L3)

    # Character
    CH1 = calc_CH1(data.marketplace_rating, data.marketplace_review_count, data.marketplace_monthly_orders, data.socmed_followers)
    CH2 = calc_CH2(data.sentiment_score, data.completeness_pct, data.contradiction_count)
    CH3 = calc_CH3(data.psychometric_score, mode)
    S_char = calc_S_character(CH1, CH2, CH3, mode)

    sub_score_values = [S_fin, S_col, S_exp, S_loc, S_char]
    weight_values = [
        WEIGHTS["financial"],
        WEIGHTS["collateral"],
        WEIGHTS["experience"],
        WEIGHTS["location"],
        WEIGHTS["character"],
    ]

    # ── Step 3: Multipliers ───────────────────────────────────
    M_fin = calc_M_financial(
        data.ocr_docs_count, data.ocr_avg_confidence,
        data.self_vs_ocr_delta_pct, mode == "advanced", data.has_anomaly,
    )
    M_col = calc_M_collateral(
        data.photo_count, data.has_exif,
        data.exif_plausible, data.photo_forgery_score,
    )
    M_exp = calc_M_experience(data.has_loan_docs, data.years_verifiable)
    M_loc = calc_M_location(data.gps_plausibility_score, data.device_vs_pin_km)
    M_char = calc_M_character(
        data.has_marketplace, data.has_psychometric, data.sentiment_confidence,
    )

    multiplier_values = [M_fin, M_col, M_exp, M_loc, M_char]

    # Fraud flag: M_financial di 0.50 = anomaly detected
    fraud_flag = data.has_anomaly or (M_fin == 0.50 and data.has_anomaly)

    # ── Step 4: GCS ───────────────────────────────────────────
    gcs, gcs_bucket = calc_GCS(multiplier_values, weight_values)

    # ── Step 5: Final score ───────────────────────────────────
    raw_final = calculate_final_score(sub_score_values, multiplier_values, weight_values)

    # ── Step 6: Soft cap ──────────────────────────────────────
    final_score = apply_soft_cap(raw_final, fraud_flag)
    risk_level = get_risk_level(final_score)

    # ── Step 7: Loan recommendation ───────────────────────────
    loan_dict = recommend_loan(final_score, data.monthly_revenue, fraud_flag)
    loan_rec = LoanRecommendation(**loan_dict)

    # ── Build result ──────────────────────────────────────────
    pillar_names = ["financial", "collateral", "experience", "location", "character"]
    sub_scores = {
        name: SubScoreBreakdown(
            raw=round(s, 2),
            multiplier=round(m, 3),
            adjusted=round(s * m, 2),
            weight=w,
        )
        for name, s, m, w in zip(pillar_names, sub_score_values, multiplier_values, weight_values)
    }

    raw_scores = RawScores(
        financial=FinancialBreakdown(F1=round(F1, 2), F2=round(F2, 2), F3=round(F3, 2) if mode == "advanced" else None, S_financial=round(S_fin, 2)),
        collateral=CollateralBreakdown(C1=round(C1, 2), C2=round(C2, 2), S_collateral=round(S_col, 2)),
        experience=ExperienceBreakdown(E1=round(E1, 2), E2=round(E2, 2), E3=round(E3, 2), S_experience=round(S_exp, 2)),
        location=LocationBreakdown(L1=round(L1, 2), L2=round(L2, 2), L3=round(L3, 2), S_location=round(S_loc, 2)),
        character=CharacterBreakdown(CH1=round(CH1, 2), CH2=round(CH2, 2), CH3=round(CH3, 2), S_character=round(S_char, 2)),
    )

    logger.info(
        "scoring_pipeline_complete",
        session_id=data.session_id,
        final_score=final_score,
        risk_level=risk_level,
        gcs=round(gcs, 3),
        fraud_flag=fraud_flag,
    )

    return ScoringResult(
        session_id=data.session_id,
        final_score=final_score,
        risk_level=risk_level,
        sub_scores=sub_scores,
        raw_scores=raw_scores,
        confidence_multipliers={
            "financial": round(M_fin, 3),
            "collateral": round(M_col, 3),
            "experience": round(M_exp, 3),
            "location": round(M_loc, 3),
            "character": round(M_char, 3),
        },
        gcs=round(gcs, 4),
        gcs_bucket=gcs_bucket,
        data_flag=gcs_bucket,
        fraud_flag=fraud_flag,
        loan_recommendation=loan_rec,
        weights=WEIGHTS,
    )


def _empty_raw_scores() -> RawScores:
    return RawScores(
        financial=FinancialBreakdown(F1=0, F2=0, F3=None, S_financial=0),
        collateral=CollateralBreakdown(C1=0, C2=0, S_collateral=0),
        experience=ExperienceBreakdown(E1=0, E2=0, E3=0, S_experience=0),
        location=LocationBreakdown(L1=0, L2=0, L3=0, S_location=0),
        character=CharacterBreakdown(CH1=0, CH2=0, CH3=0, S_character=0),
    )
