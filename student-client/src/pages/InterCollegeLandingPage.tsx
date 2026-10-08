import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Calendar, MapPin, Users, ArrowRight, Sparkles,
  QrCode, Search, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CompItem {
  id: string;
  name: string;
  tournamentName: string;
  sportName: string;
  participationType: string;
  competitionMode: string;
  gender: string;
  venue: string;
  date: string;
  registrationEnd: string;
  bannerImage: string;
  status: string;
  registrationToken?: string;
  isRegistrationOpen: boolean;
}

const InterCollegeLandingPage: React.FC = () => {
  const [competitions, setCompetitions] = useState<CompItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [manualToken, setManualToken] = useState('');

  useEffect(() => {
    const fetchCompetitions = async () => {
      setLoading(true);
      try {
        // Query Supabase for all competitions with type 'Inter-College' or participation_type = 'INTER_COLLEGE'
        const { data, error } = await supabase
          .from('competitions')
          .select('*')
          .or('participation_type.eq.INTER_COLLEGE,type.eq.Inter-College')
          .order('date', { ascending: true });

        if (!error && data) {
          const mapped: CompItem[] = data.map((c: any) => {
            const deadline = c.registration_end || c.registration_deadline || c.date;
            const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;
            const isRegistrationOpen = c.external_registration_enabled !== false &&
              c.status !== 'Registration Closed' &&
              c.status !== 'Draft' &&
              !isDeadlinePassed;

            return {
              id: c.id,
              name: c.name,
              tournamentName: c.tournament_name || c.name,
              sportName: c.sport_name || c.name,
              participationType: c.participation_type || 'INTER_COLLEGE',
              competitionMode: (c.competition_mode || (c.type === 'Team' ? 'TEAM' : 'INDIVIDUAL')).toUpperCase(),
              gender: c.gender || 'All',
              venue: c.venue || 'GASC Idappadi Sports Ground',
              date: c.date,
              registrationEnd: deadline,
              bannerImage: c.banner_image || '/images/sports/tournament.png',
              status: c.status || 'Registration Open',
              registrationToken: c.registration_token || c.id,
              isRegistrationOpen
            };
          });
          setCompetitions(mapped);
        }
      } catch (e) {
        console.warn('Inter-college list fetch notice:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, []);

  const filtered = competitions.filter(c => {
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) ||
           c.sportName.toLowerCase().includes(s) ||
           c.venue.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* ── Top Header Brand ── */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center p-1.5 overflow-hidden">
              <img src="/images/college-logo.png" alt="GASC" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-400 tracking-wider uppercase">GASC IDAPPADI</div>
              <h1 className="text-sm font-extrabold text-white leading-tight">Inter-College Sports Portal</h1>
            </div>
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Official Public Portal
          </span>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div className="border-b border-slate-800 bg-gradient-to-b from-blue-950/20 to-transparent py-10 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Open to All Colleges & Universities
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            GASC Inter-College Tournaments 2026
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
            Government Arts and Science College, Idappadi invites students and sports squads across Tamil Nadu to participate in collegiate championships. Scan your official competition QR code or register below.
          </p>

          {/* Quick Token Lookup Bar */}
          <div className="mt-6 max-w-md mx-auto flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-xl">
            <QrCode className="w-5 h-5 text-blue-400 ml-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Enter Competition Token / QR code"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="bg-transparent border-0 text-white placeholder-slate-500 text-xs sm:text-sm flex-1 focus:outline-none px-2"
            />
            <Link
              to={manualToken.trim() ? `/open-registration/${manualToken.trim()}` : '#'}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                manualToken.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 pointer-events-none'
              }`}
            >
              Open
            </Link>
          </div>
        </div>
      </div>

      {/* ── Competitions List ── */}
      <main className="max-w-6xl mx-auto w-full flex-1 px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Published Inter-College Competitions
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your sport event to open the direct registration form.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sport, venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading inter-college championships...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8">
            <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-300">No Inter-College Competitions Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? 'No events match your search query.'
                : 'There are currently no published inter-college tournaments open for registration. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(comp => (
              <div
                key={comp.id}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-200 flex flex-col group"
              >
                {/* Banner Thumbnail */}
                <div className="aspect-[16/9] w-full bg-slate-950 relative overflow-hidden">
                  <img
                    src={comp.bannerImage}
                    alt={comp.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/sports/tournament.png';
                    }}
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase">
                      {comp.sportName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-amber-300 border border-amber-500/30 uppercase">
                      {comp.competitionMode}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      comp.isRegistrationOpen
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {comp.isRegistrationOpen ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                      {comp.name}
                    </h4>
                    <div className="space-y-1.5 mt-3 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Date: <strong className="text-slate-300">{new Date(comp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{comp.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Category: <strong className="text-slate-300">{comp.gender}</strong></span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/open-registration/${comp.registrationToken || comp.id}`}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      comp.isRegistrationOpen
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <span>{comp.isRegistrationOpen ? 'Register Now' : 'View Details'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <p>Government Arts and Science College, Idappadi - 637 101, Salem District, Tamil Nadu.</p>
        <p className="mt-1">Sports Department Portal • Powered by Supabase Cloud</p>
      </footer>
    </div>
  );
};

export default InterCollegeLandingPage;
