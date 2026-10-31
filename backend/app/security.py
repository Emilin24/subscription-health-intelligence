from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import auth_user, db_request

bearer = HTTPBearer(auto_error=False)

async def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = await auth_user(credentials.credentials)
    rows = await db_request("GET", "profiles", {
        "select": "id,full_name,role,customer_id",
        "id": f"eq.{user['id']}", "limit": "1"
    })
    if not rows:
        raise HTTPException(status_code=403, detail="No application profile exists for this account")
    profile = rows[0]
    return {
        "id": user["id"], "email": user.get("email"),
        "full_name": profile.get("full_name"),
        "role": profile.get("role"), "customer_id": profile.get("customer_id")
    }

def allow_roles(*roles):
    async def checker(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker

internal_user = allow_roles("admin", "staff")
admin_user = allow_roles("admin")

async def customer_user(user=Depends(current_user)):
    if user["role"] != "customer" or not user.get("customer_id"):
        raise HTTPException(status_code=403, detail="Customer account is not linked")
    return user
