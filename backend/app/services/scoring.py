from datetime import date, datetime, timezone

WEIGHTS = {
    "payment_score": .30, "renewal_score": .25, "activity_score": .20,
    "timeliness_score": .15, "stability_score": .10
}

def as_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None

def clamp(value):
    return max(0, min(100, round(value)))

def calculate_health(subscription, invoices, payments):
    reasons, actions = [], []

    # Payment reliability: successful attempts / all recorded attempts.
    attempts = [str(p.get("status", "")).lower() for p in payments]
    if attempts:
        successes = sum(x in ("success", "succeeded", "paid") for x in attempts)
        payment = clamp(100 * successes / len(attempts))
        if successes < len(attempts):
            reasons.append(f"{len(attempts)-successes} of {len(attempts)} payment attempts failed.")
            actions.append("Review failed payment attempts and contact the customer.")
    elif invoices:
        payment = clamp(100 * sum(i.get("status") == "paid" for i in invoices) / len(invoices))
    else:
        payment = 75
        reasons.append("Insufficient payment history; provisional score used.")
        actions.append("Review after the first billing cycle.")

    # Renewal counters should be updated by the subscription lifecycle workflow.
    renewed = int(subscription.get("renewal_count") or 0)
    missed = int(subscription.get("missed_renewal_count") or 0)
    renewal = clamp(100 * renewed / (renewed + missed)) if renewed + missed else 75
    if missed:
        reasons.append(f"{missed} renewal(s) were missed.")
        actions.append("Check renewal settings and contact the customer before renewal.")

    state = str(subscription.get("status", "")).lower()
    activity = {"active":100, "confirmed":85, "paused":60, "draft":50,
                "quotation":50, "closed":20, "expired":15,
                "cancelled":10, "canceled":10}.get(state, 60)
    if state == "paused":
        reasons.append("Subscription is currently paused.")
        actions.append("Confirm whether the customer intends to resume.")
    elif state in ("expired", "closed", "cancelled", "canceled"):
        reasons.append(f"Subscription status is {state}.")
        actions.append("Review whether the subscription should be renewed or closed.")

    today = date.today()
    paid = [i for i in invoices if str(i.get("status", "")).lower() == "paid"]
    late = sum(bool(as_date(i.get("paid_at")) and as_date(i.get("due_date"))
                    and as_date(i.get("paid_at")) > as_date(i.get("due_date"))) for i in paid)
    overdue = [i for i in invoices if str(i.get("status", "")).lower() not in ("paid","cancelled","canceled")
               and as_date(i.get("due_date")) and as_date(i.get("due_date")) < today]
    basis = len(paid) + len(overdue)
    timeliness = clamp(100 * (1 - (late + len(overdue)) / basis)) if basis else 75
    if overdue:
        reasons.append(f"{len(overdue)} invoice(s) are overdue.")
        actions.append("Send payment reminders and review outstanding invoices.")
    if late:
        reasons.append(f"{late} paid invoice(s) were settled late.")

    pauses = int(subscription.get("pause_count") or 0)
    reactivations = int(subscription.get("reactivation_count") or 0)
    stability = clamp(100 - pauses * 12 - reactivations * 8)
    if pauses or reactivations:
        reasons.append(f"History includes {pauses} pause(s) and {reactivations} reactivation(s).")
        actions.append("Check whether the current plan still fits the customer's needs.")

    dimensions = {
        "payment_score": payment, "renewal_score": renewal, "activity_score": activity,
        "timeliness_score": timeliness, "stability_score": stability
    }
    score = clamp(sum(dimensions[k] * WEIGHTS[k] for k in WEIGHTS))
    band = "Healthy" if score >= 80 else "Moderate Risk" if score >= 60 else "At Risk" if score >= 40 else "Critical"
    return {
        "subscription_id": str(subscription["id"]), **dimensions,
        "health_score": score, "health_status": band,
        "risk_reasons": reasons or ["No significant risk signals detected."],
        "recommended_actions": list(dict.fromkeys(actions or ["Continue normal account monitoring."])),
        "calculated_at": datetime.now(timezone.utc).isoformat()
    }
