-- =====================================================================
-- 🏆 GASC IDAPPADI SMART SPORTS MANAGEMENT SYSTEM
-- 💳 SEPARATE REGISTRATION FEES (OUR COLLEGE vs OTHER COLLEGE)
-- 📱 PER-TOURNAMENT GPAY & UPI RECEIVER SETTINGS
-- 🏛️ Department of Physical Education and Sports, GASC Idappadi
-- =====================================================================

-- 1. ADD SEPARATE FEE & PAYMENT COLUMNS TO COMPETITIONS TABLE
ALTER TABLE IF EXISTS public.competitions
  ADD COLUMN IF NOT EXISTS entry_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS our_college_fee_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS our_college_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_college_fee_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS other_college_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS gpay_number TEXT,
  ADD COLUMN IF NOT EXISTS receiver_name TEXT;

-- 2. ADD SEPARATE FEE & PAYMENT COLUMNS TO TOURNAMENTS TABLE
ALTER TABLE IF EXISTS public.tournaments
  ADD COLUMN IF NOT EXISTS entry_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS our_college_fee_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS our_college_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_college_fee_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS other_college_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS gpay_number TEXT,
  ADD COLUMN IF NOT EXISTS receiver_name TEXT;

-- 3. ENSURE STUDENT CATEGORY AND PAYMENT COLUMNS ON INTERNAL REGISTRATIONS
ALTER TABLE IF EXISTS public.competition_registrations
  ADD COLUMN IF NOT EXISTS student_category TEXT DEFAULT 'OUR_COLLEGE',
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS order_id TEXT;

ALTER TABLE IF EXISTS public.registrations
  ADD COLUMN IF NOT EXISTS student_category TEXT DEFAULT 'OUR_COLLEGE',
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS order_id TEXT;

-- 4. ENSURE STUDENT CATEGORY ON EXTERNAL REGISTRATIONS
ALTER TABLE IF EXISTS public.external_registrations
  ADD COLUMN IF NOT EXISTS student_category TEXT DEFAULT 'OTHER_COLLEGE';

-- 5. UPDATE EXISTING RECORDS TO SENSIBLE DEFAULTS SAFELY
UPDATE public.competitions
SET
  our_college_fee_enabled = COALESCE(our_college_fee_enabled, FALSE),
  our_college_fee = COALESCE(our_college_fee, 0),
  other_college_fee_enabled = COALESCE(other_college_fee_enabled, FALSE),
  other_college_fee = COALESCE(other_college_fee, 0)
WHERE our_college_fee IS NULL OR other_college_fee IS NULL;

UPDATE public.tournaments
SET
  our_college_fee_enabled = COALESCE(our_college_fee_enabled, FALSE),
  our_college_fee = COALESCE(our_college_fee, 0),
  other_college_fee_enabled = COALESCE(other_college_fee_enabled, FALSE),
  other_college_fee = COALESCE(other_college_fee, 0)
WHERE our_college_fee IS NULL OR other_college_fee IS NULL;
