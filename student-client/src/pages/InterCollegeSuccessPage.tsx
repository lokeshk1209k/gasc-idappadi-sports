import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle2, Printer, Download, Trophy, Calendar, MapPin, Building,
  User, Shield, Mail, Phone, ArrowLeft, Share2, Copy, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RegistrationDetail {
  id: string;
  registration_id?: string;
  registrationId?: string;
  college_name?: string;
  collegeName?: string;
  team_name?: string;
  teamName?: string;
  player_name?: string;
  playerName?: string;
  player_register_number?: string;
  playerRegisterNumber?: string;
  sport_name?: string;
  sportName?: string;
  gender?: string;
  registration_type?: string;
  registrationType?: string;
  participant_email?: string;
  participantEmail?: string;
  participant_phone?: string;
  participantPhone?: string;
  status: string;
  created_at?: string;
  createdAt?: string;
}

const InterCollegeSuccessPage: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [registration, setRegistration] = useState<RegistrationDetail | null>(null);
  const [competition, setCompetition] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    // If state was passed via navigate, use it immediately
    if (location.state?.registration) {
      setRegistration(location.state.registration);
      if (location.state?.competition) {
        setCompetition(location.state.competition);
      }
      setLoading(false);
      return;
    }

    // Otherwise fetch from API / Supabase
    const fetchReceipt = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/inter-college/receipt/${registrationId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.registration) {
            setRegistration(json.registration);
            setPlayers(json.players || []);
            setCompetition(json.competition);
            setLoading(false);
            return;
          }
        }
      } catch (e) {}

      // Supabase direct query
      try {
        const { data: reg } = await supabase
          .from('external_registrations')
          .select('*')
          .or(`registration_id.eq.${registrationId},id.eq.${registrationId}`)
          .maybeSingle();

        if (reg) {
          setRegistration(reg);

          // Get players
          const { data: pList } = await supabase
            .from('external_registration_players')
            .select('*')
            .eq('external_registration_id', reg.id);
          if (pList) setPlayers(pList);

          // Get competition
          const { data: comp } = await supabase
            .from('competitions')
            .select('*')
            .eq('id', reg.competition_id)
            .maybeSingle();
          if (comp) setCompetition(comp);
        }
      } catch (e) {}

      setLoading(false);
    };

    if (registrationId) {
      fetchReceipt();
    }
  }, [registrationId, location.state]);

  const regCode = registration?.registration_id || registration?.registrationId || registrationId || 'GASC-IC-2026-UNKNOWN';
  const cName = registration?.college_name || registration?.collegeName || 'Participant College';
  const participant = registration?.team_name || registration?.teamName || registration?.player_name || registration?.playerName || 'Participant';
  const sport = registration?.sport_name || registration?.sportName || competition?.name || 'Sports Meet';
  const status = registration?.status || 'PENDING';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(regCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020817] text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-slate-300">Retrieving official receipt...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 selection:bg-blue-600 selection:text-white print:bg-white print:text-black print:p-0">
      
      {/* ── Screen Header (Hidden on Print) ── */}
      <div className="max-w-2xl mx-auto w-full mb-6 print:hidden flex items-center justify-between">
        <Link
          to="/inter-college"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All Competitions
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyToClipboard}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy ID'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Printable Official Certificate Receipt ── */}
      <div className="max-w-2xl mx-auto w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-2xl print:border-2 print:border-black print:shadow-none print:rounded-none print:p-6 print:bg-white print:text-black">
        
        {/* Success Icon & Notice (Hidden on print or subtle) */}
        <div className="text-center mb-6 print:hidden">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
            Verification Complete
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">REGISTRATION SUCCESSFUL</h1>
          <p className="text-xs text-slate-400 mt-1">
            Your entry has been recorded in the GASC Sports Portal database.
          </p>
        </div>

        {/* ── Official Institutional Header ── */}
        <div className="border-b-2 border-slate-800 print:border-black pb-6 mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full border border-slate-700 print:border-black flex items-center justify-center p-1 bg-white">
              <img src="/images/college-logo.png" alt="GASC" className="w-full h-full object-contain" />
            </div>
            <div className="text-left">
              <h2 className="text-sm sm:text-base font-extrabold uppercase text-white print:text-black leading-tight">
                Government Arts and Science College
              </h2>
              <p className="text-[11px] text-slate-400 print:text-gray-700">
                Idappadi - 637 101, Salem District, Tamil Nadu
              </p>
            </div>
          </div>
          <p className="text-xs font-bold text-blue-400 print:text-black uppercase tracking-wider mt-2">
            Department of Physical Education & Sports • Inter-College Championship
          </p>
        </div>

        {/* ── Big Registration ID Pill ── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-950/40 border border-blue-500/30 print:border print:border-black print:bg-gray-100 text-center mb-6">
          <span className="text-[10px] font-extrabold text-blue-400 print:text-gray-800 uppercase tracking-widest block mb-1">
            Official Registration ID
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white print:text-black tracking-wider">
            {regCode}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 print:text-black print:border print:border-black">
            Status: {status} VERIFICATION
          </div>
        </div>

        {/* ── Details Grid ── */}
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/60 print:bg-white print:border print:border-gray-300">
            <div>
              <span className="text-slate-400 print:text-gray-600 block text-[11px] uppercase font-semibold">Competition</span>
              <strong className="text-white print:text-black text-sm">{competition?.name || sport}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-600 block text-[11px] uppercase font-semibold">Sport & Category</span>
              <strong className="text-white print:text-black text-sm">{sport} ({registration?.gender || competition?.gender || 'Boys'})</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 print:bg-white print:border print:border-gray-300 space-y-2.5">
            <div className="flex justify-between border-b border-slate-800 print:border-gray-200 pb-2">
              <span className="text-slate-400 print:text-gray-600">College Name:</span>
              <strong className="text-white print:text-black text-right">{cName}</strong>
            </div>

            <div className="flex justify-between border-b border-slate-800 print:border-gray-200 pb-2">
              <span className="text-slate-400 print:text-gray-600">
                {registration?.registration_type === 'TEAM' ? 'Team Name:' : 'Player Name:'}
              </span>
              <strong className="text-white print:text-black text-right">{participant}</strong>
            </div>

            {registration?.player_register_number && (
              <div className="flex justify-between border-b border-slate-800 print:border-gray-200 pb-2">
                <span className="text-slate-400 print:text-gray-600">Register / Roll No:</span>
                <span className="font-mono font-bold text-blue-400 print:text-black">{registration.player_register_number}</span>
              </div>
            )}

            {competition?.venue && (
              <div className="flex justify-between border-b border-slate-800 print:border-gray-200 pb-2">
                <span className="text-slate-400 print:text-gray-600">Venue:</span>
                <span className="text-slate-200 print:text-black text-right">{competition.venue}</span>
              </div>
            )}

            {competition?.date && (
              <div className="flex justify-between border-b border-slate-800 print:border-gray-200 pb-2">
                <span className="text-slate-400 print:text-gray-600">Competition Date:</span>
                <span className="text-slate-200 print:text-black">
                  {new Date(competition.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-slate-400 print:text-gray-600">Registered Email:</span>
              <span className="text-slate-300 print:text-black">{registration?.participant_email || registration?.participantEmail || 'Verified'}</span>
            </div>
          </div>

          {/* Players Roster if available */}
          {players.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/60 print:bg-white print:border print:border-gray-300">
              <h4 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2">
                Registered Squad Roster ({players.length} Players)
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto print:max-h-none text-xs">
                {players.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/60 print:border-gray-200 last:border-0">
                    <span className="text-slate-300 print:text-black font-medium">
                      {idx + 1}. {p.player_name || p.playerName} ({p.player_role || p.role || 'Player'})
                    </span>
                    <span className="font-mono text-[11px] text-blue-400 print:text-black">
                      {p.college_register_number || p.registerNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Official Instructions & Footer ── */}
        <div className="mt-6 pt-4 border-t border-slate-800 print:border-black text-[11px] text-slate-400 print:text-gray-700 space-y-1.5">
          <p>• <strong>Important:</strong> External participants do not have login passwords or account credentials. This Registration ID is your sole reference number.</p>
          <p>• All participants must produce original college student ID cards and bonafide certification signed by the College Principal at the reporting desk.</p>
          <p>• Match fixtures, court schedules, and report timings will be communicated via official email.</p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 print:border-black flex justify-between items-end text-[10px] text-slate-500 print:text-gray-600">
          <div>
            <div>System Generated Slip • GASC Sports Management System</div>
            <div>Timestamp: {new Date().toLocaleString('en-IN')}</div>
          </div>
          <div className="text-right">
            <div className="font-bold print:text-black">Sports Incharge / Physical Director</div>
            <div>GASC Idappadi - 637 101</div>
          </div>
        </div>
      </div>

      {/* ── Print Screen Actions (Hidden on print) ── */}
      <div className="max-w-2xl mx-auto w-full mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Download / Print Official Slip
        </button>
        <Link
          to="/inter-college"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Trophy className="w-4 h-4" /> Back to Competitions
        </Link>
      </div>

    </div>
  );
};

export default InterCollegeSuccessPage;
