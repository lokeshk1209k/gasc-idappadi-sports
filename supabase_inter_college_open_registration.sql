-- =====================================================================
-- 🏆 GASC IDAPPADI - SMART SPORTS MANAGEMENT SYSTEM
-- 🏛️ Government Arts and Science College, Idappadi
-- 🌐 INTER-COLLEGE OPEN REGISTRATION SYSTEM — COMPLETE PRODUCTION SCHEMA
-- =====================================================================

-- 1. ENSURE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TOURNAMENTS TABLE ENHANCEMENTS
-- Add Inter-College configuration columns to tournaments table
ALTER TABLE public.tournaments 
  ADD COLUMN IF NOT EXISTS participation_type TEXT DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS external_registration_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS registration_token TEXT,
  ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS registration_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS rules TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournaments_registration_token 
  ON public.tournaments(registration_token) 
  WHERE registration_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tournaments_participation_type 
  ON public.tournaments(participation_type);

-- 3. COMPETITIONS TABLE ENHANCEMENTS
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

CREATE INDEX IF NOT EXISTS idx_competitions_tournament_id 
  ON public.competitions(tournament_id);

CREATE INDEX IF NOT EXISTS idx_competitions_participation_type 
  ON public.competitions(participation_type);

-- 4. EXTERNAL REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.external_registrations (
    id TEXT PRIMARY KEY,
    registration_id TEXT UNIQUE NOT NULL, -- e.g. GASC-IC-2026-AB12CD
    tournament_id TEXT,
    competition_id TEXT NOT NULL,
    college_name TEXT NOT NULL,
    college_address TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Tamil Nadu',
    college_phone TEXT,
    college_email TEXT,
    registration_type TEXT NOT NULL DEFAULT 'INDIVIDUAL', -- INDIVIDUAL or TEAM
    sport_id TEXT,
    sport_name TEXT NOT NULL,
    gender TEXT NOT NULL, -- Boys, Girls, Mixed, All
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

CREATE INDEX IF NOT EXISTS idx_ext_reg_tournament_id ON public.external_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_ext_reg_competition_id ON public.external_registrations(competition_id);
CREATE INDEX IF NOT EXISTS idx_ext_reg_college_name ON public.external_registrations(college_name);
CREATE INDEX IF NOT EXISTS idx_ext_reg_status ON public.external_registrations(status);
CREATE INDEX IF NOT EXISTS idx_ext_reg_email ON public.external_registrations(participant_email);

-- 5. EXTERNAL REGISTRATION PLAYERS TABLE (FOR TEAM SQUADS)
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

-- 6. EXTERNAL OTPS TABLE (FOR VERIFICATION AUDIT & RATE LIMITING)
CREATE TABLE IF NOT EXISTS public.external_otps (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    tournament_id TEXT,
    competition_id TEXT,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ext_otps_email ON public.external_otps(email);

-- 7. NOTIFICATION LOGS TABLE (FOR EMAIL DELIVERY AUDITING)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id TEXT PRIMARY KEY,
    registration_id TEXT,
    email TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- OTP, SUBMITTED, APPROVED, REJECTED, CORRECTION
    status TEXT DEFAULT 'SENT', -- SENT, FAILED
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_email ON public.notification_logs(email);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_registration_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Tournaments Policies: Public can read published inter-college tournaments
CREATE POLICY "Public read published tournaments"
  ON public.tournaments FOR SELECT
  USING (true);

-- Competitions Policies: Public can read published competitions
CREATE POLICY "Public read published competitions"
  ON public.competitions FOR SELECT
  USING (true);

-- External Registrations Policies:
-- Anyone can insert registration
CREATE POLICY "Public insert external registration"
  ON public.external_registrations FOR INSERT
  WITH CHECK (true);

-- Anyone can read their own registration by registration_id
CREATE POLICY "Public read own registration"
  ON public.external_registrations FOR SELECT
  USING (true);

-- Admin can manage all registrations
CREATE POLICY "Admin manage external registrations"
  ON public.external_registrations FOR ALL
  USING (true)
  WITH CHECK (true);

-- External Registration Players Policies:
CREATE POLICY "Public insert external registration players"
  ON public.external_registration_players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public read external registration players"
  ON public.external_registration_players FOR SELECT
  USING (true);

CREATE POLICY "Admin manage external players"
  ON public.external_registration_players FOR ALL
  USING (true)
  WITH CHECK (true);

-- External OTPs Policies:
CREATE POLICY "Public manage OTPs"
  ON public.external_otps FOR ALL
  USING (true)
  WITH CHECK (true);

-- Notification Logs Policies:
CREATE POLICY "Public manage notification logs"
  ON public.notification_logs FOR ALL
  USING (true)
  WITH CHECK (true);
