-- =====================================================================
-- 🏆 GASC IDAPPADI SMART SPORTS MANAGEMENT SYSTEM
-- 💳 DYNAMIC GPAY NUMBER, UPI ID & PAYMENT SETTINGS SCHEMA
-- =====================================================================

-- 1. ADD FEE CONFIGURATION COLUMNS TO COMPETITIONS AND TOURNAMENTS
ALTER TABLE IF EXISTS public.competitions
  ADD COLUMN IF NOT EXISTS entry_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'PER_TEAM'; -- PER_TEAM, PER_PLAYER, FREE

ALTER TABLE IF EXISTS public.tournaments
  ADD COLUMN IF NOT EXISTS default_entry_fee NUMERIC DEFAULT 0;

-- 2. CREATE PAYMENT SETTINGS TABLE (Stores Current & Historical Payment Configurations)
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    receiver_name TEXT NOT NULL DEFAULT 'Dr. R. ANITHA (Physical Director)',
    gpay_number TEXT NOT NULL DEFAULT '9443567890',
    upi_id TEXT NOT NULL DEFAULT 'gasc.sports@oksbi',
    qr_image_url TEXT,
    payment_instructions TEXT DEFAULT 'Scan the QR code or pay using GPay / any UPI app. Enter the 12-digit UPI Reference / UTR Number accurately.',
    payment_mode TEXT NOT NULL DEFAULT 'MANUAL_UPI', -- MANUAL_UPI, GATEWAY, BOTH, DISABLED
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    version INTEGER NOT NULL DEFAULT 1,
    updated_by TEXT DEFAULT 'Admin (Physical Director)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for instant active config lookup
CREATE INDEX IF NOT EXISTS idx_payment_settings_active 
  ON public.payment_settings(is_active, is_enabled);

-- 3. CREATE PAYMENT SETTINGS HISTORY TABLE (Audit Trail)
CREATE TABLE IF NOT EXISTS public.payment_settings_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    setting_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    receiver_name TEXT NOT NULL,
    gpay_number TEXT NOT NULL,
    upi_id TEXT NOT NULL,
    qr_image_url TEXT,
    payment_mode TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    change_summary TEXT,
    changed_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_settings_history_setting_id 
  ON public.payment_settings_history(setting_id, created_at DESC);

-- 4. ADD PAYMENT & VERIFICATION COLUMNS TO EXTERNAL REGISTRATIONS
ALTER TABLE IF EXISTS public.external_registrations
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'MANUAL_UPI', -- MANUAL_UPI, GATEWAY, FREE
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING_VERIFICATION', -- PENDING_VERIFICATION, PAID, REJECTED, EXEMPTED, FREE
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT, -- 12-digit UPI UTR number
  ADD COLUMN IF NOT EXISTS payment_screenshot TEXT, -- Base64 data or receipt image URL
  ADD COLUMN IF NOT EXISTS payment_config_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_config_receiver TEXT,
  ADD COLUMN IF NOT EXISTS payment_config_upi_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_verified_by TEXT,
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_remarks TEXT;

-- Create Unique Index on transaction_ref to prevent duplicate reuse across registrations
CREATE UNIQUE INDEX IF NOT EXISTS idx_ext_reg_transaction_ref 
  ON public.external_registrations(transaction_ref) 
  WHERE transaction_ref IS NOT NULL AND transaction_ref != '' AND transaction_ref != 'FREE' AND transaction_ref != 'EXEMPT';

CREATE INDEX IF NOT EXISTS idx_ext_reg_payment_status 
  ON public.external_registrations(payment_status);

-- 5. SEED DEFAULT INITIAL PAYMENT CONFIGURATION (IF NONE EXISTS)
INSERT INTO public.payment_settings (
    id,
    receiver_name,
    gpay_number,
    upi_id,
    qr_image_url,
    payment_instructions,
    payment_mode,
    is_enabled,
    is_active,
    version,
    updated_by
)
SELECT 
    'pay_config_default_primary',
    'Dr. R. ANITHA (Physical Director)',
    '9443567890',
    'gasc.sports@oksbi',
    NULL,
    'Pay the tournament registration fee using Google Pay, PhonePe, Paytm, or any UPI app. After successful payment, enter the 12-digit UPI Transaction / UTR number.',
    'MANUAL_UPI',
    TRUE,
    TRUE,
    1,
    'System Setup'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings WHERE is_active = TRUE);

-- Initial audit log record
INSERT INTO public.payment_settings_history (
    setting_id,
    version,
    receiver_name,
    gpay_number,
    upi_id,
    qr_image_url,
    payment_mode,
    is_enabled,
    change_summary,
    changed_by
)
SELECT
    'pay_config_default_primary',
    1,
    'Dr. R. ANITHA (Physical Director)',
    '9443567890',
    'gasc.sports@oksbi',
    NULL,
    'MANUAL_UPI',
    TRUE,
    'Initial payment configuration created',
    'System Setup'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings_history);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings_history ENABLE ROW LEVEL SECURITY;

-- Public (Anonymous / Students) can read active & enabled payment details only
DROP POLICY IF EXISTS "Public can view active payment settings" ON public.payment_settings;
CREATE POLICY "Public can view active payment settings"
ON public.payment_settings
FOR SELECT
USING (is_active = TRUE);

-- Admins & Service Role have full access to payment_settings
DROP POLICY IF EXISTS "Admins have full access to payment settings" ON public.payment_settings;
CREATE POLICY "Admins have full access to payment settings"
ON public.payment_settings
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- Admins & Service Role only have access to payment_settings_history (Students cannot see audit logs)
DROP POLICY IF EXISTS "Admins have access to payment history" ON public.payment_settings_history;
CREATE POLICY "Admins have access to payment history"
ON public.payment_settings_history
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');
