from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from uuid import uuid4
from app.security import internal_user, customer_user
from app.db import db_request
from app.scoring import score_subscription

router=APIRouter(prefix="/health",tags=["Subscription Health"])

async def rows(table,params):
    return await db_request("GET",table,params) or []

@router.get("/summary")
async def summary(user=Depends(internal_user)):
    data=await rows("subscription_health",{"select":"health_score,health_status"})
    labels=["Healthy","Moderate Risk","At Risk","Critical"]
    counts={x:0 for x in labels}
    for x in data:
        if x.get("health_status") in counts: counts[x["health_status"]]+=1
    return {"total":len(data),"average":round(sum(x["health_score"] for x in data)/len(data),2) if data else 0,"counts":counts}

@router.get("/list")
async def health_list(user=Depends(internal_user)):
    return await rows("subscription_health",{"select":"*,subscriptions(subscription_number,status,customers(name))","order":"calculated_at.desc"})

@router.post("/recalculate")
async def recalculate(user=Depends(internal_user)):
    subs=await rows("subscriptions",{"select":"*"})
    updated=[]
    for sub in subs:
        invoices=await rows("invoices",{"select":"id,status,total","subscription_id":f"eq.{sub['id']}"})
        payments=await rows("payments",{"select":"amount,status","subscription_id":f"eq.{sub['id']}"})
        result=score_subscription(sub,invoices,payments)
        existing=await rows("subscription_health",{"select":"id","subscription_id":f"eq.{sub['id']}"})
        timestamp=datetime.now(timezone.utc).isoformat()
        payload={**result,"subscription_id":sub["id"],"calculated_at":timestamp}
        if existing:
            await db_request("PATCH","subscription_health",{"id":f"eq.{existing[0]['id']}"},payload)
        else:
            payload["id"]=str(uuid4())
            await db_request("POST","subscription_health",data=payload)
        await db_request("POST","subscription_health_history",data={
            "id":str(uuid4()),"subscription_id":sub["id"],
            "health_score":result["health_score"],"health_status":result["health_status"],
            "dimension_scores":{k:result[k] for k in ["payment_score","renewal_score","activity_score","timeliness_score","stability_score"]},
            "calculated_at":timestamp
        })
        updated.append({"subscription_id":sub["id"],"health_score":result["health_score"],"health_status":result["health_status"]})
    return {"updated":len(updated),"results":updated}

@router.get("/mine")
async def my_health(user=Depends(customer_user)):
    subs=await rows("subscriptions",{"select":"id","customer_id":f"eq.{user['customer_id']}"})
    out=[]
    for sub in subs:
        out += await rows("subscription_health",{"select":"*","subscription_id":f"eq.{sub['id']}"})
    return out
