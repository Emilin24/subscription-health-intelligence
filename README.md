# Brightloop Subscription Management System

A full-stack MVP for the Brightloop subscription-management brief.

## Stack
- Frontend: React + Vite + React Router + plain CSS
- Backend: FastAPI + HTTPX
- Database/Auth: Supabase PostgreSQL + Supabase Auth

## Important database prerequisite
This project targets the **existing Supabase project after applying**
`brightloop_existing_project_migration.sql` supplied earlier in this conversation.
The application does not run SQL migrations automatically.

The migration must have completed successfully. It adds the new catalogue,
quotation, line-item and customer-request tables while retaining the existing
health-scoring tables and legacy columns (`customers.name`, `invoices.total`,
`payments.method`, `subscriptions.end_date`, etc.).

## 1. Backend setup (Windows PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Fill in `backend/.env`:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SECRET_OR_SERVICE_ROLE_KEY
CORS_ORIGINS=http://localhost:5173
```

The service-role key is backend-only. Never place it in `frontend/.env`,
commit it, or share it.

Start the API from the `backend` directory:

```powershell
python -m uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## 2. Frontend setup (second terminal)

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set the Vite Supabase URL and publishable/anon key in `frontend/.env`.
Do not use the service-role key in the frontend.

Frontend: http://localhost:5173

## 3. First admin account
1. Create your account through the app's Sign up page.
2. The database signup trigger should create a `profiles` row with role
   `customer` and a linked customer record.
3. In Supabase SQL Editor, promote that account to admin:

```sql
UPDATE public.profiles
SET role = 'admin', customer_id = NULL
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'
);
```

4. Sign out and sign back in. Admin dashboard routes should now be available.

Only an admin can create staff users through the app.

## 4. Included features
- Supabase Auth signup/signin/signout and protected routes
- Admin/staff/customer role handling
- Product, plan, tax and discount management
- Quotations and quotation-to-subscription conversion
- Subscription management and customer portal
- Invoice generation from active subscriptions (manual billing run)
- Invoice status, payment recording and outstanding balance tracking
- Subscription Health Score API/UI using payment, renewal, activity,
  timeliness and stability dimensions
- Revenue, overdue and subscription reports
- Basic backend tests and seed/demo instructions

## 5. Billing behavior
This MVP generates invoices when an admin/staff member calls the billing-run
endpoint or presses **Run billing**. It does not silently run a background
scheduler. For deployment, schedule the endpoint through a trusted scheduler
or add a worker (Celery/ARQ/cron) and protect the billing-run endpoint.
The billing engine checks `next_billing_date` and avoids a duplicate invoice
for the same subscription and invoice date.

Payments are recorded manually. No live card gateway is configured.

## 6. Security notes
- The backend validates Supabase access tokens using Supabase Auth.
- The backend uses a server-side service-role key for database operations,
  so API ownership and role checks are mandatory. The included routes enforce
  these checks. Supabase RLS remains an additional defense for direct client
  queries.
- Do not expose the service-role key to React.
- Before production, add rate limiting, audit logging, email delivery,
  background billing, payment gateway integration, backups and deployment
  secrets management.
