import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Calendar, Dumbbell, ArrowRight, Clock,
  MapPin, ChevronRight, ChevronLeft, Zap, Users,
  Award, Megaphone, Flame, Settings, User, CheckCircle2,
  Sparkles, ExternalLink, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ── Hero Slides Data ─────────────────────────────────────────────────────────
const HERO_SLIDES = [
  {
    badge: 'GASC SPORTS',
    titleLine1: 'YOUR SPORTS JOURNEY',
    titleLine2: 'STARTS HERE',
    subtitle: 'Compete • Connect • Achieve',
    sideTagline: ['Stronger', 'Faster', 'Together'],
    ctaText: 'Explore Tournaments',
    ctaLink: '/student/tournaments',
    image: '/images/hero-banner.jpg',
  },
  {
    badge: 'INTER-COLLEGE CHAMPIONSHIP',
    titleLine1: 'CHAMPIONS ARE MADE',
    titleLine2: 'ON THIS FIELD',
    subtitle: 'Represent GASC Idappadi • Aim For Gold',
    sideTagline: ['Dedication', 'Teamwork', 'Victory'],
    ctaText: 'Register Now',
    ctaLink: '/student/tournaments',
    image: '/images/login-hero.jpg',
  },
  {
    badge: 'EQUIPMENT & GEAR',
    titleLine1: 'GEAR UP FOR',
    titleLine2: 'PEAK PERFORMANCE',
    subtitle: 'High-Quality Sports Equipment Available',
    sideTagline: ['Train Hard', 'Play Fair', 'Rise Up'],
    ctaText: 'Check Equipment',
    ctaLink: '/student/equipment',
    image: '/images/hero-banner.jpg',
  },
  {
    badge: 'COLLEGE SPORTS FEST 2026',
    titleLine1: 'CELEBRATE ATHLETIC',
    titleLine2: 'EXCELLENCE TOGETHER',
    subtitle: '20+ Sports Disciplines • 50+ Medals',
    sideTagline: ['Courage', 'Passion', 'Glory'],
    ctaText: 'View Sports',
    ctaLink: '/student/sports',
    image: '/images/login-hero.jpg',
  }
];

// ── Static/Fallback Data matching reference image ────────────────────────────
const DEFAULT_TOURNAMENTS = [
  {
    id: 'spark-2026',
    name: 'SPARK 2026',
    sport: 'Cricket',
    date: 'Jan 15 - Jan 20, 2026',
    venue: 'College Ground, Idappadi',
    status: 'Registration Open',
    badgeColor: 'emerald',
    image: '/images/sports/cricket.jpg'
  },
  {
    id: 'annual-meet-2026',
    name: 'Annual Sports Meet 2026',
    sport: 'Basketball | Boys',
    date: 'Feb 10 - Feb 15, 2026',
    venue: 'College Ground, Idappadi',
    status: 'Upcoming',
    badgeColor: 'purple',
    image: '/images/sports/basketball.jpg'
  },
  {
    id: 'track-field-2026',
    name: 'Track & Field Championship',
    sport: 'Athletics | All Genders',
    date: 'Mar 5 - Mar 7, 2026',
    venue: 'College Ground, Idappadi',
    status: 'Registration Closed',
    badgeColor: 'rose',
    image: '/images/sports/running.jpg'
  }
];

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'SPARK 2026 Registration Open',
    desc: 'Register now and be a part of the biggest college sports carnival...',
    date: 'Dec 20, 2025',
    color: '#EF4444' // Red dot
  },
  {
    id: 2,
    title: 'Annual Sports Meet Schedule Released',
    desc: 'Check the event schedule, ground allocations and reporting times...',
    date: 'Dec 15, 2025',
    color: '#10B981' // Green dot
  },
  {
    id: 3,
    title: 'Team Selection Camp',
    desc: 'Cricket & volleyball selection camp trials scheduled on ground...',
    date: 'Dec 10, 2025',
    color: '#F59E0B' // Amber dot
  }
];

const RECENT_ACTIVITIES = [
  {
    id: 1,
    title: 'Tournament Registration',
    detail: 'SPARK 2026',
    time: '2 days ago',
    iconColor: '#38A7FF',
    dotColor: '#00B4D8'
  },
  {
    id: 2,
    title: 'Team Update',
    detail: 'B.Sc CS Cricket Team',
    time: '3 days ago',
    iconColor: '#10B981',
    dotColor: '#059669'
  },
  {
    id: 3,
    title: 'Profile Updated',
    detail: 'Personal Details',
    time: '5 days ago',
    iconColor: '#A78BFA',
    dotColor: '#7C3AED'
  }
];

const SPORTS_HIGHLIGHTS = [
  { name: 'Cricket', icon: '🏏', bg: 'rgba(56, 167, 255, 0.12)', border: 'rgba(56, 167, 255, 0.35)' },
  { name: 'Football', icon: '⚽', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' },
  { name: 'Basketball', icon: '🏀', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' },
  { name: 'Volleyball', icon: '🏐', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.35)' },
  { name: 'Athletics', icon: '👟', bg: 'rgba(167, 139, 250, 0.12)', border: 'rgba(167, 139, 250, 0.35)' },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [studentUser, setStudentUser] = useState<any>(null);
  const [tournaments, setTournaments] = useState(DEFAULT_TOURNAMENTS);
  const [stats, setStats] = useState({
    totalTournaments: 12,
    sportsAvailable: 20,
    myRegistrations: 3,
    myTeam: 1
  });
  const [selectedTournament, setSelectedTournament] = useState<any>(null);

  // Auto-rotate hero carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Load student profile & live database counts
  useEffect(() => {
    const loadProfileAndCounts = async () => {
      try {
        const stored = localStorage.getItem('gasc_user');
        if (stored) {
          const u = JSON.parse(stored);
          setStudentUser(u);

          // Fetch fresh student info & registrations from Supabase
          const regNo = u.registerNumber || u.regNo || u.register_number;
          if (regNo) {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .ilike('register_number', regNo)
              .maybeSingle();

            if (userData) {
              setStudentUser((prev: any) => ({ ...prev, ...userData }));
            }

            // Count registrations
            const { count: regCount } = await supabase
              .from('registrations')
              .select('*', { count: 'exact', head: true })
              .ilike('register_number', regNo);

            if (regCount !== null && regCount > 0) {
              setStats(prev => ({ ...prev, myRegistrations: regCount }));
            }
          }
        }
      } catch (e) {
        /* ignore */
      }

      // Fetch live competitions from Supabase
      try {
        const { data: supaCompetitions } = await supabase
          .from('competitions')
          .select('*')
          .order('date', { ascending: true })
          .limit(3);

        if (supaCompetitions && supaCompetitions.length > 0) {
          const mapped = supaCompetitions.map((c, idx) => ({
            id: c.id || `supa-${idx}`,
            name: c.name || c.title || 'College Championship',
            sport: c.sport || 'Sports',
            date: c.date ? new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upcoming',
            venue: c.venue || 'College Ground, Idappadi',
            status: c.status || (idx === 0 ? 'Registration Open' : 'Upcoming'),
            badgeColor: idx === 0 ? 'emerald' : idx === 1 ? 'purple' : 'rose',
            image: c.image || (c.sport?.toLowerCase().includes('cricket') ? '/images/sports/cricket.jpg' : c.sport?.toLowerCase().includes('basketball') ? '/images/sports/basketball.jpg' : '/images/sports/running.jpg')
          }));
          setTournaments(mapped);
          setStats(prev => ({ ...prev, totalTournaments: Math.max(12, supaCompetitions.length) }));
        }
      } catch (e) {
        /* keep default */
      }
    };

    loadProfileAndCounts();
  }, []);

  const studentName = studentUser?.name || 'Arun Kumar S';
  const studentRegNo = studentUser?.registerNumber || studentUser?.regNo || studentUser?.register_number || 'C24UG183CSC011';
  const studentDept = studentUser?.department || studentUser?.dept || 'B.Sc Computer Science';
  const studentYear = studentUser?.year || 'III Year';
  const studentGender = studentUser?.gender || 'Male';

  // Format department short name (e.g. B.Sc Computer Science -> B.Sc CS)
  const shortDept = studentDept.toLowerCase().includes('computer science')
    ? 'B.Sc CS'
    : studentDept.length > 12
    ? studentDept.split(' ').slice(0, 2).join(' ')
    : studentDept;

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="w-full flex flex-col gap-6 max-w-[1500px] mx-auto pb-10">
      
      {/* ══════════════════════════════════════════════════════════════
          TOP ROW: HERO CAROUSEL (LEFT 2/3) + PROFILE WIDGET (RIGHT 1/3)
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* ── HERO BANNER CAROUSEL (lg:col-span-8) ── */}
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden min-h-[300px] md:min-h-[340px] flex flex-col justify-between p-6 sm:p-7 border border-blue-400/25 shadow-2xl transition-all duration-500">
          
          {/* Dynamic Background Image with Depth Gradient Overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
            style={{
              backgroundImage: `url(${slide.image})`,
              filter: 'brightness(0.85) contrast(1.15)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/95 via-[#020817]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-transparent to-black/30" />
          
          {/* Neon flare radial accents */}
          <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-10 w-96 h-40 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none" />

          {/* 1. Header with Student Greeting matching reference image */}
          <div className="relative z-10 flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 border-2 border-cyan-400/40 p-0.5 shadow-lg flex items-center justify-center font-black text-white text-sm">
              {studentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AK'}
            </div>
            <div>
              <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                Welcome back,
              </div>
              <div className="text-white font-extrabold text-base tracking-tight flex items-center gap-1.5">
                <span>{studentName}</span>
                <span className="text-amber-400">👋</span>
              </div>
              <div className="text-[11px] text-cyan-300 font-medium">
                {studentDept} <span className="opacity-50">|</span> {studentYear} <span className="opacity-50">|</span> <span className="font-mono text-cyan-200">{studentRegNo}</span>
              </div>
            </div>
          </div>

          {/* 2. Main Title Typography & CTA Button */}
          <div className="relative z-10 my-4 max-w-xl">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/25 border border-cyan-400/40 backdrop-blur-md mb-2 shadow-lg shadow-cyan-500/10">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span className="text-xs font-black tracking-wider text-cyan-200 uppercase">
                {slide.badge}
              </span>
            </div>

            {/* Massive Headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
              <span>{slide.titleLine1}</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                {slide.titleLine2}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 tracking-wide">
              {slide.subtitle}
            </p>

            {/* Explore Tournaments Button */}
            <div className="mt-4">
              <Link
                to={slide.ctaLink}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all duration-200 hover:bg-cyan-50"
              >
                <span>{slide.ctaText}</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </Link>
            </div>
          </div>

          {/* 3. Floating Stylized Tagline on Right (Hidden on small mobile) */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 hidden sm:flex flex-col items-end pointer-events-none text-right opacity-85">
            <span className="italic font-black text-xl md:text-2xl text-cyan-300/90 tracking-wide drop-shadow-lg leading-tight font-jakarta">
              {slide.sideTagline[0]}
            </span>
            <span className="italic font-black text-xl md:text-2xl text-blue-300/90 tracking-wide drop-shadow-lg leading-tight font-jakarta">
              {slide.sideTagline[1]}
            </span>
            <span className="italic font-black text-xl md:text-2xl text-indigo-300/90 tracking-wide drop-shadow-lg leading-tight font-jakarta">
              {slide.sideTagline[2]}
            </span>
          </div>

          {/* 4. Carousel Arrows & Pagination Dots */}
          <div className="relative z-10 flex items-center justify-between pt-2">
            {/* Left / Right Arrow Controls */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              {HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-5 bg-cyan-400 shadow-md shadow-cyan-400/80' : 'w-1.5 bg-slate-500 hover:bg-slate-300'}`}
                  title={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── TOP RIGHT: STUDENT PROFILE CARD (lg:col-span-4) ── */}
        <div className="lg:col-span-4 glass-panel-deep p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-blue-400/40">
          
          {/* Subtle Ambient Light */}
          <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-blue-600/10 blur-2xl pointer-events-none" />

          {/* Header row: Avatar, Online Badge, Name, RegNo, Settings Gear */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 border border-cyan-400/40 shadow-xl flex items-center justify-center text-white font-black text-xl">
                  {studentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'AK'}
                </div>
                {/* Online pulse indicator */}
                <div className="absolute -bottom-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#020817] border border-emerald-400/40 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400">Online</span>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-white text-base leading-tight">
                  {studentName}
                </h3>
                <p className="text-xs text-cyan-300 font-mono font-semibold mt-0.5">
                  {studentRegNo}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-slate-300 font-medium">Verified Student</span>
                </div>
              </div>
            </div>

            {/* Settings button linking to settings */}
            <Link
              to="/student/settings"
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 border border-blue-400/20 text-slate-300 hover:text-white transition-all active:scale-90"
              title="Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent my-4 relative z-10" />

          {/* 3 Stat Chips matching image: Department, Year, Gender */}
          <div className="grid grid-cols-3 gap-2 relative z-10">
            {/* Department Chip */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-blue-400/15 text-center flex flex-col items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-400 mb-1" />
              <span className="font-extrabold text-white text-xs leading-tight line-clamp-1">{shortDept}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Department</span>
            </div>

            {/* Year Chip */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-blue-400/15 text-center flex flex-col items-center justify-center">
              <Award className="w-4 h-4 text-indigo-400 mb-1" />
              <span className="font-extrabold text-white text-xs leading-tight">{studentYear}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Year</span>
            </div>

            {/* Gender Chip */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-blue-400/15 text-center flex flex-col items-center justify-center">
              <User className="w-4 h-4 text-purple-400 mb-1" />
              <span className="font-extrabold text-white text-xs leading-tight">{studentGender}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Gender</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECOND ROW: 4 STAT CARDS (LEFT 2/3) + QUICK ACTIONS (RIGHT 1/3)
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* ── 4 GRADIENT GLASS STAT CARDS (lg:col-span-8) ── */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5 items-stretch">
          
          {/* Stat 1: Total Tournaments (Electric Blue) */}
          <Link
            to="/student/tournaments"
            className="stat-glass-blue rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-cyan-200 font-bold bg-white/10 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-blue-100">Total Tournaments</div>
              <div className="text-2xl font-black text-white mt-0.5 font-jakarta">{stats.totalTournaments}</div>
              <div className="text-[10px] text-cyan-300 font-medium mt-0.5">+2 this month</div>
            </div>
          </Link>

          {/* Stat 2: Sports Available (Emerald Green) */}
          <Link
            to="/student/sports"
            className="stat-glass-green rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-emerald-200 font-bold bg-white/10 px-2 py-0.5 rounded-full">College</span>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-emerald-100">Sports Available</div>
              <div className="text-2xl font-black text-white mt-0.5 font-jakarta">{stats.sportsAvailable}</div>
              <div className="text-[10px] text-emerald-200 font-medium mt-0.5">+3 new</div>
            </div>
          </Link>

          {/* Stat 3: My Registrations (Hot Pink / Magenta) */}
          <Link
            to="/student/competitions"
            className="stat-glass-pink rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-pink-200 font-bold bg-white/10 px-2 py-0.5 rounded-full">Joined</span>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-pink-100">My Registrations</div>
              <div className="text-2xl font-black text-white mt-0.5 font-jakarta">{stats.myRegistrations}</div>
              <div className="text-[10px] text-pink-200 font-bold mt-0.5 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Details</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </Link>

          {/* Stat 4: My Team (Golden Amber) */}
          <Link
            to="/student/tournaments"
            className="stat-glass-amber rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-amber-200 font-bold bg-white/10 px-2 py-0.5 rounded-full">Roster</span>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-amber-100">My Team</div>
              <div className="text-2xl font-black text-white mt-0.5 font-jakarta">{stats.myTeam}</div>
              <div className="text-[10px] text-amber-200 font-bold mt-0.5 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Team</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </div>

        {/* ── QUICK ACTIONS (lg:col-span-4) ── */}
        <div className="lg:col-span-4 glass-panel-deep p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h2 className="font-extrabold text-white text-sm tracking-wide">Quick Actions</h2>
          </div>

          {/* 2x2 Colorful Rounded Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Register for Tournament (Blue) */}
            <Link
              to="/student/tournaments"
              className="action-btn-blue p-3 rounded-xl flex items-center gap-2.5 text-white transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold leading-tight">Register for Tournament</span>
            </Link>

            {/* 2. View My Registrations (Green) */}
            <Link
              to="/student/competitions"
              className="action-btn-green p-3 rounded-xl flex items-center gap-2.5 text-white transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold leading-tight">View My Registrations</span>
            </Link>

            {/* 3. My Team (Purple) */}
            <Link
              to="/student/tournaments"
              className="action-btn-purple p-3 rounded-xl flex items-center gap-2.5 text-white transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold leading-tight">My Team</span>
            </Link>

            {/* 4. Update Profile (Orange) */}
            <Link
              to="/student/profile"
              className="action-btn-orange p-3 rounded-xl flex items-center gap-2.5 text-white transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold leading-tight">Update Profile</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          THIRD ROW: UPCOMING TOURNAMENTS (LEFT 2/3) + ANNOUNCEMENTS (RIGHT 1/3)
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* ── UPCOMING TOURNAMENTS SECTION (lg:col-span-8) ── */}
        <div className="lg:col-span-8 glass-panel-deep p-5 flex flex-col justify-between">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h2 className="font-extrabold text-white text-sm sm:text-base tracking-wide">
                Upcoming Tournaments
              </h2>
            </div>
            <Link
              to="/student/tournaments"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3 Tournament Cards in a row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {tournaments.map((t) => {
              const isOpen = t.status.toLowerCase().includes('open');
              const isUpcoming = t.status.toLowerCase().includes('upcoming');
              const badgeClass = isOpen
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : isUpcoming
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-400/40';

              return (
                <div
                  key={t.id}
                  className="rounded-xl overflow-hidden border border-blue-400/20 bg-slate-900/60 hover:bg-slate-900/80 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 flex flex-col group shadow-lg"
                >
                  {/* Image with status badge */}
                  <div className="relative h-28 w-full overflow-hidden bg-slate-950">
                    <img
                      src={t.image}
                      alt={t.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/hero-banner.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                    <span className={`absolute top-2.5 right-2.5 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border backdrop-blur-md shadow-sm ${badgeClass}`}>
                      {t.status}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-extrabold text-white text-xs sm:text-sm leading-tight group-hover:text-cyan-300 transition-colors">
                        {t.name}
                      </h3>
                      
                      <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span className="truncate">{t.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span className="truncate">{t.venue}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Dumbbell className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span className="truncate font-semibold text-slate-200">{t.sport}</span>
                        </div>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={() => setSelectedTournament(t)}
                      className="mt-3 w-full py-1.5 px-3 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 text-cyan-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── LATEST ANNOUNCEMENTS & MATCH CHEER BANNER (lg:col-span-4) ── */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Latest Announcements Glass Box */}
          <div className="glass-panel-deep p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-cyan-400" />
                <h2 className="font-extrabold text-white text-sm tracking-wide">
                  Latest Announcements
                </h2>
              </div>
              <Link
                to="/student/notifications"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* List of 3 Announcements */}
            <div className="space-y-3">
              {ANNOUNCEMENTS.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-900/50 border border-blue-400/10 hover:border-blue-400/30 transition-all flex items-start gap-3"
                >
                  {/* Colored Bullet Dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 shadow-md"
                    style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-bold text-white text-xs leading-snug truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                        {item.date}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cheer Match Banner matching image bottom-right */}
          <div className="cheer-banner-gradient p-4 rounded-2xl relative overflow-hidden flex items-center justify-between gap-4 border border-amber-400/30 shadow-xl group cursor-pointer"
            onClick={() => navigate('/student/tournaments')}
          >
            {/* Glowing Golden Trophy */}
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
              <Trophy className="w-7 h-7 text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
            </div>

            <div className="flex-1">
              <div className="text-amber-300 font-black text-sm italic font-jakarta tracking-wide">
                Good Luck
              </div>
              <div className="text-white font-extrabold text-xs tracking-tight">
                For Your Next Match!
              </div>
            </div>

            {/* Runner silhouette silhouette */}
            <div className="w-14 h-14 opacity-40 flex-shrink-0 group-hover:opacity-75 transition-opacity">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full stroke-amber-400">
                <circle cx="70" cy="20" r="8" fill="#FBBF24" />
                <path d="M65 30 L50 48 L32 44 L20 58" strokeWidth="4" strokeLinecap="round" />
                <path d="M50 48 L65 62 L85 55" strokeWidth="4" strokeLinecap="round" />
                <path d="M56 54 L44 72 L54 94" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BOTTOM ROW: MY RECENT ACTIVITY (LEFT) + SPORTS HIGHLIGHTS (RIGHT)
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ── MY RECENT ACTIVITY (lg:col-span-6) ── */}
        <div className="lg:col-span-6 glass-panel-deep p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="font-extrabold text-white text-sm tracking-wide">
                My Recent Activity
              </h2>
            </div>
            <Link
              to="/student/profile"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {RECENT_ACTIVITIES.map((act) => (
              <div
                key={act.id}
                className="p-2.5 rounded-xl bg-slate-900/50 border border-blue-400/10 flex items-center justify-between gap-3 hover:border-blue-400/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: act.iconColor, boxShadow: `0 0 8px ${act.iconColor}` }}
                  />
                  <div>
                    <span className="font-bold text-white text-xs">{act.title}</span>
                    <span className="text-[11px] text-cyan-300 ml-2 font-medium">{act.detail}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                  {act.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SPORTS HIGHLIGHTS (lg:col-span-6) ── */}
        <div className="lg:col-span-6 glass-panel-deep p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h2 className="font-extrabold text-white text-sm tracking-wide">
                Sports Highlights
              </h2>
            </div>
            <Link
              to="/student/sports"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* 5 Circular Glass Sports Pills */}
          <div className="grid grid-cols-5 gap-2 pt-1">
            {SPORTS_HIGHLIGHTS.map((sp) => (
              <Link
                key={sp.name}
                to="/student/sports"
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 group text-center"
                style={{ background: sp.bg, border: `1px solid ${sp.border}` }}
              >
                <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                  {sp.icon}
                </span>
                <span className="text-[11px] font-extrabold text-white mt-1.5 leading-tight">
                  {sp.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE TOURNAMENT DETAILS MODAL ── */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl glass-panel-deep border border-blue-400/40 p-6 shadow-2xl overflow-hidden">
            <div className="relative h-40 -mx-6 -mt-6 mb-4 overflow-hidden bg-slate-950">
              <img
                src={selectedTournament.image}
                alt={selectedTournament.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1830] via-transparent to-transparent" />
              <button
                onClick={() => setSelectedTournament(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90"
              >
                ✕
              </button>
            </div>

            <h3 className="text-xl font-extrabold text-white leading-tight">
              {selectedTournament.name}
            </h3>
            <p className="text-xs text-cyan-300 font-semibold mt-1">
              {selectedTournament.sport}
            </p>

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span><strong>Date:</strong> {selectedTournament.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span><strong>Venue:</strong> {selectedTournament.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <span><strong>Status:</strong> {selectedTournament.status}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                to="/student/tournaments"
                onClick={() => setSelectedTournament(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs text-center shadow-lg transition-all"
              >
                Register / View Matches
              </Link>
              <button
                onClick={() => setSelectedTournament(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
