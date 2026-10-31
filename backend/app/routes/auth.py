from fastapi import APIRouter, Depends
from app.security import current_user
router=APIRouter(prefix="/auth",tags=["Authentication"])

@router.get("/me")
async def me(user=Depends(current_user)):
    return user
