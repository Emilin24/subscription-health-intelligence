from app.services.scoring import calculate_health

def test_clean_active_subscription_scores_healthy():
    result = calculate_health(
        {"id":"sub1","status":"active","renewal_count":4,"missed_renewal_count":0,
         "pause_count":0,"reactivation_count":0},
        [{"status":"paid","due_date":"2026-01-01","paid_at":"2026-01-01"}],
        [{"status":"success"},{"status":"success"}])
    assert result["health_score"] >= 80
    assert result["health_status"] == "Healthy"

def test_failed_payments_reduce_score():
    result = calculate_health(
        {"id":"sub2","status":"active","renewal_count":1,"missed_renewal_count":3,
         "pause_count":2,"reactivation_count":1},
        [{"status":"confirmed","due_date":"2020-01-01"}],
        [{"status":"failed"},{"status":"failed"},{"status":"success"}])
    assert result["payment_score"] == 33
    assert result["health_score"] < 60
    assert result["risk_reasons"]
