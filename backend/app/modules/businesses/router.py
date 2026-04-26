"""
app/modules/businesses/router.py — Businesses Endpoints
POST /v1/businesses          → Create business profile
GET  /v1/businesses          → List user's businesses
GET  /v1/businesses/{id}     → Get detail
GET  /v1/businesses/{id}/assessments  → Assessment history
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, DBClient
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["Businesses"])


class BusinessCreate(BaseModel):
    business_name: str
    category: str = "lainnya"
    description: str | None = None
    owner_name: str | None = None


class BusinessResponse(BaseModel):
    id: str
    business_name: str
    category: str | None
    owner_name: str | None
    description: str | None
    is_active: bool
    session_attempt_count: int
    created_at: str


@router.post("", response_model=BusinessResponse, status_code=201)
async def create_business(
    body: BusinessCreate,
    user: CurrentUser,
    db: DBClient,
) -> BusinessResponse:
    """Buat profil usaha baru."""
    result = db.table("business_profiles").insert({
        "user_id": user["id"],
        "business_name": body.business_name,
        "category": body.category,
        "description": body.description,
        "owner_name": body.owner_name or user.get("full_name"),
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail={"code": "DB_ERROR", "message": "Gagal menyimpan profil usaha"})

    b = result.data[0]
    logger.info("business_created", business_id=b["id"], user_id=user["id"])
    return BusinessResponse(**{k: b[k] for k in BusinessResponse.model_fields if k in b})


@router.get("", response_model=list[BusinessResponse])
async def list_businesses(user: CurrentUser, db: DBClient) -> list[BusinessResponse]:
    """Ambil semua bisnis milik user."""
    result = (
        db.table("business_profiles")
        .select("*")
        .eq("user_id", user["id"])
        .eq("is_active", True)
        .order("created_at", desc=True)
        .execute()
    )
    return [
        BusinessResponse(**{k: b[k] for k in BusinessResponse.model_fields if k in b})
        for b in (result.data or [])
    ]


@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(business_id: UUID, user: CurrentUser, db: DBClient) -> BusinessResponse:
    """Ambil detail satu bisnis."""
    result = (
        db.table("business_profiles")
        .select("*")
        .eq("id", str(business_id))
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Bisnis tidak ditemukan"})
    b = result.data
    return BusinessResponse(**{k: b[k] for k in BusinessResponse.model_fields if k in b})


@router.get("/{business_id}/assessments")
async def get_business_assessments(
    business_id: UUID,
    user: CurrentUser,
    db: DBClient,
) -> list[dict]:
    """Ambil history semua assessment untuk satu bisnis."""
    result = (
        db.table("sessions")
        .select("id, created_at, status, mode, credit_assessments(final_score, risk_level, data_flag, loan_eligible, created_at)")
        .eq("business_id", str(business_id))
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []
