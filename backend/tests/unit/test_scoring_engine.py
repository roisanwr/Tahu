"""
tests/unit/test_scoring_engine.py — Unit Tests Scoring Engine V3.1
WAJIB semua hijau sebelum lanjut ke Sprint 2.
Test cases dari SCORING_ENGINE_V3_1.md Section 10.
"""
from __future__ import annotations

import pytest

from app.modules.scoring.engine import (
    apply_soft_cap,
    calc_F1, calc_F2, calc_F3, calc_S_financial,
    calc_C1, calc_C2, calc_S_collateral,
    calc_E1, calc_E2, calc_E3, calc_S_experience,
    calc_L1, calc_L2, calc_L3,
    calc_CH1, calc_CH2,
    calculate_final_score,
    check_hard_blocks,
    get_risk_level,
    recommend_loan,
)
from app.modules.scoring.multipliers import calc_GCS, calc_M_financial
from app.modules.scoring.pipeline import run_scoring_pipeline
from app.modules.scoring.schemas import ScoringInput


# ─────────────────────────────────────────────────────────────
# ENGINE — Final Score Boundary Tests
# ─────────────────────────────────────────────────────────────

class TestFinalScoreBoundaries:
    def test_all_max_all_multiplier_max(self):
        """All scores=100, all M=1.0 → final = 850."""
        sub_scores = [100.0, 100.0, 100.0, 100.0, 100.0]
        multipliers = [1.0, 1.0, 1.0, 1.0, 1.0]
        weights = [0.40, 0.25, 0.15, 0.10, 0.10]
        result = calculate_final_score(sub_scores, multipliers, weights)
        assert result == 850

    def test_all_min_scores_min_multipliers(self):
        """All scores=0, all M=0.5 → final = 300."""
        sub_scores = [0.0, 0.0, 0.0, 0.0, 0.0]
        multipliers = [0.5, 0.5, 0.5, 0.5, 0.5]
        weights = [0.40, 0.25, 0.15, 0.10, 0.10]
        result = calculate_final_score(sub_scores, multipliers, weights)
        assert result == 300

    def test_weights_sum_to_one(self):
        """Weights harus sum ke 1.0."""
        from app.modules.scoring.engine import WEIGHTS
        assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


# ─────────────────────────────────────────────────────────────
# HARD BLOCKS
# ─────────────────────────────────────────────────────────────

class TestHardBlocks:
    def test_macet_over_10jt_triggers_block(self):
        result = check_hard_blocks("macet", 15_000_000, 0)
        assert result["blocked"] is True
        assert result["final_score"] == 380

    def test_macet_under_10jt_no_block(self):
        result = check_hard_blocks("macet", 5_000_000, 0)
        assert result["blocked"] is False

    def test_contradiction_over_6_triggers_block(self):
        result = check_hard_blocks("lunas", 0, 7)
        assert result["blocked"] is True
        assert result["final_score"] == 380

    def test_contradiction_6_no_block(self):
        result = check_hard_blocks("lunas", 0, 6)
        assert result["blocked"] is False

    def test_no_issue_no_block(self):
        result = check_hard_blocks("lunas", 5_000_000, 2)
        assert result["blocked"] is False


# ─────────────────────────────────────────────────────────────
# SOFT CAP
# ─────────────────────────────────────────────────────────────

class TestSoftCap:
    def test_fraud_flag_caps_at_579(self):
        assert apply_soft_cap(700, True) == 579

    def test_fraud_flag_below_579_unchanged(self):
        assert apply_soft_cap(500, True) == 500

    def test_no_fraud_flag_unchanged(self):
        assert apply_soft_cap(700, False) == 700
        assert apply_soft_cap(850, False) == 850


# ─────────────────────────────────────────────────────────────
# S_FINANCIAL
# ─────────────────────────────────────────────────────────────

class TestFinancialScore:
    def test_f1_perfect_margin(self):
        """NPM >= 30% → F1 = 100."""
        score = calc_F1(10_000_000, 6_000_000)  # NPM = 40%
        assert score == 100.0

    def test_f1_basic_mode_uses_hpp(self):
        """Basic mode: expense diestimasi dari HPP, bukan input user."""
        # Kuliner HPP = 0.55, revenue = 10jt → expense_est = 5.5jt → NPM = 45%
        score_basic = calc_F1(10_000_000, 0, "kuliner", "basic")
        # Advanced mode dengan expense = 5.5jt
        score_adv = calc_F1(10_000_000, 5_500_000, "kuliner", "advanced")
        assert score_basic == score_adv  # harus sama

    def test_f1_zero_revenue_returns_floor(self):
        assert calc_F1(0, 0) == 5.0

    def test_f2_high_revenue_high_freq(self):
        score = calc_F2(60_000_000, 25, True)
        assert score == 100.0  # 50 + 30 + 20 = 100

    def test_f2_consistency_bonus(self):
        s1 = calc_F2(5_000_000, 5, True)
        s2 = calc_F2(5_000_000, 5, False)
        assert s1 > s2  # multiple months = lebih tinggi

    def test_f3_advanced_full(self):
        score = calc_F3(True, True, True, True)
        assert score == 100.0  # 25+25+20+30 = 100

    def test_s_financial_basic_no_f3(self):
        """Basic mode: F3 tidak masuk perhitungan."""
        s = calc_S_financial(80.0, 60.0, 100.0, "basic")
        expected = 80.0 * 0.65 + 60.0 * 0.35
        assert abs(s - expected) < 0.01


# ─────────────────────────────────────────────────────────────
# S_COLLATERAL
# ─────────────────────────────────────────────────────────────

class TestCollateralScore:
    def test_c1_high_coverage(self):
        # Assets 2x annual revenue × liquidation factor property (0.8) = 1.6 → 94
        score = calc_C1(24_000_000, 1_000_000, "property")
        assert score > 80

    def test_c2_full_verification(self):
        score = calc_C2(True, True, 100.0)
        assert score == 100.0  # 40 + 30 + 30

    def test_c2_no_location_no_photo(self):
        score = calc_C2(False, False, 0.0)
        assert score == 0.0


# ─────────────────────────────────────────────────────────────
# S_EXPERIENCE
# ─────────────────────────────────────────────────────────────

class TestExperienceScore:
    def test_e1_10_plus_years(self):
        assert calc_E1(10) == 100.0
        assert calc_E1(15) == 100.0

    def test_e1_fresh_start(self):
        assert calc_E1(0.2) == 5.0

    def test_e3_no_loan_neutral(self):
        assert calc_E3(0, "belum_ada", 0) == 50.0

    def test_e3_macet_low(self):
        score = calc_E3(1, "macet", 1)
        assert score < 40  # base 10 + recency bonus = max 30


# ─────────────────────────────────────────────────────────────
# GCS
# ─────────────────────────────────────────────────────────────

class TestGCS:
    def test_gcs_sufficient(self):
        multipliers = [0.95, 0.90, 0.95, 0.92, 0.88]
        weights = [0.40, 0.25, 0.15, 0.10, 0.10]
        gcs, bucket = calc_GCS(multipliers, weights)
        assert bucket == "sufficient"
        assert gcs >= 0.90

    def test_gcs_insufficient(self):
        multipliers = [0.50, 0.50, 0.50, 0.50, 0.50]
        weights = [0.40, 0.25, 0.15, 0.10, 0.10]
        gcs, bucket = calc_GCS(multipliers, weights)
        assert bucket == "insufficient"
        assert gcs < 0.75


# ─────────────────────────────────────────────────────────────
# RISK LEVEL MAPPING
# ─────────────────────────────────────────────────────────────

class TestRiskLevel:
    def test_very_low(self):
        assert get_risk_level(800) == "Very Low"

    def test_very_high(self):
        assert get_risk_level(350) == "Very High"

    def test_boundary_650(self):
        assert get_risk_level(650) == "Low"
        assert get_risk_level(649) == "Medium"


# ─────────────────────────────────────────────────────────────
# LOAN RECOMMENDATION
# ─────────────────────────────────────────────────────────────

class TestLoanRecommendation:
    def test_fraud_flag_not_eligible(self):
        rec = recommend_loan(700, 10_000_000, True)
        assert rec["eligible"] is False

    def test_high_score_eligible(self):
        rec = recommend_loan(800, 10_000_000, False)
        assert rec["eligible"] is True
        assert rec["max_amount"] == 30_000_000  # 3x monthly revenue

    def test_very_low_score_not_eligible(self):
        rec = recommend_loan(400, 10_000_000, False)
        assert rec["eligible"] is False


# ─────────────────────────────────────────────────────────────
# FULL PIPELINE
# ─────────────────────────────────────────────────────────────

class TestFullPipeline:
    def _make_input(self, **overrides) -> ScoringInput:
        """Create baseline ScoringInput yang reasonable."""
        base = dict(
            session_id="test-session-001",
            mode="basic",
            monthly_revenue=20_000_000,
            monthly_expense=13_000_000,
            transaction_frequency_daily=15,
            has_multiple_months=True,
            business_category="retail",
            assets_estimate=50_000_000,
            asset_type="mixed",
            has_fixed_location=True,
            photo_verified=True,
            photo_condition_score=70.0,
            years_operating=4.0,
            employee_count=3,
            has_wa_business=False,
            loan_count=1,
            prev_loan_status="lunas",
            prev_loan_amount=10_000_000,
            years_since_last_loan=2.0,
            market_distance_km=1.5,
            business_count_500m=15,
            road_type="primary",
            road_access=True,
            bank_nearby=True,
            marketplace_rating=0.0,
            marketplace_review_count=0,
            marketplace_monthly_orders=0,
            sentiment_score=0.3,
            completeness_pct=85.0,
            contradiction_count=0,
            psychometric_score=50.0,
            ocr_docs_count=1,
            ocr_avg_confidence=0.85,
            self_vs_ocr_delta_pct=5.0,
            has_anomaly=False,
            photo_count=1,
            has_exif=True,
            exif_plausible=True,
            photo_forgery_score=0.1,
            has_loan_docs=False,
            years_verifiable=False,
            gps_plausibility_score=0.9,
            device_vs_pin_km=0.3,
            has_marketplace=False,
            has_psychometric=False,
            sentiment_confidence="medium",
        )
        base.update(overrides)
        return ScoringInput(**base)

    def test_hard_block_macet_terminates_early(self):
        inp = self._make_input(prev_loan_status="macet", prev_loan_amount=15_000_000)
        result = run_scoring_pipeline(inp)
        assert result.blocked is True
        assert result.final_score == 380

    def test_contradiction_block(self):
        inp = self._make_input(contradiction_count=7)
        result = run_scoring_pipeline(inp)
        assert result.blocked is True

    def test_fraud_flag_soft_cap(self):
        inp = self._make_input(has_anomaly=True)
        result = run_scoring_pipeline(inp)
        assert result.final_score <= 579
        assert result.fraud_flag is True

    def test_basic_profile_score_range(self):
        """Basic profile yang reasonable harus dapat skor 400–750."""
        inp = self._make_input()
        result = run_scoring_pipeline(inp)
        assert 400 <= result.final_score <= 750

    def test_score_in_bounds(self):
        inp = self._make_input()
        result = run_scoring_pipeline(inp)
        assert 300 <= result.final_score <= 850

    def test_sub_scores_present(self):
        inp = self._make_input()
        result = run_scoring_pipeline(inp)
        assert "financial" in result.sub_scores
        assert "collateral" in result.sub_scores
        assert "experience" in result.sub_scores
        assert "location" in result.sub_scores
        assert "character" in result.sub_scores

    def test_deterministic(self):
        """Sama input → sama output selalu."""
        inp = self._make_input()
        r1 = run_scoring_pipeline(inp)
        r2 = run_scoring_pipeline(inp)
        assert r1.final_score == r2.final_score
