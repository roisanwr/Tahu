"""
app/core/security.py — Supabase JWT Verification
Verifikasi JWT token yang dikirim user dari frontend (Supabase Auth).
"""
from __future__ import annotations

from typing import Any

from supabase import Client

from app.core.errors import AuthError, TokenExpiredError
from app.core.logging import get_logger

logger = get_logger(__name__)


async def verify_token(token: str, db: Client) -> dict[str, Any]:
    """
    Verifikasi Supabase JWT token.
    Return: user dict dari Supabase auth
    Raise: AuthError jika token invalid/expired
    """
    if not token:
        raise AuthError("Token tidak ditemukan")

    # Strip "Bearer " prefix jika ada
    if token.startswith("Bearer "):
        token = token[7:]

    try:
        # Gunakan Supabase client untuk verify token
        # Ini juga refresh token jika expired
        user_resp = db.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise AuthError("Token tidak valid")

        user = user_resp.user
        return {
            "id": user.id,
            "email": user.email,
            "full_name": (user.user_metadata or {}).get("full_name"),
            "avatar_url": (user.user_metadata or {}).get("avatar_url"),
        }
    except AuthError:
        raise
    except Exception as exc:
        err_str = str(exc).lower()
        if "expired" in err_str or "jwt" in err_str:
            raise TokenExpiredError()
        logger.warning("jwt_verification_failed", error=str(exc))
        raise AuthError(f"Token tidak valid: {exc}")
