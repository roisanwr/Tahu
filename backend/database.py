"""
database.py — Supabase Connection Manager

Menyediakan Supabase client untuk digunakan sebagai
FastAPI dependency injection di semua router.

Usage:
    from database import get_supabase
    
    @router.get("/example")
    async def example(db: Client = Depends(get_supabase)):
        data = db.table("sessions").select("*").execute()
        return data
"""
import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

_SUPABASE_URL: str = os.environ["SUPABASE_URL"]
_SUPABASE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Singleton client — service role key untuk operasi backend
# (bypass RLS policy, digunakan hanya di server)
_client: Client = create_client(_SUPABASE_URL, _SUPABASE_KEY)


def get_supabase() -> Client:
    """FastAPI dependency: kembalikan Supabase client singleton."""
    return _client
