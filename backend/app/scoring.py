"""Transparent subscription health heuristic; not a validated churn predictor."""
from datetime import date

def score_subscription(subscription, invoices, payments):
    n=max(1,len(invoices))
    paid=sum(1 for i in invoices if i.get("status")=="paid")
    payment_score=round(100*paid/n) if invoices else 75
    renewals=int(subscription.get("renewal_count") or 0)
    missed=int(subscription.get("missed_renewal_count") or 0)
    renewal_score=round(100*renewals/(renewals+missed)) if renewals+missed else 75
    status=subscription.get("status")
    activity_score=100 if status=="active" else (55 if status=="paused" else 20)
    due=subscription.get("next_billing_date")
    if due:
        delta=(date.today()-date.fromisoformat(due[:10])).days
        timeliness_score=100 if delta<=0 else max(0,100-delta*10)
    else:
        timeliness_score=75
    pauses=int(subscription.get("pause_count") or 0)
    reactivations=int(subscription.get("reactivation_count") or 0)
    stability_score=max(0,100-pauses*10-reactivations*5)
    components={"payment_score":payment_score,"renewal_score":renewal_score,
                "activity_score":activity_score,"timeliness_score":timeliness_score,
                "stability_score":stability_score}
    total=round(payment_score*.30+renewal_score*.25+activity_score*.20+
                timeliness_score*.15+stability_score*.10)
    health_status="Healthy" if total>=80 else "Moderate Risk" if total>=60 else "At Risk" if total>=40 else "Critical"
    reasons=[]
    if payment_score<70: reasons.append("Payment reliability is below target")
    if renewal_score<70: reasons.append("Missed renewals are affecting the score")
    if activity_score<70: reasons.append("Subscription is not currently active")
    if timeliness_score<70: reasons.append("Next billing date is overdue")
    if stability_score<70: reasons.append("Frequent pauses or reactivations")
    return {"health_score":total,"health_status":health_status,**components,"risk_reasons":reasons}
