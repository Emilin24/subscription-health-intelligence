# Scoring model

| Factor | Weight | Initial calculation |
|---|---:|---|
| Payment reliability | 30% | Successful payment attempts / all attempts. Falls back to paid invoices / invoices. |
| Renewal behaviour | 25% | `renewal_count / (renewal_count + missed_renewal_count)`. If no history, provisional 75. |
| Subscription activity | 20% | Active 100, confirmed 85, paused 60, draft/quotation 50, closed 20, expired 15, cancelled 10. |
| Payment timeliness | 15% | Paid invoices on time and open overdue invoices. No timing history: provisional 75. |
| Stability | 10% | 100 minus 12 per pause and 8 per reactivation, floor 0. |

`final_score = round(payment*.30 + renewal*.25 + activity*.20 + timeliness*.15 + stability*.10)`

Bands: 80–100 Healthy; 60–79 Moderate Risk; 40–59 At Risk; 0–39 Critical.

This is an explainable operational indicator, not a validated churn predictor. The provisional score for missing history avoids automatically penalising new customers. Renewal counters must be maintained by the subscription lifecycle workflow. Define grace periods, timezone, partial-payment and dispute handling for your business before production. Never suspend or cancel a customer solely based on this score.
