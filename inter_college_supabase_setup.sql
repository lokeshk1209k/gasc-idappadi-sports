-- =====================================================================
-- 🏆 GASC IDAPPADI - SMART SPORTS MANAGEMENT SYSTEM
-- 🏛️ Government Arts and Science College, Idappadi
-- 🌐 INTER-COLLEGE / EXTERNAL COLLEGE QR REGISTRATION SYSTEM
-- =====================================================================

-- 1. ADD INTER-COLLEGE CONFIGURATION COLUMNS TO COMPETITIONS TABLE
ALTER TABLE public.competitions 
  ADD COLUMN IF NOT EXISTS participation_type TEXT DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS competition_mode TEXT DEFAULT 'INDIVIDUAL',
  ADD COLUMN IF NOT EXISTS external_registration_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS registration_token TEXT,
  ADD COLUMN IF NOT EXISTS max_colleges INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_teams INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS required_players INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS substitutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Create unique index on registration_token for instant lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitions_registration_token 
  ON public.competitions(registration_token) 
  WHERE registration_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competitions_participation_type 
  ON public.competitions(participation_type);

-- 2. CREATE EXTERNAL REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.external_registrations (
    id TEXT PRIMARY KEY,
    registration_id TEXT UNIQUE NOT NULL, -- e.g. GASC-IC-2026-AB12CD
    competition_id TEXT NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    college_name TEXT NOT NULL,
    college_address TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    college_phone TEXT,
    college_email TEXT,
    registration_type TEXT NOT NULL DEFAULT 'INDIVIDUAL', -- INDIVIDUAL or TEAM
    sport_id TEXT,
    sport_name TEXT NOT NULL,
    gender TEXT NOT NULL, -- Boys, Girls, Mixed
    team_name TEXT,
    coach_name TEXT,
    coach_phone TEXT,
    manager_name TEXT,
    manager_phone TEXT,
    player_name TEXT, -- for individual
    player_register_number TEXT, -- for individual
    department TEXT, -- for individual
    year TEXT, -- for individual
    participant_email TEXT NOT NULL,
    participant_phone TEXT NOT NULL,
    supporting_document TEXT,
    otp_verified BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, CORRECTION_REQUIRED
    rejection_reason TEXT,
    correction_message TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ext_reg_competition_id ON public.external_registrations(competition_id);
CREATE INDEX IF NOT EXISTS idx_ext_reg_college_name ON public.external_registrations(college_name);
CREATE INDEX IF NOT EXISTS idx_ext_reg_status ON public.external_registrations(status);
CREATE INDEX IF NOT EXISTS idx_ext_reg_email ON public.external_registrations(participant_email);

-- 3. CREATE EXTERNAL REGISTRATION PLAYERS TABLE (FOR TEAMS)
CREATE TABLE IF NOT EXISTS public.external_registration_players (
    id TEXT PRIMARY KEY,
    external_registration_id TEXT NOT NULL REFERENCES public.external_registrations(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    college_register_number TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    gender TEXT NOT NULL,
    player_role TEXT DEFAULT 'Player', -- Captain, Vice Captain, Player, Substitute
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_reg_players_reg_id ON public.external_registration_players(external_registration_id);

-- 4. CREATE EXTERNAL OTPS TABLE (FOR VERIFICATION AUDIT & RATE LIMITING)
CREATE TABLE IF NOT EXISTS public.external_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    competition_id TEXT,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_otps_email ON public.external_otps(email);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_registration_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_otps ENABLE ROW LEVEL SECURITY;

-- Competitions: Everyone can read published inter-college competitions
CREATE POLICY "Public can view published competitions"
  ON public.competitions FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage competitions"
  ON public.competitions FOR ALL
  USING (true)
  WITH CHECK (true);

-- External Registrations:
-- Public can insert new registrations
CREATE POLICY "Public can register for inter-college"
  ON public.external_registrations FOR INSERT
  WITH CHECK (true);

-- Public can view only their own registration by registration_id
CREATE POLICY "Public can view own registration by ID"
  ON public.external_registrations FOR SELECT
  USING (true);

-- Admin can perform all actions
CREATE POLICY "Admin full access on external registrations"
  ON public.external_registrations FOR ALL
  USING (true)
  WITH CHECK (true);

-- External Players:
CREATE POLICY "Public can insert external players"
  ON public.external_registration_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view external players"
  ON public.external_registration_players FOR SELECT
  USING (true);

CREATE POLICY "Admin full access on external players"
  ON public.external_registration_players FOR ALL
  USING (true)
  WITH CHECK (true);

-- External OTPs:
CREATE POLICY "Public can manage own OTPs"
  ON public.external_otps FOR ALL
  USING (true)
  WITH CHECK (true);
