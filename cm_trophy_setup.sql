-- =====================================================================
-- 🏆 GASC IDAPPADI SMART SPORTS MANAGEMENT SYSTEM
-- CM TROPHY UPDATES & NOTIFICATIONS SCHEMA SETUP
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.cm_trophy_announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    instructions TEXT NOT NULL,
    official_link TEXT DEFAULT 'https://tncmtrophy.sdat.in/',
    registration_start_date TIMESTAMP WITH TIME ZONE,
    registration_end_date TIMESTAMP WITH TIME ZONE,
    category TEXT DEFAULT 'General',
    is_important BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Published', 'Archived'
    published_at TIMESTAMP WITH TIME ZONE,
    last_notified_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT DEFAULT 'Dr. R. ANITHA (Physical Director)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for fast retrieval and filtering
CREATE INDEX IF NOT EXISTS idx_cm_trophy_status ON public.cm_trophy_announcements(status);
CREATE INDEX IF NOT EXISTS idx_cm_trophy_important ON public.cm_trophy_announcements(is_important);
CREATE INDEX IF NOT EXISTS idx_cm_trophy_published ON public.cm_trophy_announcements(published_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cm_trophy_announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone (Students, Anonymous) can view Published announcements
DROP POLICY IF EXISTS "Public can view published CM Trophy announcements" ON public.cm_trophy_announcements;
CREATE POLICY "Public can view published CM Trophy announcements"
ON public.cm_trophy_announcements
FOR SELECT
USING (status = 'Published');

-- Policy: Authenticated Admins have full access
DROP POLICY IF EXISTS "Admins have full access to CM Trophy announcements" ON public.cm_trophy_announcements;
CREATE POLICY "Admins have full access to CM Trophy announcements"
ON public.cm_trophy_announcements
FOR ALL
USING (auth.jwt() ->> 'role' = 'admin' OR auth.role() = 'service_role');

-- Ensure notifications table has index for CM Trophy
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
