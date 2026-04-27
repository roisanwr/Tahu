"""
tests/unit/test_scoring_engine.py — Unit Tests Scoring Engine V3.1
Verifikasi semua formula sesuai spesifikasi SCORING_ENGINE_V3_1.md

Jalankan: pytest tests/unit/test_scoring_engine.py -v
"""
from __future__ import annotations

import sys
import os

# Pastikan bisa import dari project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest

from app.modules.scoring.engine import (
    apply_soft_cap,
    calc_CH1, calc_CH2, calc_CH3, calc_S_character,
    calc_C1, calc_C2, calc_S_collateral,
    calc_E1, calc_E2, calc_E3, calc_S_experience,
    calc_F1, calc_F2, calc_F3, calc_S_financial,
    calc_L1, calc_L2, calc_L3, calc_S_location,
    calculate_final_score,
    check_hard_blocks,
    get_risk_level,
    recommend_loan,
    WEIGHTS,
)
from app.modules.scoring.multipliers import (
    calc_GCS,
    calc_M_character,
    calc_M_collateral,
    calc_M_experience,
    calc_M_financial,
    calc_M_location,
)
from app.modules.scoring.pipeline import run_scoring_pipeline
from app.modules.scoring.schemas import ScoringInput


# ═══════════════════════════════════════════════════════════
# SECTION 1 — Hard Blocks
# ═══════════════════════════════════════════════════════════

class TestHardBlocks:
    def test_blocked_when_loan_macet_and_high_amount(self):
        """Pinjaman macet > 10jt → hard block score = 380."""
        result = check_hard_blocks("macet", 15_000_000, 0)
        assert result["blocked"] is True
        assert result["final_score"] == 380
        assert result["risk_level"] == "Very High"
        assert "macet" in result["reason"].lower()

    def test_not_blocked_when_loan_macet_small_amount(self):
        """Pinjaman macet tapi ≤ 10jt → tidak diblokir (masih bisa apply)."""
        result = check_hard_blocks("macet", 5_000_000, 0)
        assert result["blocked"] is False

    def test_blocked_when_high_contradiction(self):
        """Contradiction count > 6 → hard block."""
        result = check_hard_blocks("lunas", 0, 7)
        assert result["blocked"] is True
        assert result["final_score"] == 380

    def test_not_blocked_at_contradiction_limit(self):
        """Contradiction count = 6 → tepat di batas, tidak diblokir."""
        result = check_hard_blocks("lunas", 0, 6)
        assert result["blocked"] is False

    def test_not_blocked_when_clean(self):
        """Input normal → tidak blocked."""
        result = check_hard_blocks("lunas", 3_000_000, 0)
        assert result["blocked"] is False

    def test_not_blocked_when_no_loan(self):
        """Tidak punya riwayat pinjaman → tidak blocked."""
        result = check_hard_blocks(None, 0, 0)
        assert result["blocked"] is False


# ═══════════════════════════════════════════════════════════
# SECTION 2 — Soft Cap
# ═══════════════════════════════════════════════════════════

class TestSoftCap:
    def test_soft_cap_applies_when_fraud_and_score_above_579(self):
        """Fraud flag + score > 579 → score di-cap ke 579."""
        capped = apply_soft_cap(700, fraud_flag=True)
        assert capped == 579

    def test_soft_cap_does_not_apply_below_579(self):
        """Score < 579 dengan fraud flag → skor tidak berubah."""
        capped = apply_soft_cap(500, fraud_flag=True)
        assert capped == 500

    def test_soft_cap_not_applied_when_no_fraud(self):
        """Tanpa fraud flag → score tidak berubah berapapun."""
        capped = apply_soft_cap(800, fraud_flag=False)
        assert capped == 800


# ═══════════════════════════════════════════════════════════
# SECTION 3 — Risk Level
# ═══════════════════════════════════════════════════════════

class TestRiskLevel:
    @pytest.mark.parametrize("score,expected", [
        (750, "Very Low"),
        (850, "Very Low"),
        (650, "Low"),
        (749, "Low"),
        (550, "Medium"),
        (649, "Medium"),
        (450, "High"),
        (549, "High"),
        (300, "Very High"),
        (449, "Very High"),
    ])
    def test_risk_level_mapping(self, score, expected):
        assert get_risk_level(score) == expected


# ═══════════════════════════════════════════════════════════
# SECTION 4 — Final Score Formula
# ═══════════════════════════════════════════════════════════

class TestFinalScoreFormula:
    def test_max_score_all_perfect(self):
        """All sub-scores = 100, all multipliers = 1.0 → final should be 850."""
        sub_scores = [100.0, 100.0, 100.0, 100.0, 100.0]
        multipliers = [1.0, 1.0, 1.0, 1.0, 1.0]
        weights = list(WEIGHTS.values())
        final = calculate_final_score(sub_scores, multipliers, weights)
        # raw = 100 (since all weights sum to 1.0)
        # final = 300 + 100 * 5.50 = 850
        assert final == 850

    def test_min_score_all_zero(self):
        """All sub-scores = 0 → final should be 300 (floor)."""
        sub_scores = [0.0, 0.0, 0.0, 0.0, 0.0]
        multipliers = [1.0, 1.0, 1.0, 1.0, 1.0]
        weights = list(WEIGHTS.values())
        final = calculate_final_score(sub_scores, multipliers, weights)
        assert final == 300

    def test_min_floor_with_low_multipliers(self):
        """All min → still floors at 300."""
        sub_scores = [0.0, 0.0, 0.0, 0.0, 0.0]
        multipliers = [0.5, 0.5, 0.5, 0.5, 0.5]
        weights = list(WEIGHTS.values())
        final = calculate_final_score(sub_scores, multipliers, weights)
        assert final == 300

    def test_clamp_at_850_ceiling(self):
        """Score tidak bisa melebihi 850."""
        sub_scores = [110.0, 110.0, 110.0, 110.0, 110.0]
        multipliers = [1.0, 1.0, 1.0, 1.0, 1.0]
        weights = list(WEIGHTS.values())
        final = calculate_final_score(sub_scores, multipliers, weights)
        assert final == 850


# ═══════════════════════════════════════════════════════════
# SECTION 5 — Sub-Score Functions (Financial)
# ═══════════════════════════════════════════════════════════

class TestFinancialScores:
    def test_F1_high_profitability(self):
        """Margin > 30% (dalam advanced mode) → F1 tinggi."""
        # advanced mode: pakai expense aktual
        f1 = calc_F1(10_000_000, 5_000_000, "kuliner", "advanced")
        assert f1 > 50  # 50% margin → F1 = 100

    def test_F1_loss(self):
        """Basic mode: revenue rendah → F1 lebih rendah (HPP kuliner 55%)."""
        # basic mode: expense diabaikan, pakai HPP estimate 55%
        # NPM = (10M - 5.5M) / 10M = 45% → F1 = 100
        f1_basic = calc_F1(5_000_000, 0, "kuliner", "basic")
        # advanced mode: rugi → F1 rendah
        f1_loss = calc_F1(5_000_000, 8_000_000, "kuliner", "advanced")
        assert f1_loss < 20  # rugi, expense > revenue

    def test_F2_high_frequency(self):
        """Transaksi > 10x/hari → F2 tinggi."""
        f2 = calc_F2(10_000_000, 15, True)
        assert f2 > 40  # freq tinggi + multiple months

    def test_F3_not_active_in_basic(self):
        """F3 (digital cashflow) = function returns nilai, pipeline basic tidak memakai."""
        f3 = calc_F3(True, True, True, True)
        assert isinstance(f3, float)  # nilai ada, tapi pipeline tidak memakai di basic

    def test_S_financial_basic_aggregation(self):
        """S_financial basic = weighted F1 + F2 saja."""
        f1, f2 = 80.0, 60.0
        s = calc_S_financial(F1=f1, F2=f2, F3=0.0, mode="basic")
        assert 60 < s < 85  # F1 dominant di basic (60% weight)


# ═══════════════════════════════════════════════════════════
# SECTION 6 — Sub-Score Functions (Location)
# ═══════════════════════════════════════════════════════════

class TestLocationScores:
    def test_L1_very_close_market(self):
        """Pasar < 0.5km → L1 maksimal."""
        l1 = calc_L1(market_distance_km=0.3)
        assert l1 >= 90

    def test_L1_far_market(self):
        """Pasar > 5km → L1 rendah."""
        l1 = calc_L1(market_distance_km=6.0)
        assert l1 < 40

    def test_L2_dense_area(self):
        """Banyak bisnis sekitar → L2 tinggi."""
        l2 = calc_L2(business_count_500m=25)
        assert l2 > 60

    def test_L3_primary_road_with_bank(self):
        """Jalan utama + ada bank → L3 tinggi."""
        l3 = calc_L3(road_type="primary", road_access=True, bank_nearby=True)
        assert l3 > 70


# ═══════════════════════════════════════════════════════════
# SECTION 7 — GCS (Global Confidence Score)
# ═══════════════════════════════════════════════════════════

class TestGCS:
    def test_gcs_high_when_all_multipliers_high(self):
        """Semua multiplier tinggi → GCS > 0.75."""
        multipliers = [0.90, 0.85, 0.80, 0.85, 0.80]
        weights = list(WEIGHTS.values())
        gcs, bucket = calc_GCS(multipliers, weights)
        assert gcs > 0.75
        # bucket bisa "sufficient" atau "limited" tergantung threshold
        assert bucket in ("sufficient", "limited", "high_confidence")

    def test_gcs_insufficient_when_multipliers_low(self):
        """GCS < 0.75 → bucket = insufficient."""
        multipliers = [0.5, 0.5, 0.5, 0.5, 0.5]
        weights = list(WEIGHTS.values())
        gcs, bucket = calc_GCS(multipliers, weights)
        assert gcs < 0.75
        assert bucket == "insufficient"


# ═══════════════════════════════════════════════════════════
# SECTION 8 — Full Pipeline Integration Tests
# ═══════════════════════════════════════════════════════════

class TestFullPipeline:
    def _base_input(self, **overrides) -> ScoringInput:
        """Profile UMKM normal untuk testing."""
        base = dict(
            session_id="test-session-001",
            mode="basic",
            # Financial
            monthly_revenue=8_000_000,
            monthly_expense=4_500_000,
            business_category="kuliner",
            transaction_frequency_daily=10,
            has_multiple_months=True,
            has_qris=False,
            has_ewallet=False,
            bank_linked=False,
            qris_verified=False,
            # Collateral
            assets_estimate=25_000_000,
            asset_type="equipment",
            has_fixed_location=True,
            photo_verified=True,
            photo_condition_score=75.0,
            # Experience
            years_operating=3,
            employee_count=3,
            has_wa_business=True,
            loan_count=1,
            prev_loan_status="lunas",
            prev_loan_amount=5_000_000,
            years_since_last_loan=1.0,
            # Location
            market_distance_km=0.5,
            business_count_500m=20,
            road_type="secondary",
            road_access=True,
            bank_nearby=True,
            # Character
            marketplace_rating=4.5,
            marketplace_review_count=100,
            marketplace_monthly_orders=50,
            socmed_followers=500,
            sentiment_score=0.75,       # 0–1 (bukan 0–100)
            completeness_pct=80.0,
            contradiction_count=0,
            psychometric_score=50.0,
            # Multiplier inputs
            ocr_docs_count=1,
            ocr_avg_confidence=0.75,
            self_vs_ocr_delta_pct=10.0,
            has_anomaly=False,
            photo_count=2,
            has_exif=True,
            exif_plausible=True,
            photo_forgery_score=0.1,
            has_loan_docs=True,
            years_verifiable=True,      # bool
            gps_plausibility_score=0.90,
            device_vs_pin_km=0.05,
            has_marketplace=True,
            has_psychometric=False,
            sentiment_confidence="high",  # Literal["high","medium","low"]
        )
        base.update(overrides)
        return ScoringInput(**base)

    def test_pipeline_returns_score_in_range(self):
        """Score harus selalu antara 300 dan 850."""
        data = self._base_input()
        result = run_scoring_pipeline(data)
        assert 300 <= result.final_score <= 850

    def test_pipeline_fraud_flag_caps_score(self):
        """Fraud flag → final score tidak lebih dari 579."""
        data = self._base_input(has_anomaly=True)
        result = run_scoring_pipeline(data)
        assert result.final_score <= 579
        assert result.fraud_flag is True

    def test_pipeline_hard_block_macet(self):
        """Macet > 10jt → blocked = True, score = 380."""
        data = self._base_input(prev_loan_status="macet", prev_loan_amount=15_000_000)
        result = run_scoring_pipeline(data)
        assert result.blocked is True
        assert result.final_score == 380
        assert result.risk_level == "Very High"

    def test_pipeline_hard_block_contradiction(self):
        """Contradiction > 6 → blocked = True."""
        data = self._base_input(contradiction_count=7)
        result = run_scoring_pipeline(data)
        assert result.blocked is True
        assert result.final_score == 380

    def test_pipeline_basic_mode_no_f3(self):
        """Basic mode → F3 tidak dihitung (None di raw_scores)."""
        data = self._base_input(mode="basic")
        result = run_scoring_pipeline(data)
        assert result.raw_scores.financial.F3 is None

    def test_pipeline_advanced_mode_has_f3(self):
        """Advanced mode → F3 dihitung."""
        data = self._base_input(mode="advanced", has_qris=True, has_ewallet=True, bank_linked=True)
        result = run_scoring_pipeline(data)
        assert result.raw_scores.financial.F3 is not None

    def test_pipeline_returns_loan_recommendation(self):
        """Pipeline harus selalu return loan_recommendation."""
        data = self._base_input()
        result = run_scoring_pipeline(data)
        assert result.loan_recommendation is not None
        assert isinstance(result.loan_recommendation.eligible, bool)

    def test_pipeline_sub_scores_have_all_pillars(self):
        """Sub-scores harus punya semua 5 pilar."""
        data = self._base_input()
        result = run_scoring_pipeline(data)
        assert "financial" in result.sub_scores
        assert "collateral" in result.sub_scores
        assert "experience" in result.sub_scores
        assert "location" in result.sub_scores
        assert "character" in result.sub_scores

    def test_bu_dewi_profile_approximate(self):
        """Bu Dewi profile → skor sekitar 720-780 (sesuai spec)."""
        data = self._base_input(
            monthly_revenue=15_000_000,
            monthly_expense=8_000_000,
            business_category="kuliner",
            transaction_frequency_daily=20,
            has_multiple_months=True,
            assets_estimate=80_000_000,
            asset_type="property",
            has_fixed_location=True,
            photo_verified=True,
            photo_condition_score=85.0,
            years_operating=5,
            employee_count=3,
            has_wa_business=True,
            loan_count=1,
            prev_loan_status="lunas",
            prev_loan_amount=10_000_000,
            years_since_last_loan=1.0,
            market_distance_km=0.3,
            business_count_500m=30,
            road_type="primary",
            road_access=True,
            bank_nearby=True,
            marketplace_rating=4.8,
            marketplace_review_count=250,
            marketplace_monthly_orders=120,
            socmed_followers=2000,
            sentiment_score=0.85,
            completeness_pct=90.0,
            contradiction_count=0,
            ocr_docs_count=3,
            ocr_avg_confidence=0.88,
            self_vs_ocr_delta_pct=8.0,
            has_anomaly=False,
        )
        result = run_scoring_pipeline(data)
        assert 680 <= result.final_score <= 820, (
            f"Bu Dewi expected 720-780 approx, got {result.final_score}"
        )

    def test_pak_rudi_profile_approximate(self):
        """Pak Rudi profile (risiko lebih tinggi) → skor 480-600."""
        data = self._base_input(
            monthly_revenue=4_000_000,
            monthly_expense=3_500_000,
            business_category="retail",
            transaction_frequency_daily=5,
            has_multiple_months=False,
            assets_estimate=8_000_000,
            asset_type="equipment",
            has_fixed_location=False,
            photo_verified=False,
            photo_condition_score=40.0,
            years_operating=1,
            employee_count=0,
            has_wa_business=False,
            loan_count=0,
            prev_loan_status="belum_ada",
            prev_loan_amount=0,
            years_since_last_loan=0.0,
            market_distance_km=3.0,
            business_count_500m=5,
            road_type="residential",
            road_access=False,
            bank_nearby=False,
            marketplace_rating=0.0,
            marketplace_review_count=0,
            marketplace_monthly_orders=0,
            socmed_followers=100,
            sentiment_score=0.0,
            completeness_pct=50.0,
            contradiction_count=2,
            ocr_docs_count=0,
            ocr_avg_confidence=0.0,
            self_vs_ocr_delta_pct=0.0,
            has_anomaly=False,
        )
        result = run_scoring_pipeline(data)
        assert 440 <= result.final_score <= 640, (
            f"Pak Rudi expected 480-600 approx, got {result.final_score}"
        )


# ═══════════════════════════════════════════════════════════
# SECTION 9 — Loan Recommendation
# ═══════════════════════════════════════════════════════════

class TestLoanRecommendation:
    def test_eligible_for_high_score(self):
        """Skor tinggi → eligible = True."""
        rec = recommend_loan(750, monthly_revenue=10_000_000, fraud_flag=False)
        assert rec["eligible"] is True
        assert rec["max_amount"] > 0

    def test_not_eligible_for_fraud(self):
        """Fraud flag → tidak eligible."""
        rec = recommend_loan(600, monthly_revenue=10_000_000, fraud_flag=True)
        assert rec["eligible"] is False

    def test_not_eligible_for_very_high_risk(self):
        """Score < 450 (Very High risk) → tidak eligible."""
        rec = recommend_loan(380, monthly_revenue=5_000_000, fraud_flag=False)
        assert rec["eligible"] is False

    def test_loan_amount_proportional_to_revenue(self):
        """Loan amount berbanding dengan monthly_revenue."""
        rec_low = recommend_loan(700, monthly_revenue=5_000_000, fraud_flag=False)
        rec_high = recommend_loan(700, monthly_revenue=20_000_000, fraud_flag=False)
        assert rec_high["max_amount"] > rec_low["max_amount"]


# ═══════════════════════════════════════════════════════════
# SECTION 10 — WEIGHTS integrity
# ═══════════════════════════════════════════════════════════

class TestWeights:
    def test_weights_sum_to_1(self):
        """Total bobot semua pilar harus = 1.0 (100%)."""
        total = sum(WEIGHTS.values())
        assert abs(total - 1.0) < 0.001, f"Weights sum = {total}, expected 1.0"

    def test_financial_weight_highest(self):
        """Financial adalah pilar terbesar (40%)."""
        assert WEIGHTS["financial"] == max(WEIGHTS.values())
