-- =====================================================================
-- 🏆 GASC IDAPPADI SMART SPORTS MANAGEMENT SYSTEM
-- 💳 SECURE PAYMENT GATEWAY INTEGRATION (RAZORPAY & CONFIGURABLE PROVIDER)
-- 🏛️ Department of Physical Education and Sports, GASC Idappadi
-- =====================================================================

-- 1. COMPETITIONS & TOURNAMENTS FEE COLUMNS
ALTER TABLE IF EXISTS public.competitions
  ADD COLUMN IF NOT EXISTS entry_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'PER_TEAM'; -- PER_TEAM, PER_PLAYER, FREE

ALTER TABLE IF EXISTS public.tournaments
  ADD COLUMN IF NOT EXISTS default_entry_fee NUMERIC DEFAULT 0;

-- 2. PAYMENTS TABLE (Primary Ledger for Gateway Orders, Transactions & Settlements)
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY DEFAULT ('pay_rec_' || replace(gen_random_uuid()::text, '-', '')),
    registration_id TEXT REFERENCES public.external_registrations(id) ON DELETE CASCADE,
    registration_code TEXT NOT NULL, -- e.g. GASC-IC-2026-AB12CD
    tournament_id TEXT,
    tournament_name TEXT,
    competition_id TEXT,
    competition_name TEXT,
    provider TEXT NOT NULL DEFAULT 'RAZORPAY', -- 'RAZORPAY', 'SIMULATED'
    provider_order_id TEXT,
    provider_payment_id TEXT,
    provider_signature TEXT,
    amount NUMERIC NOT NULL DEFAULT 0, -- Amount in INR
    amount_paise BIGINT NOT NULL DEFAULT 0, -- Amount in Paise (e.g. 50000 = ₹500)
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'ATTEMPTED', 'SUCCESS', 'FAILED', 'REFUNDED', 'DISPUTED'
    payer_name TEXT,
    payer_email TEXT,
    payer_phone TEXT,
    college_name TEXT,
    registration_type TEXT DEFAULT 'INDIVIDUAL', -- 'INDIVIDUAL' or 'TEAM'
    payment_method TEXT, -- 'upi', 'card', 'netbanking', 'wallet'
    payment_method_detail TEXT, -- e.g. 'Google Pay', 'SBI Netbanking'
    fee_breakdown JSONB,
    error_code TEXT,
    error_description TEXT,
    refund_id TEXT,
    refund_status TEXT,
    refund_amount NUMERIC DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refunded_by TEXT,
    verified_at TIMESTAMPTZ,
    raw_order_payload JSONB,
    raw_payment_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique indexes on gateway identifiers to prevent replay and double counting
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_payment_id
  ON public.payments(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL AND provider_payment_id != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_order_id
  ON public.payments(provider_order_id)
  WHERE provider_order_id IS NOT NULL AND provider_order_id != '';

CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON public.payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_registration_code ON public.payments(registration_code);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_tournament_id ON public.payments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_payments_competition_id ON public.payments(competition_id);

-- 3. PAYMENT WEBHOOK EVENTS TABLE (Idempotency and Audit for Inbound Gateway Webhooks)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id TEXT PRIMARY KEY, -- Official Webhook Event ID e.g. evt_xxxx
    event_type TEXT NOT NULL, -- e.g. payment.captured, order.paid, payment.failed, refund.processed
    provider TEXT NOT NULL DEFAULT 'RAZORPAY',
    provider_order_id TEXT,
    provider_payment_id TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT TRUE,
    processing_error TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON public.payment_webhook_events(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON public.payment_webhook_events(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON public.payment_webhook_events(received_at DESC);

-- 4. DYNAMIC PAYMENT & SETTLEMENT SETTINGS TABLE (Configurable Provider & Settlement Metadata)
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    provider TEXT NOT NULL DEFAULT 'RAZORPAY',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
    key_id TEXT, -- Public Gateway Key ID (e.g. rzp_test_...). Secret key is strictly kept in server env!
    merchant_id TEXT DEFAULT 'acc_GASC_SPORTS', -- Razorpay Merchant Account ID
    receiver_name TEXT NOT NULL DEFAULT 'Dr. R. ANITHA (Physical Director)',
    receiver_department TEXT DEFAULT 'Department of Physical Education & Sports',
    institution_name TEXT DEFAULT 'Government Arts and Science College, Idappadi',
    settlement_account_title TEXT DEFAULT 'Sports Fund Account (Authorized Representative)',
    settlement_bank_name TEXT DEFAULT 'State Bank of India',
    settlement_branch TEXT DEFAULT 'Idappadi Branch',
    settlement_status TEXT DEFAULT 'KYC_VERIFIED', -- 'KYC_VERIFIED', 'PENDING_APPROVAL', 'DOCUMENTS_REQUIRED'
    settlement_account_mask TEXT DEFAULT '••••••••4892', -- Masked account number for security
    currency TEXT NOT NULL DEFAULT 'INR',
    default_team_fee NUMERIC DEFAULT 500,
    default_individual_fee NUMERIC DEFAULT 100,
    allow_free_registration BOOLEAN DEFAULT TRUE,
    payment_instructions TEXT DEFAULT 'Pay registration fee via Razorpay using UPI (GPay, PhonePe, Paytm), Net Banking, or Debit Cards.',
    config_version INTEGER NOT NULL DEFAULT 1,
    updated_by TEXT DEFAULT 'Admin (Physical Director)',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default payment settings if table is empty
INSERT INTO public.payment_settings (
    id,
    provider,
    is_active,
    is_test_mode,
    key_id,
    merchant_id,
    receiver_name,
    receiver_department,
    institution_name,
    settlement_account_title,
    settlement_bank_name,
    settlement_branch,
    settlement_status,
    settlement_account_mask,
    currency,
    default_team_fee,
    default_individual_fee,
    allow_free_registration,
    config_version,
    updated_by
)
SELECT
    'default',
    'RAZORPAY',
    TRUE,
    TRUE,
    'rzp_test_placeholder_key',
    'acc_GASC_SPORTS',
    'Dr. R. ANITHA (Physical Director)',
    'Department of Physical Education & Sports',
    'Government Arts and Science College, Idappadi',
    'Sports Fund Account (Authorized Representative)',
    'State Bank of India',
    'Idappadi Branch',
    'KYC_VERIFIED',
    '••••••••4892',
    'INR',
    500,
    100,
    TRUE,
    1,
    'System Setup'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings WHERE id = 'default');

-- 5. PAYMENT SETTINGS AUDIT HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.payment_settings_history (
    id TEXT PRIMARY KEY DEFAULT ('psh_' || replace(gen_random_uuid()::text, '-', '')),
    setting_id TEXT NOT NULL DEFAULT 'default',
    config_version INTEGER NOT NULL,
    provider TEXT NOT NULL DEFAULT 'RAZORPAY',
    is_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
    receiver_name TEXT NOT NULL,
    merchant_id TEXT,
    settlement_status TEXT,
    settlement_account_mask TEXT,
    default_team_fee NUMERIC,
    default_individual_fee NUMERIC,
    change_summary TEXT,
    changed_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_settings_history_setting_id 
  ON public.payment_settings_history(setting_id, created_at DESC);

-- 6. ADD PAYMENT REFERENCE COLUMNS TO EXTERNAL REGISTRATIONS
ALTER TABLE IF EXISTS public.external_registrations
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'RAZORPAY',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING_PAYMENT', -- 'PENDING_PAYMENT', 'PAID', 'FREE', 'REFUNDED', 'FAILED'
  ADD COLUMN IF NOT EXISTS payment_id TEXT, -- Razorpay Payment ID pay_xxx
  ADD COLUMN IF NOT EXISTS order_id TEXT, -- Razorpay Order ID order_xxx
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS payment_remarks TEXT;

CREATE INDEX IF NOT EXISTS idx_ext_reg_payment_status 
  ON public.external_registrations(payment_status);

CREATE INDEX IF NOT EXISTS idx_ext_reg_order_id
  ON public.external_registrations(order_id);

CREATE INDEX IF NOT EXISTS idx_ext_reg_payment_id
  ON public.external_registrations(payment_id);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings_history ENABLE ROW LEVEL SECURITY;

-- Payments table policies:
-- Public can read payment record if referencing their registration
DROP POLICY IF EXISTS "Public can view payment by registration" ON public.payments;
CREATE POLICY "Public can view payment by registration"
ON public.payments
FOR SELECT
USING (true);

-- Admins and Service Role have full control
DROP POLICY IF EXISTS "Admins have full access to payments" ON public.payments;
CREATE POLICY "Admins have full access to payments"
ON public.payments
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- Webhook events table policies: Admins and Service Role only
DROP POLICY IF EXISTS "Admins have full access to webhook events" ON public.payment_webhook_events;
CREATE POLICY "Admins have full access to webhook events"
ON public.payment_webhook_events
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- Payment settings table policies: Public can read active settings, only admin can update
DROP POLICY IF EXISTS "Public can view active payment settings" ON public.payment_settings;
CREATE POLICY "Public can view active payment settings"
ON public.payment_settings
FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins have full access to payment settings" ON public.payment_settings;
CREATE POLICY "Admins have full access to payment settings"
ON public.payment_settings
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- History table: Admin only
DROP POLICY IF EXISTS "Admins have access to payment history" ON public.payment_settings_history;
CREATE POLICY "Admins have access to payment history"
ON public.payment_settings_history
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');
