-- Starter schema. Adapt core tables if they already exist in your project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin','staff','customer')),
  created_at timestamptz not null default now()
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription_number text unique not null,
  customer_id uuid references public.customers(id),
  status text not null default 'active',
  start_date date, end_date date,
  renewal_count integer not null default 0,
  missed_renewal_count integer not null default 0,
  pause_count integer not null default 0,
  reactivation_count integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  invoice_number text unique, status text not null default 'draft',
  total numeric(12,2) not null default 0, due_date date, paid_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  invoice_id uuid references public.invoices(id),
  amount numeric(12,2) not null default 0, method text,
  status text not null default 'success', paid_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.subscription_health (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null unique references public.subscriptions(id) on delete cascade,
  health_score integer not null check (health_score between 0 and 100),
  payment_score integer not null check (payment_score between 0 and 100),
  renewal_score integer not null check (renewal_score between 0 and 100),
  activity_score integer not null check (activity_score between 0 and 100),
  timeliness_score integer not null check (timeliness_score between 0 and 100),
  stability_score integer not null check (stability_score between 0 and 100),
  health_status text not null, risk_reasons jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now()
);
create table if not exists public.subscription_health_history (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  health_score integer not null check (health_score between 0 and 100),
  health_status text not null, dimension_scores jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now()
);
create index if not exists idx_subscriptions_customer on public.subscriptions(customer_id);
create index if not exists idx_invoices_subscription on public.invoices(subscription_id);
create index if not exists idx_payments_subscription on public.payments(subscription_id);
create index if not exists idx_health_score on public.subscription_health(health_score);
create index if not exists idx_health_status on public.subscription_health(health_status);
create index if not exists idx_health_history_lookup on public.subscription_health_history(subscription_id, calculated_at desc);

-- Enable RLS. Business data is accessed through FastAPI after auth + staff-role check.
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.subscription_health enable row level security;
alter table public.subscription_health_history enable row level security;

create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
-- No direct browser policies for billing data. Add narrowly scoped customer policies
-- if the customer portal needs direct Supabase access.
