from fastapi import HTTPException
from app.core.supabase import get_db
from app.services.scoring import calculate_health

def db():
    return get_db()

def rows(table, sid):
    return db().table(table).select("*").eq("subscription_id", sid).execute().data or []

def subscription(sid):
    result = db().table("subscriptions").select("*").eq("id", sid).maybe_single().execute().data
    if not result:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return result

def calculate(sid):
    result = calculate_health(subscription(sid), rows("invoices", sid), rows("payments", sid))
    fields = ("subscription_id health_score payment_score renewal_score activity_score "
              "timeliness_score stability_score health_status risk_reasons calculated_at").split()
    db().table("subscription_health").upsert({k: result[k] for k in fields},
                                              on_conflict="subscription_id").execute()
    db().table("subscription_health_history").insert({
        "subscription_id": sid, "health_score": result["health_score"],
        "health_status": result["health_status"],
        "dimension_scores": {k: result[k] for k in fields if k.endswith("_score") and k != "health_score"}
    }).execute()
    return result

def recalculate_all():
    ids = db().table("subscriptions").select("id").execute().data or []
    ok, failed = 0, []
    for item in ids:
        try:
            calculate(str(item["id"]))
            ok += 1
        except Exception as exc:
            failed.append({"subscription_id": str(item["id"]), "error": str(exc)})
    return {"total": len(ids), "succeeded": ok, "failed": failed}

def summary():
    data = db().table("subscription_health").select("health_score,health_status").execute().data or []
    count = len(data)
    bands = {x: sum(r.get("health_status") == x for r in data)
             for x in ("Healthy", "Moderate Risk", "At Risk", "Critical")}
    return {"total": count, "healthy": bands["Healthy"], "moderate_risk": bands["Moderate Risk"],
            "at_risk": bands["At Risk"], "critical": bands["Critical"],
            "average_score": round(sum(int(r.get("health_score") or 0) for r in data)/count, 1) if count else 0}

def listing(search=None, status=None, limit=100):
    q = db().table("subscription_health").select(
        "*, subscriptions(id,subscription_number,status,customer_id,customers(name))"
    ).order("health_score").limit(limit)
    if status:
        q = q.eq("health_status", status)
    data = q.execute().data or []
    if search:
        term = search.lower()
        data = [r for r in data if term in str(r.get("subscription_id","")).lower()
                or term in str((r.get("subscriptions") or {}).get("subscription_number","")).lower()
                or term in str(((r.get("subscriptions") or {}).get("customers") or {}).get("name","")).lower()]
    return data

def detail(sid):
    score = db().table("subscription_health").select("*").eq("subscription_id", sid).maybe_single().execute().data
    if not score:
        return calculate(sid)
    return {**score, "subscription": subscription(sid), "invoices": rows("invoices", sid)}

def history(sid):
    return db().table("subscription_health_history").select("*").eq("subscription_id", sid).order("calculated_at").limit(100).execute().data or []
