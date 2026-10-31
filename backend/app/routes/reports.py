from fastapi import APIRouter, Depends
from app.security import internal_user
from app.db import db_request
router=APIRouter(prefix="/reports",tags=["Reports"])

@router.get("/overview")
async def overview(user=Depends(internal_user)):
    subs=await db_request("GET","subscriptions",{"select":"id,status"}) or []
    invoices=await db_request("GET","invoices",{"select":"id,status,total,balance_due,amount_paid"}) or []
    payments=await db_request("GET","payments",{"select":"amount,status"}) or []
    return {
        "subscriptions_total":len(subs),
        "subscriptions_active":sum(1 for x in subs if x["status"]=="active"),
        "invoices_total":len(invoices),
        "overdue_invoices":sum(1 for x in invoices if x["status"]=="overdue"),
        "revenue_received":round(sum(float(x["amount"]) for x in payments if x["status"]=="success"),2),
        "outstanding":round(sum(float(x.get("balance_due") or 0) for x in invoices if x["status"]!="cancelled"),2)
    }
