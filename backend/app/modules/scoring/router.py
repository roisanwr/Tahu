"""
app/modules/scoring/router.py — Scoring Endpoints (Rewrite V3.1)
GET /v1/assessments/{id}  → Ambil hasil assessment
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.deps import CurrentUser, DBClient
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Credit Scoring"])


class AssessmentResponse(BaseModel):
    assessment_id: str
    session_id: str
    final_score: int
    risk_level: str
    gcs: float | None
    data_flag: str | None
    fraud_flag: bool
    hard_block_triggered: bool
    hard_block_reason: str | None
    sub_scores: dict | None
    raw_scores: dict | None
    confidence_multipliers: dict | None
    weights: dict | None
    loan_eligible: bool
    loan_max_amount: int | None
    loan_tenor_months: int | None
    loan_interest_range: str | None
    explanation: str | None
    created_at: str


@router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(
    assessment_id: UUID,
    user: CurrentUser,
    db: DBClient,
) -> AssessmentResponse:
    """Ambil hasil credit assessment. Hanya bisa diakses oleh pemilik sesi."""
    result = (
        db.table("credit_assessments")
        .select("*, sessions!inner(business_id, business_profiles!inner(user_id))")
        .eq("id", str(assessment_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Assessment tidak ditemukan"})

    a = result.data
    # Verify ownership via join chain
    if a["sessions"]["business_profiles"]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Bukan assessmentmu"})

    # Build sub_scores summary dari raw data
    sub_scores = None
    if a.get("score_financial") is not None:
        weights = a.get("weights") or {}
        multipliers = a.get("confidence_multipliers") or {}
        sub_scores = {
            "financial": {
                "raw": a["score_financial"],
                "weight": weights.get("financial", 0.40),
                "multiplier": multipliers.get("financial"),
            },
            "collateral": {
                "raw": a.get("score_collateral"),
                "weight": weights.get("collateral", 0.25),
                "multiplier": multipliers.get("collateral"),
            },
            "experience": {
                "raw": a.get("score_experience"),
                "weight": weights.get("experience", 0.15),
                "multiplier": multipliers.get("experience"),
            },
            "location": {
                "raw": a.get("score_location"),
                "weight": weights.get("location", 0.10),
                "multiplier": multipliers.get("location"),
            },
            "character": {
                "raw": a.get("score_character"),
                "weight": weights.get("character", 0.10),
                "multiplier": multipliers.get("character"),
            },
        }

    return AssessmentResponse(
        assessment_id=a["id"],
        session_id=a["session_id"],
        final_score=a["final_score"],
        risk_level=a["risk_level"],
        gcs=a.get("gcs"),
        data_flag=a.get("data_flag"),
        fraud_flag=a.get("fraud_flag", False),
        hard_block_triggered=a.get("hard_block_triggered", False),
        hard_block_reason=a.get("hard_block_reason"),
        sub_scores=sub_scores,
        raw_scores=a.get("raw_scores"),
        confidence_multipliers=a.get("confidence_multipliers"),
        weights=a.get("weights"),
        loan_eligible=a.get("loan_eligible", False),
        loan_max_amount=a.get("loan_max_amount"),
        loan_tenor_months=a.get("loan_tenor_months"),
        loan_interest_range=a.get("loan_interest_range"),
        explanation=a.get("explanation"),
        created_at=a["created_at"],
    )
