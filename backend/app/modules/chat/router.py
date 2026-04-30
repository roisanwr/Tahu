"""
app/modules/chat/router.py — Chat Endpoints (V3 — Full Flow Fix)
POST /v1/sessions/{session_id}/messages  → Kirim pesan ke RINA
GET  /v1/sessions/{session_id}/messages  → Ambil history

V3 changelog:
  - Sync extracted fields ke business_profiles (sebelumnya hilang)
  - Auto-calculate progress_pct dari mandatory fields
  - Auto-advance interview_stage berdasarkan field completion
  - Type coercion: string → int/float/bool sebelum save ke DB
  - Context prefix kirim "Field BELUM terkumpul" ke AI
  - Filter error messages dari history
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
from app.infra.ai.system_prompt import (
    MANDATORY_FIELDS, STAGE_FIELDS, STAGE_ORDER,
)
from app.modules.chat.extractor import detect_contradiction, regex_extract
from app.modules.chat.sanitizer import sanitize_user_input

logger = get_logger(__name__)
router = APIRouter(tags=["Chat"])

# ── In-memory rate limiter (menggantikan DB query) ────────────
_last_message_ts: dict[str, float] = defaultdict(float)
_RATE_LIMIT_SECONDS = 1.0

_MAX_HISTORY = 10

# ── Mapping extracted_fields → business_profiles columns ──────
_BP_FIELD_MAP: dict[str, str] = {
    "owner_name": "owner_name",
    "business_name": "business_name",
    "business_category": "category",
    "years_operating": "years_operating",
    "employee_count": "employee_count",
    "has_fixed_location": "has_fixed_location",
    "location_address": "location_address",
    "has_prev_loan": "has_prev_loan",
    "prev_loan_status": "prev_loan_status",
    "prev_loan_amount": "prev_loan_amount",
    "loan_count": "loan_count",
    "has_wa_business": "has_wa_business",
    "marketplace_platform": "marketplace_platform",
    "has_qris": "has_qris",
    "has_ewallet": "has_ewallet",
    "asset_type": "asset_type",
}

# ── Type coercion config ──────────────────────────────────────
_NUMERIC_FIELDS: dict[str, type] = {
    "years_operating": float,
    "employee_count": int,
    "monthly_revenue": int,
    "monthly_expense": int,
    "transaction_frequency_daily": int,
    "assets_estimate": int,
    "prev_loan_amount": int,
    "loan_count": int,
}

_BOOLEAN_FIELDS: list[str] = [
    "has_fixed_location", "has_prev_loan", "has_wa_business",
    "has_qris", "has_ewallet",
]


def _coerce_extracted(extracted: dict) -> dict:
    """Coerce string values ke tipe yang benar untuk DB columns."""
    result = dict(extracted)
    for field, target_type in _NUMERIC_FIELDS.items():
        if field in result and result[field] is not None:
            try:
                val = result[field]
                if isinstance(val, str):
                    val = val.replace(",", "").replace(".", "").strip()
                result[field] = target_type(val)
            except (ValueError, TypeError):
                pass  # biarkan apa adanya
    for field in _BOOLEAN_FIELDS:
        if field in result and result[field] is not None:
            val = result[field]
            if isinstance(val, str):
                result[field] = val.lower() in ("true", "ya", "iya", "yes", "1", "tetap", "tetep", "ada", "punya")

    # Validasi enum: business_category
    _VALID_CATEGORIES = {"kuliner", "retail", "jasa", "online", "produksi", "lainnya"}
    if "business_category" in result and result["business_category"]:
        cat = str(result["business_category"]).lower().strip()
        if cat not in _VALID_CATEGORIES:
            # Map common aliases
            _CAT_ALIAS = {
                "peternakan": "produksi", "pertanian": "produksi", "manufaktur": "produksi",
                "makanan": "kuliner", "minuman": "kuliner", "f&b": "kuliner", "fnb": "kuliner",
                "toko": "retail", "warung": "retail", "pedagang": "retail",
                "freelance": "jasa", "konsultan": "jasa", "bengkel": "jasa",
                "ecommerce": "online", "dropship": "online", "marketplace": "online",
            }
            result["business_category"] = _CAT_ALIAS.get(cat, "lainnya")
        else:
            result["business_category"] = cat

    # Validasi enum: prev_loan_status
    _VALID_LOAN_STATUS = {"lunas", "cicilan_lancar", "macet", "belum_ada"}
    if "prev_loan_status" in result and result["prev_loan_status"]:
        ls = str(result["prev_loan_status"]).lower().strip()
        if ls not in _VALID_LOAN_STATUS:
            _LOAN_ALIAS = {
                "belum": "belum_ada", "belum pernah": "belum_ada", "tidak ada": "belum_ada",
                "lunas semua": "lunas", "sudah lunas": "lunas",
                "lancar": "cicilan_lancar", "masih nyicil": "cicilan_lancar",
                "nunggak": "macet", "telat": "macet",
            }
            result["prev_loan_status"] = _LOAN_ALIAS.get(ls, "belum_ada")
        else:
            result["prev_loan_status"] = ls

    return result


def _compute_progress(snapshot: dict) -> int:
    """Hitung progress_pct berdasarkan mandatory fields yang sudah terisi."""
    if not snapshot:
        return 0
    filled = sum(1 for f in MANDATORY_FIELDS if snapshot.get(f) is not None and snapshot.get(f) != "")
    return int(filled / len(MANDATORY_FIELDS) * 100)


def _compute_stage(snapshot: dict) -> str:
    """Tentukan interview_stage berdasarkan field completion."""
    if not snapshot:
        return "intro"
    for stage in STAGE_ORDER:
        if stage in ("dokumen", "summary"):
            continue
        fields = STAGE_FIELDS.get(stage, [])
        if not fields:
            continue
        if not all(snapshot.get(f) is not None and snapshot.get(f) != "" for f in fields):
            return stage
    return "summary"


def _get_missing_fields(snapshot: dict, current_stage: str) -> list[str]:
    """Dapatkan daftar SEMUA mandatory fields yang belum terkumpul."""
    return [f for f in MANDATORY_FIELDS if not snapshot.get(f)]


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
    # ── Rate limit: in-memory ─────────────────────────────────
    now = time.monotonic()
    user_id = user["id"]
    if (now - _last_message_ts[user_id]) < _RATE_LIMIT_SECONDS:
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT_EXCEEDED", "message": "Terlalu cepat! Tunggu sebentar ya 😊"},
        )
    _last_message_ts[user_id] = now

    # ── Verify session belongs to user ────────────────────────
    session = _get_session(db, str(session_id), user_id)

    # ── Sanitize input ────────────────────────────────────────
    clean_content, injection_detected = sanitize_user_input(body.content)

    if injection_detected:
        new_count = (session.get("injection_attempt_count") or 0) + 1
        db.table("sessions").update(
            {"injection_attempt_count": new_count}
        ).eq("id", str(session_id)).execute()

        if new_count >= 3:
            logger.warning("injection_threshold_exceeded", session_id=str(session_id))

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

    # ── Get chat history ──────────────────────────────────────
    history_result = (
        db.table("chat_history")
        .select("role, content, current_stage, extracted_data")
        .eq("session_id", str(session_id))
        .order("created_at", desc=False)
        .limit(_MAX_HISTORY)
        .execute()
    )
    history = []
    for m in (history_result.data or []):
        # ── FILTER AI ERROR / FALLBACK MESSAGES ──
        if m["role"] == "assistant":
            content_lower = m["content"].lower()
            if any(kw in content_lower for kw in [
                "kendala koneksi", "masalah teknis", "kurang fokus",
                "gangguan sebentar", "kirim ulang", "coba lagi"
            ]):
                continue

        role = "model" if m["role"] == "assistant" else m["role"]
        content = m["content"]

        # ── ANTI-POISONING: rebuild full JSON structure ──
        if role == "model":
            try:
                parsed = json.loads(content)
                if "extracted_fields" not in parsed:
                    parsed["extracted_fields"] = m.get("extracted_data") or {}
                    content = json.dumps(parsed, ensure_ascii=False)
            except (ValueError, TypeError):
                content = json.dumps({
                    "message": content,
                    "current_stage": m.get("current_stage") or "profil",
                    "extracted_fields": m.get("extracted_data") or {},
                    "flags": {}
                }, ensure_ascii=False)

        history.append({"role": role, "content": content})

    # ── Build session context ─────────────────────────────────
    # Parse financial_snapshot safely
    snapshot = session.get("financial_snapshot")
    if isinstance(snapshot, str):
        try:
            snapshot = json.loads(snapshot)
        except (ValueError, TypeError):
            snapshot = {}
    if not isinstance(snapshot, dict):
        snapshot = {}

    current_stage = session.get("interview_stage", "intro")
    missing = _get_missing_fields(snapshot, current_stage)

    session_context = {
        "interview_stage": current_stage,
        "progress_pct": _compute_progress(snapshot),
        "collected_fields": snapshot,
        "missing_fields": missing,
    }

    # ── Panggil RINA (via FallbackRouter) ─────────────────────
    try:
        chat_client = get_chat_client()
        rina_response = await chat_client.chat(
            user_message=clean_content,
            history=history,
            session_context=session_context,
        )
    except AIProviderError as exc:
        logger.error("glm_chat_failed", error=str(exc), stage=current_stage)
        import random
        fallback_messages = [
            "Maaf Kak, koneksi ke AI lagi gangguan sebentar 😅 Coba kirim lagi ya!",
            "Ups, ada masalah teknis sebentar. Kirim ulang pesanmu ya Kak 🙏",
            "Sebentar ya Kak, lagi ada kendala koneksi. Boleh diulangi? 😊",
        ]
        rina_response = {
            "message": random.choice(fallback_messages),
            "current_stage": current_stage,
            "ui_trigger": None,
            "extracted_fields": {},
            "flags": {"data_flag": "sufficient", "ai_error": True},
        }

    # ── Process & coerce extracted fields ─────────────────────
    raw_extracted = rina_response.get("extracted_fields", {})
    extracted = _coerce_extracted(raw_extracted)
    flags = rina_response.get("flags", {})
    updated_fields = rina_response.get("updated_fields", {})

    # Cross-validate numeric fields dengan regex
    for field_name in ["monthly_revenue", "monthly_expense", "assets_estimate"]:
        if field_name in extracted:
            regex_val = regex_extract(field_name, clean_content)
            llm_val = extracted.get(field_name)
            if regex_val and llm_val:
                try:
                    delta_pct = abs(regex_val - int(llm_val)) / max(abs(int(llm_val)), 1) * 100
                    if delta_pct > 30:
                        flags["discrepancy_detected"] = True
                        flags["discrepancy_field"] = field_name
                except (ValueError, TypeError):
                    pass

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

    # ── Update financial snapshot (accumulate) ────────────────
    if extracted:
        snapshot.update({k: v for k, v in extracted.items() if v is not None})

    # ── Compute progress & stage (backend-driven) ─────────────
    new_progress = _compute_progress(snapshot)
    computed_stage = _compute_stage(snapshot)

    # Gunakan stage dari backend logic (lebih reliable daripada AI)
    # Kecuali AI explicitly bilang "summary"
    ai_stage = rina_response.get("current_stage")
    if ai_stage == "summary":
        new_stage = "summary"
    else:
        new_stage = computed_stage

    # ── Build session update ──────────────────────────────────
    session_updates: dict = {
        "interview_stage": new_stage,
        "progress_pct": new_progress,
        "contradiction_count": contradiction_count,
        "financial_snapshot": snapshot if snapshot else None,
    }

    # Propagate critical financial fields ke session columns
    for field, col in [
        ("monthly_revenue", "monthly_revenue"),
        ("monthly_expense", "monthly_expense"),
        ("transaction_frequency_daily", "transaction_frequency_daily"),
        ("assets_estimate", "assets_estimate"),
    ]:
        if field in extracted and extracted[field] is not None:
            session_updates[col] = extracted[field]

    # Emotional signals
    if flags.get("emotional_signal"):
        session_updates["emotional_signal"] = True
    if flags.get("wellbeing_concern"):
        session_updates["wellbeing_concern"] = True

    db.table("sessions").update(session_updates).eq("id", str(session_id)).execute()

    # ── Sync extracted fields ke business_profiles ────────────
    bp_updates = {}
    for ext_field, bp_col in _BP_FIELD_MAP.items():
        if ext_field in extracted and extracted[ext_field] is not None:
            bp_updates[bp_col] = extracted[ext_field]

    if bp_updates:
        business_id = session.get("business_id")
        if business_id:
            try:
                db.table("business_profiles").update(bp_updates).eq("id", str(business_id)).execute()
                logger.info(
                    "business_profile_synced",
                    business_id=str(business_id),
                    fields=list(bp_updates.keys()),
                )
            except Exception as exc:
                logger.error("business_profile_sync_failed", error=str(exc))

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

    # Save RINA response
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
