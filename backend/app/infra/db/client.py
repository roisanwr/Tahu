"""
app/infra/db/client.py — Supabase Client Singleton
Satu instance client untuk seluruh aplikasi. Thread-safe.
"""
from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.core.logging import get_logger

logger = get_logger(__name__)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Return singleton Supabase client dengan service_role key.
    service_role bypass RLS — hanya digunakan di backend server.
    """
    from app.core.config import get_settings
    settings = get_settings()

    client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
    logger.info("supabase_client_initialized", url=settings.supabase_url)
    return client
