from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from uuid import uuid4
from app.security import internal_user, admin_user
from app.db import db_request
from app.schemas import QuoteInput, SubscriptionInput, StatusInput

router=APIRouter(tags=["Quotations and Subscriptions"])

async def get_rows(table, params):
    return await db_request("GET",table,params) or []

@router.get("/subscriptions")
async def subscriptions(user=Depends(internal_user)):
    return await get_rows("subscriptions",{"select":"*,customers(name,email),plans(name,billing_interval,price)","order":"created_at.desc"})

@router.post("/subscriptions")
async def create_subscription(body: SubscriptionInput,user=Depends(internal_user)):
    plan=None
    if body.plan_id:
        rows=await get_rows("plans",{"id":f"eq.{body.plan_id}","select":"*"})
        if not rows: raise HTTPException(404,"Plan not found")
        plan=rows[0]
    sid=str(uuid4())
    today=body.start_date or date.today()
    sub={
        "id":sid,"subscription_number":f"SUB-{date.today():%Y%m%d}-{sid[:8].upper()}",
        "customer_id":body.customer_id,"plan_id":body.plan_id,"status":"active",
        "start_date":today.isoformat(),"next_billing_date":today.isoformat(),
        "payment_terms":body.payment_terms
    }
    await db_request("POST","subscriptions",data=sub)
    for line in body.items:
        item={
            "subscription_id":sid,"product_id":line["product_id"],
            "quantity":int(line.get("quantity",1)),"unit_price":line["unit_price"],
            "variant_id":line.get("variant_id"),"tax_id":line.get("tax_id"),
            "discount_id":line.get("discount_id")
        }
        await db_request("POST","subscription_items",data=item)
    return {"id":sid,"subscription_number":sub["subscription_number"],"status":"active"}

@router.patch("/subscriptions/{sid}/status")
async def subscription_status(sid:str,body:StatusInput,user=Depends(internal_user)):
    allowed={"active","paused","closed","draft","confirmed","quotation"}
    if body.status not in allowed: raise HTTPException(400,"Invalid subscription status")
    return await db_request("PATCH","subscriptions",{"id":f"eq.{sid}"},{"status":body.status})

@router.get("/quotations")
async def quotations(user=Depends(internal_user)):
    return await get_rows("quotations",{"select":"*,customers(name,email)","order":"created_at.desc"})

@router.post("/quotations")
async def create_quotation(body:QuoteInput,user=Depends(internal_user)):
    qid=str(uuid4())
    number=f"QUO-{date.today():%Y%m%d}-{qid[:8].upper()}"
    quote={"id":qid,"quotation_number":number,"customer_id":body.customer_id,
           "status":"quotation","valid_until":body.valid_until.isoformat() if body.valid_until else None,
           "notes":body.notes}
    await db_request("POST","quotations",data=quote)
    subtotal=0
    for line in body.items:
        qty=int(line.get("quantity",1)); price=float(line["unit_price"])
        amount=qty*price; subtotal+=amount
        await db_request("POST","quotation_items",data={
            "quotation_id":qid,"product_id":line.get("product_id"),"plan_id":line.get("plan_id"),
            "quantity":qty,"unit_price":price,"tax_id":line.get("tax_id"),
            "tax_amount":float(line.get("tax_amount",0)),"discount_amount":float(line.get("discount_amount",0)),
            "total_amount":amount+float(line.get("tax_amount",0))-float(line.get("discount_amount",0))
        })
    await db_request("PATCH","quotations",{"id":f"eq.{qid}"},{"subtotal":subtotal,"total_amount":subtotal})
    return {"id":qid,"quotation_number":number}

@router.post("/quotations/{qid}/convert")
async def convert_quote(qid:str,user=Depends(internal_user)):
    qs=await get_rows("quotations",{"id":f"eq.{qid}","select":"*"})
    if not qs: raise HTTPException(404,"Quotation not found")
    q=qs[0]
    if q["status"] not in ("quotation","confirmed"): raise HTTPException(400,"Quotation cannot be converted")
    lines=await get_rows("quotation_items",{"quotation_id":f"eq.{qid}","select":"*"})
    sid=str(uuid4())
    await db_request("POST","subscriptions",data={
        "id":sid,"subscription_number":f"SUB-{date.today():%Y%m%d}-{sid[:8].upper()}",
        "customer_id":q["customer_id"],"status":"active","start_date":date.today().isoformat(),
        "next_billing_date":date.today().isoformat(),"quotation_id":qid
    })
    for line in lines:
        if line.get("product_id"):
            await db_request("POST","subscription_items",data={
                "subscription_id":sid,"product_id":line["product_id"],"quantity":line["quantity"],
                "unit_price":line["unit_price"],"tax_id":line.get("tax_id")
            })
    await db_request("PATCH","quotations",{"id":f"eq.{qid}"},{"status":"confirmed"})
    return {"subscription_id":sid,"status":"active"}
