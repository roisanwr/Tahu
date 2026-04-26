"""
app/modules/sessions/router.py — Session Endpoints
POST /v1/sessions              → Create session
GET  /v1/sessions/{id}         → Get session detail
PATCH /v1/sessions/{id}        → Update session stage/data
POST /v1/sessions/{id}/complete → Trigger scoring pipeline
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, DBClient
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Sessions"])


class SessionCreate(BaseModel):
    business_id: str
    mode: str = "basic"


class SessionPatch(BaseModel):
    interview_stage: str | None = None
    mode: str | None = None
    progress_pct: int | None = None


class SessionResponse(BaseModel):
    session_id: str
    business_id: str
    user_id: str
    status: str
    mode: str
    interview_stage: str
    progress_pct: int
    contradiction_count: int
    injection_attempt_count: int
    financial_snapshot: dict | None = None
    created_at: str
    last_active_at: str | None = None


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(body: SessionCreate, user: CurrentUser, db: DBClient) -> SessionResponse:
    """Buat sesi wawancara baru. business_id wajib ada dan milik user."""
    # Verify business belongs to user
    biz = (
        db.table("business_profiles")
        .select("id, user_id")
        .eq("id", body.business_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not biz.data:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "Profil usaha tidak ditemukan atau bukan milikmu"},
        )

    result = db.table("sessions").insert({
        "user_id": user["id"],
        "business_id": body.business_id,
        "status": "active",
        "mode": body.mode,
        "interview_stage": "intro",
        "progress_pct": 0,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail={"code": "DB_ERROR", "message": "Gagal membuat sesi"})

    s = result.data[0]
    logger.info("session_created", session_id=s["id"], user_id=user["id"])
    return _to_response(s)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: UUID, user: CurrentUser, db: DBClient) -> SessionResponse:
    result = (
        db.table("sessions")
        .select("*, business_profiles!inner(user_id)")
        .eq("id", str(session_id))
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Sesi tidak ditemukan"})
    if result.data["business_profiles"]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Bukan sesimu"})
    return _to_response(result.data)


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: UUID,
    body: SessionPatch,
    user: CurrentUser,
    db: DBClient,
) -> SessionResponse:
    """Update stage atau mode sesi."""
    # Verify ownership
    existing = _verify_ownership(db, str(session_id), user["id"])

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return _to_response(existing)

    result = db.table("sessions").update(updates).eq("id", str(session_id)).execute()
    return _to_response(result.data[0])


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: UUID,
    user: CurrentUser,
    db: DBClient,
) -> dict:
    """
    Trigger scoring pipeline untuk sesi yang sudah selesai wawancara.
    Semua mandatory field harus sudah ada.
    """
    session = _verify_ownership(db, str(session_id), user["id"])

    if session.get("status") == "completed":
        # Sudah ada assessment — return existing
        existing = (
            db.table("credit_assessments")
            .select("*")
            .eq("session_id", str(session_id))
            .single()
            .execute()
        )
        if existing.data:
            return {"status": "already_completed", "assessment_id": existing.data["id"]}

    # Mark as pending_score
    db.table("sessions").update({"status": "pending_score"}).eq("id", str(session_id)).execute()

    # Build ScoringInput dari session + business data
    business = (
        db.table("business_profiles")
        .select("*")
        .eq("id", session["business_id"])
        .single()
        .execute()
    )
    bp = business.data or {}

    geo = (
        db.table("geospatial_scores")
        .select("*")
        .eq("session_id", str(session_id))
        .single()
        .execute()
    )
    geo_data = geo.data or {}

    docs = (
        db.table("documents")
        .select("ocr_confidence, has_exif, exif_plausible, photo_forgery_score, doc_type")
        .eq("session_id", str(session_id))
        .execute()
    )
    docs_data = docs.data or []

    # Compute doc metrics
    confidences = [d["ocr_confidence"] for d in docs_data if d.get("ocr_confidence")]
    photo_docs = [d for d in docs_data if d.get("doc_type") in ("foto_usaha",)]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    avg_forgery = sum(d.get("photo_forgery_score") or 0 for d in photo_docs) / max(len(photo_docs), 1)

    from app.modules.scoring.pipeline import run_scoring_pipeline
    from app.modules.scoring.schemas import ScoringInput

    snapshot = session.get("financial_snapshot") or {}

    scoring_input = ScoringInput(
        session_id=str(session_id),
        mode=session.get("mode", "basic"),
        monthly_revenue=session.get("monthly_revenue") or snapshot.get("monthly_revenue") or 0,
        monthly_expense=session.get("monthly_expense") or snapshot.get("monthly_expense") or 0,
        transaction_frequency_daily=session.get("transaction_frequency_daily") or snapshot.get("transaction_frequency_daily") or 0,
        has_multiple_months=session.get("has_multiple_months") or False,
        business_category=bp.get("category") or "lainnya",
        assets_estimate=session.get("assets_estimate") or snapshot.get("assets_estimate") or 0,
        asset_type=bp.get("asset_type") or "mixed",
        has_fixed_location=bp.get("has_fixed_location") or False,
        photo_verified=len(photo_docs) > 0,
        photo_condition_score=session.get("photo_condition_score") or 50.0,
        years_operating=bp.get("years_operating") or 1.0,
        employee_count=bp.get("employee_count") or 0,
        has_wa_business=bp.get("has_wa_business") or False,
        loan_count=bp.get("loan_count") or 0,
        prev_loan_status=bp.get("prev_loan_status") or "belum_ada",
        prev_loan_amount=bp.get("prev_loan_amount") or 0,
        years_since_last_loan=bp.get("years_since_last_loan") or 0.0,
        market_distance_km=geo_data.get("market_distance_km") or 5.0,
        business_count_500m=geo_data.get("business_count_500m") or 0,
        road_type=geo_data.get("road_type") or "other",
        road_access=geo_data.get("road_access") or False,
        bank_nearby=geo_data.get("bank_nearby") or False,
        marketplace_rating=bp.get("marketplace_rating") or 0.0,
        marketplace_review_count=bp.get("marketplace_review_count") or 0,
        marketplace_monthly_orders=bp.get("marketplace_monthly_orders") or 0,
        socmed_followers=bp.get("socmed_followers") or 0,
        sentiment_score=snapshot.get("sentiment_score") or 0.0,
        completeness_pct=float(session.get("progress_pct") or 50),
        contradiction_count=session.get("contradiction_count") or 0,
        psychometric_score=bp.get("psychometric_score") or 50.0,
        ocr_docs_count=len(confidences),
        ocr_avg_confidence=avg_confidence,
        self_vs_ocr_delta_pct=0.0,
        has_anomaly=False,
        photo_count=len(photo_docs),
        has_exif=any(d.get("has_exif") for d in photo_docs),
        exif_plausible=all(d.get("exif_plausible", True) for d in photo_docs),
        photo_forgery_score=avg_forgery,
        has_loan_docs=any(d.get("doc_type") in ("rekening_koran", "buku_kas") for d in docs_data),
        years_verifiable=False,
        gps_plausibility_score=session.get("gps_plausibility_score") or 0.75,
        device_vs_pin_km=geo_data.get("device_vs_pin_km") or 0.0,
        has_marketplace=bool(bp.get("marketplace_platform")),
        has_psychometric=bp.get("psychometric_completed") or False,
        sentiment_confidence="medium",
    )

    try:
        result = run_scoring_pipeline(scoring_input)
    except Exception as exc:
        logger.error("scoring_pipeline_error", error=str(exc), session_id=str(session_id))
        db.table("sessions").update({"status": "active"}).eq("id", str(session_id)).execute()
        raise HTTPException(status_code=500, detail={"code": "SCORING_ERROR", "message": str(exc)})

    # Save to credit_assessments
    import uuid as uuid_lib
    assessment_id = str(uuid_lib.uuid4())
    db.table("credit_assessments").upsert({
        "id": assessment_id,
        "session_id": str(session_id),
        "final_score": result.final_score,
        "risk_level": result.risk_level,
        "score_financial": result.sub_scores.get("financial", {}).raw if result.sub_scores.get("financial") else None,
        "score_collateral": result.sub_scores.get("collateral", {}).raw if result.sub_scores.get("collateral") else None,
        "score_experience": result.sub_scores.get("experience", {}).raw if result.sub_scores.get("experience") else None,
        "score_location": result.sub_scores.get("location", {}).raw if result.sub_scores.get("location") else None,
        "score_character": result.sub_scores.get("character", {}).raw if result.sub_scores.get("character") else None,
        "raw_scores": result.raw_scores.model_dump(),
        "weights": result.weights,
        "confidence_multipliers": result.confidence_multipliers,
        "gcs": result.gcs,
        "data_flag": result.data_flag,
        "fraud_flag": result.fraud_flag,
        "hard_block_triggered": result.blocked,
        "hard_block_reason": result.block_reason,
        "loan_eligible": result.loan_recommendation.eligible,
        "loan_max_amount": result.loan_recommendation.max_amount,
        "loan_tenor_months": result.loan_recommendation.tenor_months,
        "loan_interest_range": result.loan_recommendation.interest_range,
        "contradiction_count_snapshot": session.get("contradiction_count") or 0,
    }, on_conflict="session_id").execute()

    db.table("sessions").update({"status": "completed"}).eq("id", str(session_id)).execute()

    logger.info("session_completed", session_id=str(session_id), final_score=result.final_score)

    return {
        "status": "completed",
        "assessment_id": assessment_id,
        "final_score": result.final_score,
        "risk_level": result.risk_level,
    }


def _verify_ownership(db, session_id: str, user_id: str) -> dict:
    result = (
        db.table("sessions")
        .select("*, business_profiles!inner(user_id)")
        .eq("id", session_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Sesi tidak ditemukan"})
    if result.data["business_profiles"]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Bukan sesimu"})
    return result.data


def _to_response(s: dict) -> SessionResponse:
    return SessionResponse(
        session_id=s["id"],
        business_id=s["business_id"],
        user_id=s["user_id"],
        status=s.get("status", "active"),
        mode=s.get("mode", "basic"),
        interview_stage=s.get("interview_stage", "intro"),
        progress_pct=s.get("progress_pct", 0),
        contradiction_count=s.get("contradiction_count", 0),
        injection_attempt_count=s.get("injection_attempt_count", 0),
        financial_snapshot=s.get("financial_snapshot"),
        created_at=s["created_at"],
        last_active_at=s.get("last_active_at"),
    )
