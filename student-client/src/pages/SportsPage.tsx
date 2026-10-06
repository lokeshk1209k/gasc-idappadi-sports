import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Dumbbell, Sparkles, X, Info, Trophy, MapPin, CheckCircle } from 'lucide-react';
import { getSportImage } from '../utils/sportImages';

const CATEGORIES = ['All', 'Indoor', 'Outdoor', 'Athletics'];

const INDOOR = ['Badminton', 'Table Tennis', 'Chess', 'Carrom', 'Boxing', 'Karate', 'Silambam', 'Kickboxing', 'Wrestling'];
const ATHLETICS_SPORTS = ['Athletics', 'Running', 'Relay', 'Marathon', 'Half Marathon', 'Long Jump', 'High Jump', 'Triple Jump', 'Shot Put', 'Discus Throw', 'Javelin Throw', 'Race Walking'];

function getSportCategory(name: string): string {
  if (INDOOR.some(s => name.toLowerCase().includes(s.toLowerCase()))) return 'Indoor';
  if (ATHLETICS_SPORTS.some(s => name.toLowerCase().includes(s.toLowerCase()))) return 'Athletics';
  return 'Outdoor';
}

const ALL_SPORTS_LIST = [
  // Outdoor / Team Sports
  { id: 'cricket', name: 'Cricket', category: 'Outdoor', desc: 'The gentleman\'s game — bat, bowl and field your way to glory.', players: '11 Players', venue: 'Main Cricket Oval', equipment: 'Cricket Kit, Bat, Pads, Leather Ball' },
  { id: 'football', name: 'Football', category: 'Outdoor', desc: 'Fast-paced team sport requiring strategy and stamina.', players: '11 Players', venue: 'College Football Arena', equipment: 'Size 5 Football, Shin Guards, Studs' },
  { id: 'volleyball', name: 'Volleyball', category: 'Outdoor', desc: 'Dynamic net sport perfect for team coordination.', players: '6 Players', venue: 'Outdoor Volleyball Courts', equipment: 'Volleyball, Net, Knee Pads' },
  { id: 'basketball', name: 'Basketball', category: 'Outdoor', desc: 'High-energy sport combining skill, speed and teamwork.', players: '5 Players', venue: 'All-Weather Hard Court', equipment: 'Size 7 Basketball, Court Shoes' },
  { id: 'kabaddi', name: 'Kabaddi', category: 'Outdoor', desc: 'Traditional contact sport requiring strength and tactics.', players: '7 Players', venue: 'Clay / Mat Ground', equipment: 'Sports Jersey, Ankle Support' },
  { id: 'handball', name: 'Handball', category: 'Outdoor', desc: 'Fast-moving team game played with hands on hard court.', players: '7 Players', venue: 'Multi-purpose Court', equipment: 'Handball Ball, Goal Nets' },
  { id: 'throwball', name: 'Throwball', category: 'Outdoor', desc: 'Non-contact net sport requiring quick reflexes and team play.', players: '7 Players', venue: 'Throwball Court', equipment: 'Throwball, High Net' },
  { id: 'hockey', name: 'Hockey', category: 'Outdoor', desc: 'Fast-moving team sport played with curved sticks and ball.', players: '11 Players', venue: 'Hockey Field', equipment: 'Hockey Stick, Shin Guards, Ball' },
  { id: 'kho_kho', name: 'Kho Kho', category: 'Outdoor', desc: 'Traditional Indian tag sport demanding speed and agility.', players: '9 Players', venue: 'Kho Kho Clay Court', equipment: 'Athletic Shoes, Poles' },
  { id: 'tennis', name: 'Tennis', category: 'Outdoor', desc: 'Elegant racket sport combining power and finesse.', players: 'Singles / Doubles', venue: 'Synthetic Tennis Court', equipment: 'Tennis Racket, Tennis Balls' },

  // Indoor Sports
  { id: 'badminton', name: 'Badminton', category: 'Indoor', desc: 'Fast racket sport requiring precision and agility.', players: 'Singles / Doubles', venue: 'Indoor Wooden Court', equipment: 'Carbon Racket, Feather Shuttlecock' },
  { id: 'table_tennis', name: 'Table Tennis', category: 'Indoor', desc: 'Rapid-fire precision sport for lightning reflexes.', players: 'Singles / Doubles', venue: 'Indoor TT Arena', equipment: 'TT Bat, 40mm Balls, Table' },
  { id: 'chess', name: 'Chess', category: 'Indoor', desc: 'The ultimate game of strategy and mental agility.', players: 'Individual', venue: 'Recreation Hall', equipment: 'Tournament Chess Board & Clock' },
  { id: 'carrom', name: 'Carrom', category: 'Indoor', desc: 'Classic board game of skill and accuracy.', players: 'Singles / Doubles', venue: 'Student Club Hall', equipment: 'Standard Board, Coins, Striker' },
  { id: 'boxing', name: 'Boxing', category: 'Indoor', desc: 'Combat sport testing strength, footwork and discipline.', players: 'Individual', venue: 'Boxing Ring Facility', equipment: 'Boxing Gloves, Mouthguard, Headgear' },
  { id: 'karate', name: 'Karate', category: 'Indoor', desc: 'Traditional martial art focusing on strikes and blocking.', players: 'Individual', venue: 'Martial Arts Dojo', equipment: 'Gi Uniform, Belt, Hand Guards' },
  { id: 'silambam', name: 'Silambam', category: 'Indoor', desc: 'Traditional Tamil staff-fencing martial art.', players: 'Individual', venue: 'Heritage Sports Arena', equipment: 'Silambam Cane Staff (Murai)' },
  { id: 'kickboxing', name: 'Kickboxing', category: 'Indoor', desc: 'High-energy martial art blending kicks and punches.', players: 'Individual', venue: 'Fitness Combat Zone', equipment: 'Shin Guards, Gloves, Mat' },
  { id: 'wrestling', name: 'Wrestling', category: 'Indoor', desc: 'Grappling sport requiring intense endurance and technique.', players: 'Individual', venue: 'Wrestling Mat Arena', equipment: 'Wrestling Singlet, Shoes' },

  // Athletics & Track/Field
  { id: 'running', name: '100m Running', category: 'Athletics', desc: 'Explosive track sprint testing maximum velocity.', players: 'Individual', venue: 'Synthetic Track (Lane 1-8)', equipment: 'Track Spikes, Starting Blocks' },
  { id: 'relay', name: '4x100m Relay', category: 'Athletics', desc: 'Team sprint relay requiring precise baton passes.', players: '4 Runners', venue: '400m Track', equipment: 'Aluminum Relay Baton, Spikes' },
  { id: 'marathon', name: 'Marathon', category: 'Athletics', desc: 'Ultimate long-distance endurance running race.', players: 'Individual', venue: 'Campus & Perimeter Route', equipment: 'Marathon Running Shoes, Bib' },
  { id: 'half_marathon', name: 'Half Marathon', category: 'Athletics', desc: '21km endurance distance running event.', players: 'Individual', venue: 'Campus & Perimeter Route', equipment: 'Distance Running Shoes, Bib' },
  { id: 'long_jump', name: 'Long Jump', category: 'Athletics', desc: 'Track & field event combining speed, leap and distance.', players: 'Individual', venue: 'Sand Pit Runway', equipment: 'Spikes, Take-off Board' },
  { id: 'high_jump', name: 'High Jump', category: 'Athletics', desc: 'Vertical leaping over a horizontal bar.', players: 'Individual', venue: 'High Jump Mat Arena', equipment: 'High Jump Spikes, Landing Foam' },
  { id: 'triple_jump', name: 'Triple Jump', category: 'Athletics', desc: 'Hop, step, and jump into the sand pit.', players: 'Individual', venue: 'Sand Pit Runway', equipment: 'Jumping Spikes, Sand Pit' },
  { id: 'shot_put', name: 'Shot Put', category: 'Athletics', desc: 'Heavy spherical ball throwing competition.', players: 'Individual', venue: 'Throwing Circle Arena', equipment: 'Brass / Steel Shot Put Ball' },
  { id: 'discus_throw', name: 'Discus Throw', category: 'Athletics', desc: 'Rotational heavy disc throwing for distance.', players: 'Individual', venue: 'Discus Cage Sector', equipment: 'Rubber / Metal Discus' },
  { id: 'javelin_throw', name: 'Javelin Throw', category: 'Athletics', desc: 'Spear-like javelin throw event showcasing power.', players: 'Individual', venue: 'Javelin Runway & Sector', equipment: 'Competition Javelin (Men/Women)' }
];

const SportsPage = () => {
  const [sports, setSports] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<any | null>(null);

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await fetch('/api/sports');
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const serverNames = new Set(data.data.map((s: any) => s.name?.toLowerCase()));
          const apiSportsMapped = data.data.map((s: any) => ({
            ...s,
            category: getSportCategory(s.name || ''),
            players: s.players || 'Team / Individual',
            venue: s.venue || 'College Sports Facility',
            equipment: s.equipment || 'Standard PE Equipment'
          }));
          const missingInApi = ALL_SPORTS_LIST.filter(s => !serverNames.has(s.name.toLowerCase()));
          setSports([...apiSportsMapped, ...missingInApi]);
          return;
        }
      } catch { /* use full fallback */ }
      setSports(ALL_SPORTS_LIST);
    };
    fetchSports();
  }, []);

  const filtered = sports.filter(s => {
    const matchCat = activeCategory === 'All' || s.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', marginBottom: 10 }}>
              <Sparkles style={{ width: 14, height: 14, color: 'var(--accent-secondary)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-secondary)', letterSpacing: '0.04em' }}>
                OFFICIAL COLLEGE DISCIPLINES
              </span>
            </div>
            <h1 className="section-title" style={{ fontSize: 30 }}>
              EXPLORE <span style={{ color: 'var(--accent-secondary)' }}>ALL SPORTS</span>
            </h1>
            <p className="section-subtitle">
              Choose your athletic discipline. Represent your department and compete for state and zonal medals.
            </p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ width: 15, height: 15, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search sports disciplines..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-bar"
              style={{ paddingLeft: 40, width: 260 }}
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`filter-tab btn-interactive-ripple ${isActive ? 'active' : ''}`}
                style={{
                  padding: '9px 20px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-gradient)' : 'var(--bg-input)',
                  border: `1.5px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 4px 16px var(--accent-glow)' : 'none',
                  transition: 'all 0.22s ease',
                }}
              >
                {cat === 'All' ? '🌐 All Sports' : cat === 'Indoor' ? '🏛️ Indoor Sports' : cat === 'Outdoor' ? '🏟️ Outdoor Sports' : '🏃 Track & Athletics'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sports Grid */}
      {filtered.length === 0 ? (
        <div className="gasc-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Dumbbell style={{ width: 44, height: 44, margin: '0 auto 12px', opacity: 0.4, color: 'var(--accent-secondary)' }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No sports found</p>
          <p style={{ fontSize: 13 }}>Try a different category or search term</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {filtered.map((sport, i) => (
            <div
              key={sport.id || sport._id || i}
              className="sport-card interactive-hover-card"
              style={{
                borderRadius: 18,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedSport(sport)}
            >
              {/* Sport Image */}
              <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                <img
                  src={getSportImage(sport.name)}
                  alt={sport.name}
                  className="sport-img"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = getSportImage('running'); }}
                />
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(2,8,23,0.92) 0%, rgba(2,8,23,0.2) 60%, transparent 100%)' }} />

                {/* Category badge */}
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <span
                    className="badge"
                    style={{
                      background: sport.category === 'Indoor' ? 'rgba(139,92,246,0.35)' : sport.category === 'Athletics' ? 'rgba(255,106,33,0.35)' : 'var(--accent-subtle)',
                      color: sport.category === 'Indoor' ? '#A78BFA' : sport.category === 'Athletics' ? '#FF9A50' : 'var(--accent-secondary)',
                      border: `1px solid ${sport.category === 'Indoor' ? 'rgba(139,92,246,0.5)' : sport.category === 'Athletics' ? 'rgba(255,106,33,0.5)' : 'var(--accent-border)'}`,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {sport.category}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  {sport.name}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5, flex: 1 }}>
                  {sport.desc || sport.description || 'Premium college sport with competitive events.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: 11, color: 'var(--accent-secondary)', fontWeight: 700 }}>
                    {sport.category === 'Indoor' ? '🏛️ Indoor' : sport.category === 'Athletics' ? '🏃 Athletics' : '🏟️ Outdoor'}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSport(sport);
                    }}
                    className="btn-outline btn-interactive-ripple"
                    style={{ padding: '6px 14px', fontSize: 11 }}
                  >
                    Details <ArrowRight style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ INTERACTIVE SPORT DETAILS MODAL ════════════════════════════════════════ */}
      {selectedSport && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedSport(null)}
        >
          <div
            className="gasc-card"
            style={{
              maxWidth: 520,
              width: '100%',
              borderRadius: 22,
              padding: 0,
              overflow: 'hidden',
              border: '1.5px solid var(--accent-border)',
              boxShadow: '0 24px 60px var(--accent-glow)',
              background: 'var(--bg-card-solid)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Image Header */}
            <div style={{ position: 'relative', height: 200 }}>
              <img
                src={getSportImage(selectedSport.name)}
                alt={selectedSport.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(2,8,23,0.95) 0%, transparent 60%)' }} />
              
              <button
                onClick={() => setSelectedSport(null)}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(2,8,23,0.7)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>

              <div style={{ position: 'absolute', bottom: 16, left: 20 }}>
                <span className="badge" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-secondary)', border: '1px solid var(--accent-border)', marginBottom: 6 }}>
                  {selectedSport.category} Discipline
                </span>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 900, fontSize: 24, color: '#FFFFFF', margin: 0 }}>
                  {selectedSport.name}
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                {selectedSport.desc || selectedSport.description || 'Official competitive sports discipline at Government Arts & Science College, Idappadi.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 2px' }}>Format</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {selectedSport.players || 'Team / Individual'}
                  </p>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--bg-input)', border: '1px solid var(--border-glass)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 2px' }}>Campus Arena</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {selectedSport.venue || 'College Sports Grounds'}
                  </p>
                </div>
              </div>

              {selectedSport.equipment && (
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--accent-secondary)', fontWeight: 700, margin: '0 0 2px' }}>
                    📦 Required Gear & Equipment:
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: 0 }}>
                    {selectedSport.equipment}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                <Link
                  to="/student/tournaments"
                  onClick={() => setSelectedSport(null)}
                  className="btn-primary btn-interactive-ripple"
                  style={{ flex: 1, padding: '12px', textAlign: 'center', justifyContent: 'center' }}
                >
                  <Trophy style={{ width: 16, height: 16 }} />
                  View Tournaments for this Sport
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedSport(null)}
                  className="btn-outline btn-interactive-ripple"
                  style={{ padding: '12px 20px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SportsPage;
