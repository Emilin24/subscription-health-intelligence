-- Brightloop Subscription Management System
-- ADDITIVE MIGRATION for the EXISTING Subscription Health project.
-- Preserves existing tables and records. Run once in Supabase SQL Editor.
-- Review the notes at the end before creating admin/staff accounts.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. EXTEND EXISTING TABLES WITHOUT DROPPING THEIR DATA
-- ---------------------------------------------------------------------

-- Customers: retain the existing required "name" column.
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS contact_name TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS billing_address TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.customers
SET company_name = COALESCE(company_name, name),
    contact_name = COALESCE(contact_name, name)
WHERE company_name IS NULL OR contact_name IS NULL;

-- Profiles: link a signed-in customer to their customer record.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Match existing profiles to customers by email when possible.
UPDATE public.profiles p
SET customer_id = c.id
FROM auth.users u
JOIN public.customers c ON LOWER(c.email) = LOWER(u.email)
WHERE p.id = u.id
  AND p.customer_id IS NULL
  AND u.email IS NOT NULL;

-- Add a unique constraint only if one does not already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'profiles_customer_id_key'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_customer_id_key UNIQUE (customer_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND conname = 'profiles_customer_id_fkey'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES public.customers(id)
        ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

-- Subscriptions: keep existing end_date and counters.
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS plan_id UUID,
    ADD COLUMN IF NOT EXISTS expiry_date DATE,
    ADD COLUMN IF NOT EXISTS payment_terms TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.subscriptions
SET expiry_date = end_date
WHERE expiry_date IS NULL AND end_date IS NOT NULL;

-- Invoices: keep existing total/status/paid_at fields.
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS customer_id UUID,
    ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) DEFAULT 0;

UPDATE public.invoices i
SET customer_id = s.customer_id
FROM public.subscriptions s
WHERE i.subscription_id = s.id
  AND i.customer_id IS NULL;

UPDATE public.invoices
SET subtotal = COALESCE(subtotal, total),
    amount_paid = CASE WHEN status = 'paid' THEN COALESCE(total, 0) ELSE COALESCE(amount_paid, 0) END,
    balance_due = CASE WHEN status = 'paid' THEN 0 ELSE GREATEST(COALESCE(total, 0) - COALESCE(amount_paid, 0), 0) END
WHERE subtotal IS NULL OR amount_paid IS NULL OR balance_due IS NULL;

-- Payments: preserve existing method and paid_at columns.
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS customer_id UUID,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE public.payments p
SET customer_id = s.customer_id
FROM public.subscriptions s
WHERE p.subscription_id = s.id
  AND p.customer_id IS NULL;

UPDATE public.payments
SET payment_method = COALESCE(payment_method, method),
    payment_date = COALESCE(payment_date, paid_at, created_at)
WHERE payment_method IS NULL OR payment_date IS NULL;

-- ---------------------------------------------------------------------
-- 2. CREATE NEW CATALOGUE AND COMMERCIAL TABLES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    product_type VARCHAR(50) NOT NULL DEFAULT 'subscription',
    sales_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sales_price >= 0),
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_name VARCHAR(150) NOT NULL,
    additional_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (additional_price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, variant_name)
);

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    billing_interval VARCHAR(20) NOT NULL
        CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    minimum_quantity INTEGER NOT NULL DEFAULT 1 CHECK (minimum_quantity >= 1),
    available_from DATE,
    available_until DATE,
    auto_close BOOLEAN NOT NULL DEFAULT FALSE,
    allow_early_close BOOLEAN NOT NULL DEFAULT TRUE,
    allow_pause BOOLEAN NOT NULL DEFAULT TRUE,
    allow_renewal BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from)
);

CREATE TABLE IF NOT EXISTS public.taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    tax_rate NUMERIC(5,2) NOT NULL CHECK (tax_rate BETWEEN 0 AND 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value >= 0),
    minimum_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
    minimum_quantity INTEGER NOT NULL DEFAULT 1,
    start_date DATE,
    end_date DATE,
    usage_limit INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0,
    applies_to VARCHAR(30) NOT NULL DEFAULT 'subscription'
        CHECK (applies_to IN ('product', 'subscription')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discount_products (
    discount_id UUID NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_id, product_id)
);

-- ---------------------------------------------------------------------
-- 3. QUOTATIONS AND LINE ITEMS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'quotation', 'confirmed', 'expired', 'cancelled')),
    valid_until DATE,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_id UUID REFERENCES public.taxes(id) ON DELETE SET NULL,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Add plan foreign key after plans table exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.subscriptions'::regclass
          AND conname = 'subscriptions_plan_id_fkey'
    ) THEN
        ALTER TABLE public.subscriptions
        ADD CONSTRAINT subscriptions_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES public.plans(id)
        ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS quotation_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.subscriptions'::regclass
          AND conname = 'subscriptions_quotation_id_fkey'
    ) THEN
        ALTER TABLE public.subscriptions
        ADD CONSTRAINT subscriptions_quotation_id_fkey
        FOREIGN KEY (quotation_id) REFERENCES public.quotations(id)
        ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_id UUID REFERENCES public.taxes(id) ON DELETE SET NULL,
    discount_id UUID REFERENCES public.discounts(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- 4. INVOICE LINE ITEMS AND CUSTOMER REQUESTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.subscription_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    request_type VARCHAR(30) NOT NULL
        CHECK (request_type IN ('pause', 'cancel', 'renew', 'reactivate')),
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- 5. INDEXES
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON public.profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON public.subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON public.subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_health_status ON public.subscription_health(health_status);
CREATE INDEX IF NOT EXISTS idx_health_history_subscription ON public.subscription_health_history(subscription_id);

-- ---------------------------------------------------------------------
-- 6. ROLE HELPER FUNCTIONS
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.role FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.customer_id FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(public.current_user_role() = 'admin', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(public.current_user_role() IN ('admin', 'staff'), FALSE);
$$;

-- ---------------------------------------------------------------------
-- 7. SAFE SIGNUP TRIGGER
-- Existing users/profiles are not overwritten. New public signups get
-- customer role only. Existing auth triggers are left untouched.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.brightloop_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_customer_id UUID;
    customer_name TEXT;
BEGIN
    customer_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data ->> 'company_name', ''),
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
        'New Customer'
    );

    INSERT INTO public.customers(name, email, company_name, contact_name)
    VALUES (
        customer_name,
        NEW.email,
        customer_name,
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', '')
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_customer_id;

    IF new_customer_id IS NULL AND NEW.email IS NOT NULL THEN
        SELECT c.id INTO new_customer_id
        FROM public.customers c
        WHERE LOWER(c.email) = LOWER(NEW.email)
        LIMIT 1;
    END IF;

    INSERT INTO public.profiles(id, full_name, role, customer_id)
    VALUES (
        NEW.id,
        NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
        'customer',
        new_customer_id
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brightloop_on_auth_user_created ON auth.users;
CREATE TRIGGER brightloop_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.brightloop_handle_new_user();

-- ---------------------------------------------------------------------
-- 8. UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.brightloop_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brightloop_customers_updated_at ON public.customers;
CREATE TRIGGER brightloop_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.brightloop_set_updated_at();

DROP TRIGGER IF EXISTS brightloop_products_updated_at ON public.products;
CREATE TRIGGER brightloop_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.brightloop_set_updated_at();

DROP TRIGGER IF EXISTS brightloop_plans_updated_at ON public.plans;
CREATE TRIGGER brightloop_plans_updated_at BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.brightloop_set_updated_at();

DROP TRIGGER IF EXISTS brightloop_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER brightloop_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.brightloop_set_updated_at();

DROP TRIGGER IF EXISTS brightloop_quotations_updated_at ON public.quotations;
CREATE TRIGGER brightloop_quotations_updated_at BEFORE UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.brightloop_set_updated_at();

-- ---------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_health_history ENABLE ROW LEVEL SECURITY;

-- Drop only this migration's policy names, making this section rerunnable.
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND policyname LIKE 'brightloop_%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Profiles: users can read their own profile; only admins can manage roles.
CREATE POLICY brightloop_profiles_read ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY brightloop_profiles_admin_manage ON public.profiles
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Customers
CREATE POLICY brightloop_customers_read ON public.customers
FOR SELECT TO authenticated
USING (id = public.current_customer_id() OR public.is_staff_or_admin());

CREATE POLICY brightloop_customers_staff_manage ON public.customers
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- Catalogue
CREATE POLICY brightloop_products_read ON public.products
FOR SELECT TO authenticated
USING (is_active OR public.is_staff_or_admin());

CREATE POLICY brightloop_products_admin_manage ON public.products
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY brightloop_variants_read ON public.product_variants
FOR SELECT TO authenticated
USING (is_active OR public.is_staff_or_admin());

CREATE POLICY brightloop_variants_admin_manage ON public.product_variants
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY brightloop_plans_read ON public.plans
FOR SELECT TO authenticated
USING (is_active OR public.is_staff_or_admin());

CREATE POLICY brightloop_plans_admin_manage ON public.plans
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Taxes and discounts are internal configuration.
CREATE POLICY brightloop_taxes_staff_read ON public.taxes
FOR SELECT TO authenticated USING (public.is_staff_or_admin());

CREATE POLICY brightloop_taxes_admin_manage ON public.taxes
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY brightloop_discounts_staff_read ON public.discounts
FOR SELECT TO authenticated USING (public.is_staff_or_admin());

CREATE POLICY brightloop_discounts_admin_manage ON public.discounts
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY brightloop_discount_products_staff_read ON public.discount_products
FOR SELECT TO authenticated USING (public.is_staff_or_admin());

CREATE POLICY brightloop_discount_products_admin_manage ON public.discount_products
FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Quotations
CREATE POLICY brightloop_quotations_read ON public.quotations
FOR SELECT TO authenticated
USING (customer_id = public.current_customer_id() OR public.is_staff_or_admin());

CREATE POLICY brightloop_quotations_staff_manage ON public.quotations
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE POLICY brightloop_quotation_items_read ON public.quotation_items
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.quotations q
    WHERE q.id = quotation_id
      AND (q.customer_id = public.current_customer_id() OR public.is_staff_or_admin())
));

CREATE POLICY brightloop_quotation_items_staff_manage ON public.quotation_items
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- Subscriptions
CREATE POLICY brightloop_subscriptions_read ON public.subscriptions
FOR SELECT TO authenticated
USING (customer_id = public.current_customer_id() OR public.is_staff_or_admin());

CREATE POLICY brightloop_subscriptions_staff_manage ON public.subscriptions
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE POLICY brightloop_subscription_items_read ON public.subscription_items
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_id
      AND (s.customer_id = public.current_customer_id() OR public.is_staff_or_admin())
));

CREATE POLICY brightloop_subscription_items_staff_manage ON public.subscription_items
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- Invoices and payments
CREATE POLICY brightloop_invoices_read ON public.invoices
FOR SELECT TO authenticated
USING (customer_id = public.current_customer_id() OR public.is_staff_or_admin());

CREATE POLICY brightloop_invoices_staff_manage ON public.invoices
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE POLICY brightloop_invoice_items_read ON public.invoice_items
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
      AND (i.customer_id = public.current_customer_id() OR public.is_staff_or_admin())
));

CREATE POLICY brightloop_invoice_items_staff_manage ON public.invoice_items
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE POLICY brightloop_payments_read ON public.payments
FOR SELECT TO authenticated
USING (customer_id = public.current_customer_id() OR public.is_staff_or_admin());

CREATE POLICY brightloop_payments_staff_manage ON public.payments
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- Customer-initiated requests; staff reviews them.
CREATE POLICY brightloop_change_requests_read ON public.subscription_change_requests
FOR SELECT TO authenticated
USING (customer_id = public.current_customer_id() OR public.is_staff_or_admin());

CREATE POLICY brightloop_change_requests_customer_insert ON public.subscription_change_requests
FOR INSERT TO authenticated
WITH CHECK (
    customer_id = public.current_customer_id()
    AND EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.id = subscription_id AND s.customer_id = public.current_customer_id()
    )
);

CREATE POLICY brightloop_change_requests_staff_update ON public.subscription_change_requests
FOR UPDATE TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- Health scores remain available to the subscription owner and internal team.
CREATE POLICY brightloop_health_read ON public.subscription_health
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_id
      AND (s.customer_id = public.current_customer_id() OR public.is_staff_or_admin())
));

CREATE POLICY brightloop_health_staff_manage ON public.subscription_health
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

CREATE POLICY brightloop_health_history_read ON public.subscription_health_history
FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_id
      AND (s.customer_id = public.current_customer_id() OR public.is_staff_or_admin())
));

CREATE POLICY brightloop_health_history_staff_manage ON public.subscription_health_history
FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;

-- ---------------------------------------------------------------------
-- POST-MIGRATION CHECKS
-- ---------------------------------------------------------------------
-- 1) Check all tables/columns after successful execution.
-- 2) Check profile-to-customer links. Existing accounts without a matching
--    customers.email need manual linking.
-- 3) Existing admin/staff role values are retained. New signups get customer.
-- 4) The current health API may need small column-name adjustments:
--    old invoices.total remains; old payments.method/paid_at remain;
--    subscriptions.end_date remains. Do not remove these legacy columns.
-- 5) Customer-facing inserts/updates should be performed through the backend
--    after validating ownership; never expose the service-role key in React.
