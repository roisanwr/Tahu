"""
routers/sessions.py — Session Management Endpoints

POST /v1/sessions  → Create new interview session
GET  /v1/sessions/{session_id} → Get session status
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from database import get_supabase
from models.schemas import SessionCreate, SessionCreateResponse, SessionResponse

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post(
    "",
    response_model=SessionCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new interview session",
)
async def create_session(
    body: SessionCreate,
    db: Client = Depends(get_supabase),
) -> SessionCreateResponse:
    """
    Buat sesi wawancara baru untuk user.
    Status awal: active, stage: intro.
    """
    try:
        result = (
            db.table("sessions")
            .insert(
                {
                    "user_id": str(body.user_id),
                    "status": "active",
                    "mode": body.mode,
                    "interview_stage": "intro",
                    "progress_pct": 0,
                }
            )
            .execute()
        )

        session = result.data[0]
        return SessionCreateResponse(
            session_id=UUID(session["id"]),
            status=session["status"],
            interview_stage=session["interview_stage"],
            created_at=datetime.fromisoformat(session["created_at"]),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": str(exc)},
        ) from exc


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Get session status",
)
async def get_session(
    session_id: UUID,
    db: Client = Depends(get_supabase),
) -> SessionResponse:
    """Ambil status dan progress sesi wawancara."""
    result = (
        db.table("sessions")
        .select("*")
        .eq("id", str(session_id))
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Session {session_id} tidak ditemukan"},
        )

    s = result.data
    return SessionResponse(
        session_id=UUID(s["id"]),
        user_id=UUID(s["user_id"]),
        status=s["status"],
        interview_stage=s["interview_stage"],
        mode=s["mode"],
        progress_pct=s["progress_pct"],
        created_at=datetime.fromisoformat(s["created_at"]),
        updated_at=datetime.fromisoformat(s["updated_at"]),
    )
