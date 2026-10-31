from fastapi import APIRouter, Depends
from app.security import admin_user
from app.schemas import StaffInput
from app.db import create_auth_user, db_request
router=APIRouter(prefix="/admin",tags=["Administration"])

@router.post("/staff",status_code=201)
async def create_staff(body: StaffInput,user=Depends(admin_user)):
    auth=await create_auth_user(body.email,body.password,{"full_name":body.full_name})
    # signup trigger creates a customer profile; immediately change it to staff.
    await db_request("PATCH","profiles",{"id":f"eq.{auth['id']}"},{"role":"staff","customer_id":None})
    return {"id":auth["id"],"email":auth.get("email"),"role":"staff"}
