"""Supabase client initialization."""

from functools import lru_cache

from supabase import Client, create_client

from app.config import SUPABASE_KEY, SUPABASE_URL


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return a cached Supabase client (usable as a FastAPI dependency)."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


supabase: Client = get_supabase()

__all__ = ["supabase", "get_supabase"]