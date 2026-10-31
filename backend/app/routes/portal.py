from fastapi import APIRouter, Depends
from app.security import customer_user
from app.db import db_request
router=APIRouter(prefix="/portal",tags=["Customer Portal"])

@router.get("/subscriptions")
async def my_subscriptions(user=Depends(customer_user)):
    return await db_request("GET","subscriptions",{
        "select":"*,plans(name,billing_interval,price)",
        "customer_id":f"eq.{user['customer_id']}","order":"created_at.desc"
    })

@router.get("/invoices")
async def my_invoices(user=Depends(customer_user)):
    return await db_request("GET","invoices",{
        "select":"*","customer_id":f"eq.{user['customer_id']}","order":"created_at.desc"
    })

@router.get("/payments")
async def my_payments(user=Depends(customer_user)):
    return await db_request("GET","payments",{
        "select":"*","customer_id":f"eq.{user['customer_id']}","order":"created_at.desc"
    })

@router.post("/change-requests")
async def request_change(body:dict,user=Depends(customer_user)):
    body["customer_id"]=user["customer_id"]
    return await db_request("POST","subscription_change_requests",data=body)
