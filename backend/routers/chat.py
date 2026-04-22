"""
routers/chat.py — Chat / Interview Endpoints

POST /v1/chat → Kirim pesan user, terima AI response
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ai_agent import AIAgent
from database import get_supabase
from models.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chat"])

# Singleton AI agent
_agent = AIAgent()


@router.post(
    "",
    response_model=ChatResponse,
    summary="Send a chat message and receive AI response",
)
async def send_message(
    body: ChatRequest,
    db: Client = Depends(get_supabase),
) -> ChatResponse:
    """
    Terima pesan dari user, simpan ke chat_history,
    kirim ke AI agent, simpan response, return ke frontend.
    
    Full AI logic akan diimplementasikan di Day 3.
    """
    # 1. Validasi session
    session_result = (
        db.table("sessions")
        .select("id, status, interview_stage, progress_pct")
        .eq("id", str(body.session_id))
        .single()
        .execute()
    )

    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Session tidak ditemukan"},
        )

    session = session_result.data
    if session["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": "Session sudah tidak aktif"},
        )

    # 2. Simpan pesan user ke chat_history
    db.table("chat_history").insert(
        {
            "session_id": str(body.session_id),
            "role": "user",
            "content": body.message,
            "message_type": body.message_type,
        }
    ).execute()

    # 3. Ambil history chat (last 20 messages untuk context)
    history_result = (
        db.table("chat_history")
        .select("role, content")
        .eq("session_id", str(body.session_id))
        .order("created_at", desc=False)
        .limit(20)
        .execute()
    )
    chat_history = history_result.data or []

    # 4. Kirim ke AI agent (Day 3: full Gemini integration)
    ai_result = await _agent.send_message(
        session_id=str(body.session_id),
        user_message=body.message,
        chat_history=chat_history,
        current_stage=session["interview_stage"],
    )

    # 5. Simpan AI response ke chat_history
    db.table("chat_history").insert(
        {
            "session_id": str(body.session_id),
            "role": "assistant",
            "content": ai_result["ai_response"],
            "message_type": "text",
            "extracted_data": ai_result.get("extracted_data"),
            "ui_trigger": ai_result.get("ui_component"),
        }
    ).execute()

    # 6. Update session stage jika berubah
    next_stage = ai_result.get("next_stage", session["interview_stage"])
    if next_stage != session["interview_stage"]:
        db.table("sessions").update(
            {"interview_stage": next_stage}
        ).eq("id", str(body.session_id)).execute()

    return ChatResponse(
        ai_response=ai_result["ai_response"],
        interview_stage=next_stage,
        progress_pct=session["progress_pct"],
        extracted_data=ai_result.get("extracted_data"),
        ui_component=ai_result.get("ui_component"),
    )
