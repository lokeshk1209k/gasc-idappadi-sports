import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, ChevronRight, Flame, Calendar, MapPin } from 'lucide-react';
import { getSportImage } from '../utils/sportImages';

const HomePage = () => {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const categories = ['ALL', 'TEAM SPORTS', 'INDIVIDUAL', 'INDOOR', 'OUTDOOR'];

  const featuredSports = [
    { name: 'Cricket', category: 'TEAM SPORTS', tag: 'OUTDOOR', desc: 'Tournament-grade pitch & equipment. Inter-department annual championship.' },
    { name: 'Football', category: 'TEAM SPORTS', tag: 'OUTDOOR', desc: '11-a-side league matches, zonal selections and daily team training.' },
    { name: 'Kabaddi', category: 'TEAM SPORTS', tag: 'OUTDOOR', desc: 'High-intensity traditional contact sport. State level representation.' },
    { name: 'Badminton', category: 'INDIVIDUAL', tag: 'OUTDOOR', desc: 'Collegiate badminton court training with tournament shuttle & net standards.' },
    { name: 'Boxing', category: 'INDIVIDUAL', tag: 'OUTDOOR', desc: 'Amateur boxing training, sparring, and weight-category championships.' },
    { name: 'Athletics (Running)', category: 'INDIVIDUAL', tag: 'OUTDOOR', desc: '100m, 400m, 1500m sprint and endurance track events.' },
    { name: 'Chess', category: 'INDIVIDUAL', tag: 'INDOOR', desc: 'FIDE rated chess boards for tactical minds and quiet strategy.' },
    { name: 'Carrom', category: 'INDIVIDUAL', tag: 'INDOOR', desc: 'Standard board carrom tournament for singles and doubles.' },
    { name: 'Table Tennis', category: 'INDIVIDUAL', tag: 'INDOOR', desc: 'Fast-paced table tennis coaching and competitions.' }
  ];

  const filteredSports = activeCategory === 'ALL' 
    ? featuredSports 
    : featuredSports.filter(s => s.category === activeCategory || s.tag.toUpperCase() === activeCategory);

  return (
    <div className="space-y-24 pb-16">
      
      {/* 1. MAGAZINE HERO SECTION */}
      <section className="relative pt-4 pb-8 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        
        {/* Left Editorial Composition */}
        <div className="flex-1 space-y-8 text-center lg:text-left z-10">
          
          {/* Small Badge with Official College Emblem */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#32145F] text-white text-xs font-space font-bold uppercase tracking-wider shadow-sm">
            <div className="w-5 h-5 rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
              <img src="/images/college-logo.png" alt="GASC Emblem" className="w-full h-full object-contain rounded-full" />
            </div>
            <span>GASC IDAPPADI SPORTS MANAGEMENT</span>
          </div>

          {/* Magazine Huge Heading */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-outfit font-black tracking-tight text-[#32145F] leading-[0.9]">
            YOUR <br />
            <span className="text-[#FF6B2C]">GAME.</span> <br />
            YOUR <br />
            <span className="text-[#6D3FE8]">STORY.</span>
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg text-[#171717]/80 max-w-xl mx-auto lg:mx-0 font-inter leading-relaxed font-normal">
            Discover competitions, represent your college, track your achievements and build your sports journey with Government Arts and Science College, Idappadi.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            <Link to="/student/sports" className="btn-arena-primary text-sm w-full sm:w-auto py-4 px-8">
              EXPLORE SPORTS <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/student/competitions" className="btn-arena-outline text-sm w-full sm:w-auto py-4 px-8">
              VIEW TOURNAMENTS <Trophy className="w-4 h-4" />
            </Link>
          </div>

          {/* Editorial Oversized Statistics */}
          <div className="pt-8 border-t border-[#E8E5DE] grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
            <div>
              <span className="block text-4xl lg:text-5xl font-outfit font-black text-[#32145F]">25+</span>
              <span className="text-xs font-space font-bold text-[#171717]/70 uppercase tracking-wider">SPORTS</span>
            </div>
            <div>
              <span className="block text-4xl lg:text-5xl font-outfit font-black text-[#FF6B2C]">500+</span>
              <span className="text-xs font-space font-bold text-[#171717]/70 uppercase tracking-wider">ATHLETES</span>
            </div>
            <div>
              <span className="block text-4xl lg:text-5xl font-outfit font-black text-[#6D3FE8]">100%</span>
              <span className="text-xs font-space font-bold text-[#171717]/70 uppercase tracking-wider">VERIFIED</span>
            </div>
          </div>
        </div>

        {/* Right Hero Graphic Card */}
        <div className="flex-1 relative w-full max-w-lg lg:max-w-xl">
          <div className="relative rounded-3xl bg-[#32145F] p-6 sm:p-8 text-white shadow-2xl overflow-hidden space-y-5 border border-white/10">
            {/* Tournament Image preview banner */}
            <div className="h-44 rounded-2xl overflow-hidden relative bg-black/40">
              <img
                src="/images/sports/tournament.png"
                alt="SPARK 2026 Sports Fest"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = '/images/sports/running.png'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#32145F] via-[#32145F]/40 to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-space font-extrabold bg-[#FF6B2C] text-white uppercase tracking-wider shadow">
                <Flame className="w-3.5 h-3.5 fill-white" /> ANNUAL CHAMPIONSHIP
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-outfit font-black text-white leading-tight">
              SPARK 2026 SPORTS FEST
            </h2>

            <p className="text-xs sm:text-sm text-white/80 font-inter leading-relaxed">
              Official annual sports festival of Government Arts and Science College, Idappadi. Compete across 25+ disciplines and earn official college honors.
            </p>

            <div className="grid grid-cols-2 gap-3 font-space text-xs text-white">
              <div className="p-3 rounded-xl bg-white/10 border border-white/20">
                <span className="text-white/60 block text-[10px] mb-0.5">DATES</span>
                <span className="font-bold">12–16 OCT 2026</span>
              </div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/20">
                <span className="text-white/60 block text-[10px] mb-0.5">VENUE</span>
                <span className="font-bold">GASC GROUNDS</span>
              </div>
            </div>

            <Link to="/student/competitions" className="btn-arena-primary w-full text-center text-xs py-3.5 justify-center">
              EXPLORE TOURNAMENTS <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. SPORTS EXPLORER SECTION — real sport images */}
      <section className="arena-panel-purple p-8 sm:p-12 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-8">
          <div>
            <span className="text-[#FF6B2C] font-space font-extrabold text-xs tracking-widest uppercase block mb-2">DISCIPLINE SELECTION</span>
            <h2 className="text-3xl sm:text-5xl font-outfit font-black text-white">
              EXPLORE YOUR <span className="text-[#FF6B2C]">GAME</span>
            </h2>
            <p className="text-sm text-white/70 font-inter mt-2 max-w-xl">From the field to the track, find the sport that feels like yours.</p>
          </div>
          <Link to="/student/sports" className="px-6 py-3 rounded-xl border-2 border-white/30 text-white font-space font-bold text-xs hover:bg-white hover:text-[#32145F] transition-all flex items-center gap-2">
            VIEW ALL DISCIPLINES <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-space font-bold tracking-wider transition-all relative ${
                activeCategory === cat ? 'bg-[#FF6B2C] text-white shadow-lg' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Sport cards with REAL images */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSports.map((sport, idx) => (
            <Link key={idx} to="/student/sports"
              className="bg-white rounded-2xl overflow-hidden text-[#171717] group hover:-translate-y-1 transition-all duration-300 shadow-xl flex flex-col"
            >
              {/* Real sport image */}
              <div className="relative h-44 overflow-hidden bg-[#32145F]">
                <img
                  src={getSportImage(sport.name)}
                  alt={sport.name}
                  loading="lazy"
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { e.currentTarget.src = '/images/sports/running.png'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#32145F]/70 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-space font-bold bg-[#32145F] text-white">{sport.tag}</span>
                <span className="absolute bottom-3 left-3 text-[10px] font-space font-bold text-white/90">{sport.category}</span>
              </div>

              <div className="p-5 flex flex-col justify-between flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-outfit font-extrabold text-[#32145F] group-hover:text-[#FF6B2C] transition-colors">
                    {sport.name}
                  </h3>
                  <p className="text-xs text-[#171717]/70 font-inter leading-relaxed mt-1">{sport.desc}</p>
                </div>
                <div className="pt-3 border-t border-[#E8E5DE] flex items-center justify-between text-xs font-space font-bold text-[#FF6B2C]">
                  <span>EXPLORE DISCIPLINE</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FEATURED CHAMPIONSHIP */}
      <section className="bg-white border-2 border-[#E8E5DE] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <div className="lg:w-1/2 space-y-6">
            <span className="text-xs font-space font-extrabold text-[#6D3FE8] uppercase tracking-widest block">
              FEATURED CHAMPIONSHIP
            </span>

            <h2 className="text-4xl sm:text-5xl font-outfit font-black text-[#32145F] leading-tight">
              THE ARENA IS READY.
            </h2>

            <p className="text-sm text-[#171717]/80 font-inter leading-relaxed">
              Step up and represent your department in SPARK 2026. Over 10 sports disciplines, 500+ student athletes, and official college certificates await.
            </p>

            <div className="grid grid-cols-2 gap-4 py-2 font-space text-xs text-[#32145F]">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F7F4ED] border border-[#E8E5DE]">
                <Calendar className="w-4 h-4 text-[#FF6B2C]" />
                <span className="font-bold">12–16 OCT 2026</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F7F4ED] border border-[#E8E5DE]">
                <MapPin className="w-4 h-4 text-[#6D3FE8]" />
                <span className="font-bold">GASC GROUNDS</span>
              </div>
            </div>

            <Link to="/student/competitions" className="btn-arena-primary py-4 px-8 text-sm inline-flex">
              ENTER TOURNAMENT <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="lg:w-1/2 p-8 rounded-2xl bg-[#32145F] text-white space-y-4 shadow-xl">
            <span className="text-xs font-space font-bold text-[#B7E33A] uppercase tracking-wider block">ANNUAL SPORTS FEST</span>
            <h3 className="text-3xl font-outfit font-black">SPARK 2026</h3>
            <p className="text-xs text-white/80 font-inter leading-relaxed">
              Inter-departmental championship tournament featuring Cricket, Football, Volleyball, Kabaddi, Badminton, Boxing and Track & Field events.
            </p>
          </div>
        </div>
      </section>

      {/* 4. ATHLETE JOURNEY HIGHLIGHT */}
      <section className="bg-[#171717] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-6">
          <div>
            <span className="text-[#FF6B2C] font-space font-extrabold text-xs tracking-widest uppercase block mb-1">
              VERIFIED ATHLETIC MILESTONES
            </span>
            <h2 className="text-3xl sm:text-4xl font-outfit font-black text-white">
              COLLEGE SPORTS CHAMPIONS
            </h2>
          </div>

          <Link to="/student/tournaments" className="btn-arena-purple text-xs py-3 px-6">
            VIEW TOURNAMENTS <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#32145F] border border-white/10 space-y-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-space font-bold bg-[#FF6B2C] text-white">GOLD MEDAL</span>
            <h3 className="text-xl font-outfit font-bold text-white">SPARK 2026 Cricket Champions</h3>
            <p className="text-xs text-white/70 font-inter">1st Place in Inter-Department Championship.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#32145F] border border-white/10 space-y-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-space font-bold bg-slate-200 text-[#171717]">SILVER MEDAL</span>
            <h3 className="text-xl font-outfit font-bold text-white">District Badminton Tournament</h3>
            <p className="text-xs text-white/70 font-inter">Runner Up in Salem District Inter-College Meet.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#32145F] border border-white/10 space-y-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-space font-bold bg-[#B7E33A] text-[#171717]">OFFICIAL CERTIFICATE</span>
            <h3 className="text-xl font-outfit font-bold text-white">Athletics 100m Sprint</h3>
            <p className="text-xs text-white/70 font-inter">Periyar University Athletics Meet Participant.</p>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
