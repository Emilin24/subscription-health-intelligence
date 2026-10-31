from app.scoring import score_subscription

def test_healthy_subscription_score_is_bounded():
    sub={"status":"active","renewal_count":4,"missed_renewal_count":0,"pause_count":0,"reactivation_count":0,"next_billing_date":"2999-01-01"}
    result=score_subscription(sub,[{"status":"paid"}],[])
    assert 0 <= result["health_score"] <= 100
    assert result["health_status"] == "Healthy"

def test_inactive_subscription_reduces_score():
    sub={"status":"closed","renewal_count":0,"missed_renewal_count":5,"pause_count":3,"reactivation_count":2,"next_billing_date":"2000-01-01"}
    result=score_subscription(sub,[{"status":"overdue"}],[])
    assert result["health_score"] < 60
