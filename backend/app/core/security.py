from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.supabase import get_auth_client, get_db

bearer = HTTPBearer()

def require_staff(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        user = get_auth_client().auth.get_user(credentials.credentials).user
        if not user:
            raise ValueError("Unauthenticated")
        profile = get_db().table("profiles").select("role").eq("id", user.id).single().execute().data
        if not profile or profile.get("role") not in ("admin", "staff"):
            raise HTTPException(status_code=403, detail="Admin or staff access required")
        return {"id": user.id, "role": profile["role"]}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")
