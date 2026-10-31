# Subscription Health Intelligence

Full-stack subscription health scoring module for an existing subscription-management system.

**Stack:** React + Vite + Tailwind + Recharts | FastAPI + Python | Supabase PostgreSQL + Auth.

## Features
- Weighted, explainable health score (0–100).
- Five factors: payment reliability (30%), renewal behaviour (25%), subscription activity (20%), payment timeliness (15%), stability (10%).
- Risk reasons, recommended actions, score history, dashboard filters and summary.
- Supabase Auth login; backend verifies the access token and requires `admin` or `staff` profile role.
- Optional daily recalculation scheduler.

## Setup
### Supabase
Run `supabase/migrations/001_subscription_health.sql` in the Supabase SQL Editor. It contains starter tables for customers, subscriptions, invoices and payments plus health tables. If your project already has core tables, adapt the migration and queries to your existing column names; do not recreate existing tables blindly.

Create a Supabase Auth user and insert a matching `profiles` row with role `admin` or `staff`.

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
# Fill SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
uvicorn app.main:app --reload
```
API docs: http://127.0.0.1:8000/docs

### Frontend
```bash
cd frontend
npm install
copy .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
Set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` in frontend `.env`.

## API
All `/api/health` endpoints require `Authorization: Bearer <Supabase access token>`.
- `GET /api/health/summary`
- `GET /api/health/subscriptions?search=&status=`
- `GET /api/health/subscriptions/{id}`
- `POST /api/health/subscriptions/{id}/recalculate`
- `POST /api/health/recalculate-all`
- `GET /api/health/subscriptions/{id}/history`

## Important
- Never expose or commit the Supabase service-role key. It belongs only in backend `.env`.
- This is an integration-ready starter module, not a replacement for your full subscription system.
- Scores are operational risk indicators, not validated churn predictions. Calibrate weights against real outcomes.
- Do not automatically suspend or cancel customers solely based on a health score.
- Before production, add rate limiting, monitoring, audit logs, stricter CORS settings and business-timezone handling.
