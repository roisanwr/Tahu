"""
app/core/deps.py — FastAPI Dependency Injection
get_current_user: dependency yang dipakai di semua protected endpoints.
get_db: dependency untuk Supabase client.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from supabase import Client

from app.core.errors import AppError, AuthError
from app.core.security import verify_token
from app.infra.db.client import get_supabase_client


async def get_db() -> Client:
    """Dependency: Supabase client (service_role — bypass RLS untuk backend)."""
    return get_supabase_client()


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Client = Depends(get_db),
) -> dict:
    """
    Dependency: Ambil user dari JWT token di Authorization header.
    Raise 401 jika token missing/invalid.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Authorization header diperlukan",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return await verify_token(authorization, db)
    except AppError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
            headers={"WWW-Authenticate": "Bearer"},
        )


# Type alias untuk convenience
CurrentUser = Annotated[dict, Depends(get_current_user)]
DBClient = Annotated[Client, Depends(get_db)]
