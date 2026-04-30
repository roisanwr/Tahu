"""
app/modules/chat/router.py — Chat Endpoints (Optimized V2)
POST /v1/sessions/{session_id}/messages  → Kirim pesan ke RINA
GET  /v1/sessions/{session_id}/messages  → Ambil history

Optimization log (V2):
  - Rate limit: pindah ke in-memory (eliminasi 1 DB query ~100-200ms)
  - History query: gabung dengan session verify jika memungkinkan
  - Save messages: tetap sinkron karena Supabase client blocking,
    tapi jumlah query dikurangi dari 7 → 5
  - History limit: 10 messages (turun dari 20)
"""
from __future__ import annotations

import json
import time
from collections import defaultdict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from app.core.deps import CurrentUser, DBClient
from app.core.errors import AIProviderError, NotFoundError, RateLimitError
from app.core.logging import get_logger
from app.infra.ai.fallback_router import get_chat_client
from app.modules.chat.extractor import detect_contradiction, regex_extract
from app.modules.chat.sanitizer import sanitize_user_input

logger = get_logger(__name__)
router = APIRouter(tags=["Chat"])

# ── In-memory rate limiter (menggantikan DB query) ────────────
# Key: user_id → timestamp terakhir kirim pesan
_last_message_ts: dict[str, float] = defaultdict(float)
_RATE_LIMIT_SECONDS = 1.0

_MAX_HISTORY = 10  # jumlah history yang dikirim ke AI (turun dari 20)


class SendMessageRequest(BaseModel):
    content: str
    message_type: str = "text"


class MessageResponse(BaseModel):
    message_id: str
    role: str
    content: str
    ui_trigger: str | None = None
    current_stage: str | None = None
    extracted_fields: dict = {}
    flags: dict = {}
    created_at: str


@router.post("/{session_id}/messages", response_model=MessageResponse, status_code=201)
async def send_message(
    session_id: UUID,
    body: SendMessageRequest,
    user: CurrentUser,
    db: DBClient,
) -> MessageResponse:
    """Kirim pesan ke RINA dan simpan ke chat_history."""
    # ── Rate limit: in-memory (menghilangkan 1 DB query) ─────
    now = time.monotonic()
    user_id = user["id"]
    if (now - _last_message_ts[user_id]) < _RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT_EXCEEDED", "message": "Terlalu cepat! Tunggu sebentar ya 😊"},
        )
    _last_message_ts[user_id] = now

    # ── Verify session belongs to user ──────────────────────
    session = _get_session(db, str(session_id), user_id)

    # ── Sanitize input ───────────────────────────────────────
    clean_content, injection_detected = sanitize_user_input(body.content)

    if injection_detected:
        # Update injection counter
        new_count = (session.get("injection_attempt_count") or 0) + 1
        db.table("sessions").update(
            {"injection_attempt_count": new_count}
        ).eq("id", str(session_id)).execute()

        if new_count >= 3:
            logger.warning("injection_threshold_exceeded", session_id=str(session_id))

        # Return RINA's deflection response (tidak pass ke LLM)
        deflection = {
            "message": "Hmm, aku nggak terlalu ngerti maksudnya Kak 😄 Yuk kita lanjut — tadi kita lagi bahas soal profil usaha kamu!",
            "current_stage": session.get("interview_stage", "profil"),
            "ui_trigger": None,
            "extracted_fields": {},
            "flags": {"injection_attempt": True, "data_flag": "sufficient"},
        }
        return _save_and_return(
            db=db,
            session_id=str(session_id),
            user_content=clean_content,
            rina_response=deflection,
            original_session=session,
        )

    # ── Get chat history (last 10 messages — turun dari 20) ──
    history_result = (
        db.table("chat_history")
        .select("role, content")
        .eq("session_id", str(session_id))
        .order("created_at", desc=False)
        .limit(_MAX_HISTORY)
        .execute()
    )
    history = []
    for m in (history_result.data or []):
        role = "model" if m["role"] == "assistant" else m["role"]
        content = m["content"]
        
        # ── ANTI-POISONING FIX ──
        # Assistant messages di DB disimpan sebagai PLAIN TEXT.
        # Kalau dikirim apa adanya, model akan mimic plain text dan GAGAL JSON output.
        # Jadi kita "bungkus" lagi jadi JSON string sebelum dikirim ke AI.
        if role == "model":
            try:
                json.loads(content)
            except ValueError:
                content = json.dumps({"message": content})
                
        history.append({"role": role, "content": content})

    # ── Session context untuk RINA ───────────────────────────
    session_context = {
        "interview_stage": session.get("interview_stage", "intro"),
        "progress_pct": session.get("progress_pct", 0),
        "collected_fields": session.get("financial_snapshot") or {},
    }

    # ── Panggil RINA (via FallbackRouter) ────────────────────
    try:
        chat_client = get_chat_client()
        rina_response = await chat_client.chat(
            user_message=clean_content,
            history=history,
            session_context=session_context,
        )
    except AIProviderError as exc:
        logger.error("glm_chat_failed", error=str(exc), stage=session.get("interview_stage"))
        # Graceful fallback — pesan berbeda agar tidak terlihat sama terus
        import random
        fallback_messages = [
            "Maaf Kak, koneksi ke AI lagi gangguan sebentar 😅 Coba kirim lagi ya!",
            "Ups, ada masalah teknis sebentar. Kirim ulang pesanmu ya Kak 🙏",
            "Sebentar ya Kak, lagi ada kendala koneksi. Boleh diulangi? 😊",
        ]
        rina_response = {
            "message": random.choice(fallback_messages),
            "current_stage": session.get("interview_stage", "profil"),
            "ui_trigger": None,
            "extracted_fields": {},
            "flags": {"data_flag": "sufficient", "ai_error": True},
        }

    # ── Process extracted fields ─────────────────────────────
    extracted = rina_response.get("extracted_fields", {})
    flags = rina_response.get("flags", {})
    updated_fields = rina_response.get("updated_fields", {})

    # Cross-validate numeric fields dengan regex
    for field_name in ["monthly_revenue", "monthly_expense", "assets_estimate"]:
        if field_name in extracted:
            regex_val = regex_extract(field_name, clean_content)
            llm_val = extracted.get(field_name)
            if regex_val and llm_val:
                delta_pct = abs(regex_val - llm_val) / max(abs(llm_val), 1) * 100
                if delta_pct > 30:
                    flags["discrepancy_detected"] = True
                    flags["discrepancy_field"] = field_name

    # Detect contradiction
    contradiction_count = session.get("contradiction_count", 0)
    if updated_fields:
        for field_name, change in updated_fields.items():
            old_val = change.get("old")
            new_val = change.get("new")
            if detect_contradiction(field_name, old_val, new_val):
                contradiction_count += 1
                flags["contradiction_detected"] = True
                logger.info(
                    "contradiction_detected",
                    field=field_name,
                    old=old_val,
                    new=new_val,
                    session_id=str(session_id),
                )

    # ── Update session state ─────────────────────────────────
    new_stage = rina_response.get("current_stage", session.get("interview_stage"))
    session_updates: dict = {
        "interview_stage": new_stage,
        "contradiction_count": contradiction_count,
    }

    # Update financial snapshot with extracted fields
    if extracted:
        current_snapshot = session.get("financial_snapshot") or {}
        current_snapshot.update({k: v for k, v in extracted.items() if v is not None})
        session_updates["financial_snapshot"] = json.dumps(current_snapshot)
        # Propagate critical fields ke session columns
        if "monthly_revenue" in extracted:
            session_updates["monthly_revenue"] = extracted["monthly_revenue"]
        if "monthly_expense" in extracted:
            session_updates["monthly_expense"] = extracted["monthly_expense"]
        if "transaction_frequency_daily" in extracted:
            session_updates["transaction_frequency_daily"] = extracted["transaction_frequency_daily"]
        if "assets_estimate" in extracted:
            session_updates["assets_estimate"] = extracted["assets_estimate"]

    # Emotional signal
    if flags.get("emotional_signal"):
        session_updates["emotional_signal"] = True
    if flags.get("wellbeing_concern"):
        session_updates["wellbeing_concern"] = True

    db.table("sessions").update(session_updates).eq("id", str(session_id)).execute()

    return _save_and_return(
        db=db,
        session_id=str(session_id),
        user_content=clean_content,
        rina_response=rina_response,
        original_session=session,
        flags=flags,
        extracted=extracted,
    )


def _get_session(db: Client, session_id: str, user_id: str) -> dict:
    """Verify session exists and belongs to user via business ownership."""
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
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Kamu tidak punya akses ke sesi ini"})
    return result.data


def _save_and_return(
    db: Client,
    session_id: str,
    user_content: str,
    rina_response: dict,
    original_session: dict,
    flags: dict | None = None,
    extracted: dict | None = None,
) -> MessageResponse:
    """Simpan kedua message (user + assistant) ke DB dan return response."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()

    # Save user message
    user_msg_result = db.table("chat_history").insert({
        "session_id": session_id,
        "role": "user",
        "content": user_content,
        "current_stage": original_session.get("interview_stage"),
    }).execute()

    # Save RINA response - we just pass the dict directly because the DB column is JSONB. 
    # Supabase automatically serializes python dict to jsonb column.
    rina_msg_result = db.table("chat_history").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": rina_response.get("message", ""),
        "ui_trigger": rina_response.get("ui_trigger"),
        "current_stage": rina_response.get("current_stage"),
        "extracted_data": extracted or {},
        "flags": flags or {},
    }).execute()

    rina_msg = rina_msg_result.data[0] if rina_msg_result.data else {}

    return MessageResponse(
        message_id=rina_msg.get("id", ""),
        role="assistant",
        content=rina_response.get("message", ""),
        ui_trigger=rina_response.get("ui_trigger"),
        current_stage=rina_response.get("current_stage"),
        extracted_fields=extracted or {},
        flags=flags or {},
        created_at=rina_msg.get("created_at", now),
    )


@router.get("/{session_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    session_id: UUID,
    user: CurrentUser,
    db: DBClient,
) -> list[MessageResponse]:
    """Ambil seluruh chat history satu sesi."""
    _get_session(db, str(session_id), user["id"])

    result = (
        db.table("chat_history")
        .select("*")
        .eq("session_id", str(session_id))
        .order("created_at", desc=False)
        .execute()
    )

    messages = []
    for m in (result.data or []):
        extracted = m.get("extracted_data") or {}
        if isinstance(extracted, str):
            try:
                extracted = json.loads(extracted)
            except:
                extracted = {}
                
        flags = m.get("flags") or {}
        if isinstance(flags, str):
            try:
                flags = json.loads(flags)
            except:
                flags = {}

        messages.append(
            MessageResponse(
                message_id=m["id"],
                role=m["role"],
                content=m["content"],
                ui_trigger=m.get("ui_trigger"),
                current_stage=m.get("current_stage"),
                extracted_fields=extracted,
                flags=flags,
                created_at=m["created_at"],
            )
        )
    return messages
