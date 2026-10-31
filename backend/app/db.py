import httpx
from fastapi import HTTPException
from app.config import settings

def headers(prefer=None):
    s = settings()
    h = {
        "apikey": s.supabase_service_role_key,
        "Authorization": f"Bearer {s.supabase_service_role_key}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h

async def db_request(method, table, params=None, data=None, prefer="return=representation"):
    s = settings()
    url = f"{s.supabase_url.rstrip('/')}/rest/v1/{table.lstrip('/')}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.request(method, url, headers=headers(prefer), params=params, json=data)
    if r.is_error:
        try:
            detail = r.json()
        except ValueError:
            detail = r.text
        raise HTTPException(status_code=502, detail={"database_error": detail})
    if r.status_code == 204 or not r.content:
        return None
    return r.json()

async def auth_user(token: str):
    s = settings()
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(
            f"{s.supabase_url.rstrip('/')}/auth/v1/user",
            headers={"apikey": s.supabase_anon_key, "Authorization": f"Bearer {token}"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
    return r.json()

async def create_auth_user(email, password, metadata):
    s = settings()
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            f"{s.supabase_url.rstrip('/')}/auth/v1/admin/users",
            headers=headers(),
            json={"email": email, "password": password, "email_confirm": True, "user_metadata": metadata},
        )
    if r.is_error:
        try: detail = r.json()
        except ValueError: detail = r.text
        raise HTTPException(status_code=400, detail=detail)
    return r.json()
