"""
routers/scoring.py — Credit Scoring Endpoints

POST /v1/calculate-score  → Kalkulasi credit score dari semua data sesi
GET  /v1/assessments/{assessment_id} → Ambil hasil assessment
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from database import get_supabase
from models.schemas import (
    LoanRecommendation,
    ScoreCalculateRequest,
    ScoreResponse,
    SubScoreDetail,
)

router = APIRouter(tags=["Credit Scoring"])

# Default weights sesuai MASTER_PLAN.md
DEFAULT_WEIGHTS = {
    "financial": 0.35,
    "experience": 0.20,
    "location": 0.15,
    "document_trust": 0.15,
    "character": 0.15,
}


def _compute_final_score(sub_scores: dict[str, int], weights: dict[str, float]) -> int:
    """
    Hitung final credit score (300–850) dari sub-scores (0–100) dan weights.
    Formula: final = 300 + (weighted_average / 100) * 550
    """
    weighted_sum = sum(sub_scores.get(k, 50) * v for k, v in weights.items())
    return int(300 + (weighted_sum / 100) * 550)


def _classify_risk(score: int) -> str:
    if score >= 740:
        return "Very Low"
    elif score >= 670:
        return "Low"
    elif score >= 580:
        return "Medium"
    elif score >= 500:
        return "High"
    else:
        return "Very High"


def _loan_recommendation(score: int, risk: str) -> LoanRecommendation:
    """Rekomendasi pinjaman sederhana berdasarkan skor."""
    if score >= 740:
        return LoanRecommendation(max_amount=100_000_000, suggested_tenor=24, interest_range="10-12%")
    elif score >= 670:
        return LoanRecommendation(max_amount=50_000_000, suggested_tenor=18, interest_range="12-15%")
    elif score >= 580:
        return LoanRecommendation(max_amount=25_000_000, suggested_tenor=12, interest_range="15-18%")
    elif score >= 500:
        return LoanRecommendation(max_amount=10_000_000, suggested_tenor=6, interest_range="18-22%")
    else:
        return LoanRecommendation(max_amount=0, suggested_tenor=0, interest_range="N/A")


@router.post(
    "/calculate-score",
    response_model=ScoreResponse,
    summary="Kalkulasi credit score dari sesi wawancara",
)
async def calculate_score(
    body: ScoreCalculateRequest,
    db: Client = Depends(get_supabase),
) -> ScoreResponse:
    """
    Aggregate semua sub-skor dari sesi:
    - S_financial: dari business_profiles (omzet, pengeluaran, aset)
    - S_experience: dari business_profiles (lama usaha, karyawan)
    - S_location: dari geospatial_scores
    - S_document: dari documents (rata-rata ocr_confidence)
    - S_character: dari AI sentiment analysis (stub hingga Day 8)
    
    Full scoring engine: Day 6.
    """
    # Ambil business_profile
    bp_result = (
        db.table("business_profiles")
        .select("*")
        .eq("session_id", str(body.session_id))
        .single()
        .execute()
    )
    bp = bp_result.data or {}

    # Ambil geospatial_scores
    geo_result = (
        db.table("geospatial_scores")
        .select("location_score")
        .eq("session_id", str(body.session_id))
        .single()
        .execute()
    )
    geo = geo_result.data or {}

    # Ambil dokumen OCR confidence
    docs_result = (
        db.table("documents")
        .select("ocr_confidence")
        .eq("session_id", str(body.session_id))
        .execute()
    )
    docs = docs_result.data or []

    # ── Sub-score calculations (simplified heuristic) ──────────────
    # S_financial (0–100)
    revenue = bp.get("monthly_revenue") or 0
    expense = bp.get("monthly_expense") or 0
    profit_ratio = ((revenue - expense) / revenue * 100) if revenue > 0 else 0
    score_financial = min(100, max(0, int(profit_ratio * 2)))

    # S_experience (0–100)
    years = bp.get("years_operating") or 0
    employees = bp.get("employee_count") or 0
    score_experience = min(100, int(years * 8 + employees * 3))

    # S_location (0–100)
    score_location = geo.get("location_score") or 50

    # S_document (0–100) — rata-rata confidence dari OCR
    confidences = [d["ocr_confidence"] for d in docs if d.get("ocr_confidence") is not None]
    score_document = int(sum(confidences) / len(confidences) * 100) if confidences else 50

    # S_character (0–100) — stub hingga Day 8
    score_character = 55

    sub_scores = {
        "financial": score_financial,
        "experience": score_experience,
        "location": score_location,
        "document_trust": score_document,
        "character": score_character,
    }

    final_score = _compute_final_score(sub_scores, DEFAULT_WEIGHTS)
    risk_level = _classify_risk(final_score)
    loan_rec = _loan_recommendation(final_score, risk_level)

    explanation = (
        f"Skor kredit {final_score} menunjukkan tingkat risiko {risk_level}. "
        f"Penilaian finansial mendapat {score_financial}/100, berdasarkan profil omzet dan pengeluaran usaha. "
        f"Pengalaman usaha mendapat {score_experience}/100. "
        f"Skor lokasi {score_location}/100 berdasarkan analisis geospasial. "
        "[Penjelasan detail via Gemini tersedia mulai Day 7]"
    )

    # Simpan ke credit_assessments
    assessment_id = str(uuid4())
    db.table("credit_assessments").upsert(
        {
            "id": assessment_id,
            "session_id": str(body.session_id),
            "final_score": final_score,
            "risk_level": risk_level,
            "score_financial": score_financial,
            "score_experience": score_experience,
            "score_location": score_location,
            "score_document": score_document,
            "score_character": score_character,
            "weights": DEFAULT_WEIGHTS,
            "explanation": explanation,
            "loan_eligible": final_score >= 500,
            "loan_max_amount": loan_rec.max_amount,
            "loan_tenor_months": loan_rec.suggested_tenor,
            "loan_interest_range": loan_rec.interest_range,
        },
        on_conflict="session_id",
    ).execute()

    # Update session status ke completed
    db.table("sessions").update({"status": "completed"}).eq(
        "id", str(body.session_id)
    ).execute()

    return ScoreResponse(
        assessment_id=UUID(assessment_id),
        final_score=final_score,
        risk_level=risk_level,
        sub_scores={
            k: SubScoreDetail(score=v, weight=DEFAULT_WEIGHTS[k])
            for k, v in sub_scores.items()
        },
        explanation=explanation,
        loan_recommendation=loan_rec,
    )


@router.get(
    "/assessments/{assessment_id}",
    response_model=ScoreResponse,
    summary="Ambil hasil credit assessment",
)
async def get_assessment(
    assessment_id: UUID,
    db: Client = Depends(get_supabase),
) -> ScoreResponse:
    """Ambil hasil assessment yang sudah tersimpan."""
    result = (
        db.table("credit_assessments")
        .select("*")
        .eq("id", str(assessment_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Assessment {assessment_id} tidak ditemukan"},
        )

    a = result.data
    weights = a.get("weights", DEFAULT_WEIGHTS)

    return ScoreResponse(
        assessment_id=UUID(a["id"]),
        final_score=a["final_score"],
        risk_level=a["risk_level"],
        sub_scores={
            "financial": SubScoreDetail(score=a["score_financial"], weight=weights["financial"]),
            "experience": SubScoreDetail(score=a["score_experience"], weight=weights["experience"]),
            "location": SubScoreDetail(score=a["score_location"], weight=weights["location"]),
            "document_trust": SubScoreDetail(score=a["score_document"], weight=weights["document_trust"]),
            "character": SubScoreDetail(score=a["score_character"], weight=weights["character"]),
        },
        explanation=a.get("explanation", ""),
        loan_recommendation=LoanRecommendation(
            max_amount=a.get("loan_max_amount") or 0,
            suggested_tenor=a.get("loan_tenor_months") or 0,
            interest_range=a.get("loan_interest_range") or "N/A",
        ),
    )
