from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from uuid import uuid4
from app.security import internal_user
from app.db import db_request
from app.schemas import PaymentInput, StatusInput
from app.utils import next_date

router=APIRouter(tags=["Billing and Payments"])

async def rows(table,params):
    return await db_request("GET",table,params) or []

@router.get("/invoices")
async def invoices(user=Depends(internal_user)):
    return await rows("invoices",{"select":"*,customers(name,email),subscriptions(subscription_number)","order":"created_at.desc"})

@router.post("/billing/run")
async def run_billing(user=Depends(internal_user)):
    today=date.today()
    active=await rows("subscriptions",{
        "select":"*,plans(name,billing_interval,price)",
        "status":"eq.active","next_billing_date":f"lte.{today.isoformat()}"
    })
    made=[]; skipped=[]
    for sub in active:
        prior=await rows("invoices",{
            "select":"id","subscription_id":f"eq.{sub['id']}",
            "invoice_date":f"eq.{sub.get('next_billing_date')}"
        })
        if prior:
            skipped.append(sub["id"]); continue
        lines=await rows("subscription_items",{"subscription_id":f"eq.{sub['id']}","select":"*"})
        subtotal=0.0; tax=0.0; discount=0.0
        for line in lines:
            amount=float(line["unit_price"])*int(line["quantity"])
            subtotal+=amount
            if line.get("tax_id"):
                ts=await rows("taxes",{"id":f"eq.{line['tax_id']}","select":"tax_rate"})
                if ts: tax+=amount*float(ts[0]["tax_rate"])/100
        total=round(subtotal+tax-discount,2)
        iid=str(uuid4())
        invno=f"INV-{today:%Y%m%d}-{iid[:8].upper()}"
        await db_request("POST","invoices",data={
            "id":iid,"invoice_number":invno,"subscription_id":sub["id"],
            "customer_id":sub["customer_id"],"status":"confirmed",
            "invoice_date":sub.get("next_billing_date") or today.isoformat(),
            "due_date":today.isoformat(),"subtotal":round(subtotal,2),
            "tax_amount":round(tax,2),"discount_amount":discount,
            "total":total,"amount_paid":0,"balance_due":total
        })
        for line in lines:
            amount=float(line["unit_price"])*int(line["quantity"])
            await db_request("POST","invoice_items",data={
                "invoice_id":iid,"product_id":line["product_id"],
                "quantity":line["quantity"],"unit_price":line["unit_price"],
                "tax_amount":0,"discount_amount":0,"total_amount":amount
            })
        plan= sub.get("plans") or {}
        interval=plan.get("billing_interval","monthly")
        nextbill=next_date(date.fromisoformat(sub.get("next_billing_date") or today.isoformat()),interval)
        await db_request("PATCH","subscriptions",{"id":f"eq.{sub['id']}"},{"next_billing_date":nextbill.isoformat(),"renewal_count":int(sub.get("renewal_count",0))+1})
        made.append({"invoice_id":iid,"invoice_number":invno,"total":total})
    return {"created":made,"skipped_duplicate":skipped,"count":len(made)}

@router.patch("/invoices/{invoice_id}/status")
async def invoice_status(invoice_id:str,body:StatusInput,user=Depends(internal_user)):
    if body.status not in ("draft","confirmed","cancelled","overdue"):
        raise HTTPException(400,"Invalid invoice status")
    return await db_request("PATCH","invoices",{"id":f"eq.{invoice_id}"},{"status":body.status})

@router.get("/payments")
async def payments(user=Depends(internal_user)):
    return await rows("payments",{"select":"*,invoices(invoice_number)","order":"created_at.desc"})

@router.post("/payments")
async def record_payment(body:PaymentInput,user=Depends(internal_user)):
    invs=await rows("invoices",{"id":f"eq.{body.invoice_id}","select":"*"})
    if not invs: raise HTTPException(404,"Invoice not found")
    inv=invs[0]
    remaining=round(float(inv.get("balance_due") or inv.get("total") or 0),2)
    amount=round(float(body.amount),2)
    if amount>remaining: raise HTTPException(400,"Payment exceeds outstanding balance")
    await db_request("POST","payments",data={
        "invoice_id":body.invoice_id,"subscription_id":inv["subscription_id"],
        "customer_id":inv["customer_id"],"amount":amount,"method":body.payment_method,
        "payment_method":body.payment_method,"status":"success",
        "paid_at":date.today().isoformat(),"payment_date":date.today().isoformat(),
        "transaction_reference":body.transaction_reference,"notes":body.notes
    })
    paid=round(float(inv.get("amount_paid") or 0)+amount,2)
    balance=round(max(0,float(inv.get("total") or inv.get("total_amount") or 0)-paid),2)
    patch={"amount_paid":paid,"balance_due":balance}
    if balance==0: patch.update({"status":"paid","paid_at":date.today().isoformat()})
    await db_request("PATCH","invoices",{"id":f"eq.{body.invoice_id}"},patch)
    return {"invoice_id":body.invoice_id,"amount_paid":paid,"balance_due":balance,"status":"paid" if balance==0 else "partially_paid"}
