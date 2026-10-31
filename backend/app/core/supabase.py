from functools import lru_cache
from supabase import create_client
from app.core.config import get_settings

@lru_cache
def get_db():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)

def get_auth_client():
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_anon_key)
