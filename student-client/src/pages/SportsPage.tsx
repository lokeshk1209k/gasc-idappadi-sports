import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Dumbbell } from 'lucide-react';
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
  { id: 'cricket', name: 'Cricket', category: 'Outdoor', desc: 'The gentleman\'s game — bat, bowl and field your way to glory.' },
  { id: 'football', name: 'Football', category: 'Outdoor', desc: 'Fast-paced team sport requiring strategy and stamina.' },
  { id: 'volleyball', name: 'Volleyball', category: 'Outdoor', desc: 'Dynamic net sport perfect for team coordination.' },
  { id: 'basketball', name: 'Basketball', category: 'Outdoor', desc: 'High-energy sport combining skill, speed and teamwork.' },
  { id: 'kabaddi', name: 'Kabaddi', category: 'Outdoor', desc: 'Traditional contact sport requiring strength and tactics.' },
  { id: 'handball', name: 'Handball', category: 'Outdoor', desc: 'Fast-moving team game played with hands on hard court.' },
  { id: 'throwball', name: 'Throwball', category: 'Outdoor', desc: 'Non-contact net sport requiring quick reflexes and team play.' },
  { id: 'hockey', name: 'Hockey', category: 'Outdoor', desc: 'Fast-moving team sport played with curved sticks and ball.' },
  { id: 'kho_kho', name: 'Kho Kho', category: 'Outdoor', desc: 'Traditional Indian tag sport demanding speed and agility.' },
  { id: 'tennis', name: 'Tennis', category: 'Outdoor', desc: 'Elegant racket sport combining power and finesse.' },

  // Indoor Sports
  { id: 'badminton', name: 'Badminton', category: 'Indoor', desc: 'Fast racket sport requiring precision and agility.' },
  { id: 'table_tennis', name: 'Table Tennis', category: 'Indoor', desc: 'Rapid-fire precision sport for lightning reflexes.' },
  { id: 'chess', name: 'Chess', category: 'Indoor', desc: 'The ultimate game of strategy and mental agility.' },
  { id: 'carrom', name: 'Carrom', category: 'Indoor', desc: 'Classic board game of skill and accuracy.' },
  { id: 'boxing', name: 'Boxing', category: 'Indoor', desc: 'Combat sport testing strength, footwork and discipline.' },
  { id: 'karate', name: 'Karate', category: 'Indoor', desc: 'Traditional martial art focusing on strikes and blocking.' },
  { id: 'silambam', name: 'Silambam', category: 'Indoor', desc: 'Traditional Tamil staff-fencing martial art.' },
  { id: 'kickboxing', name: 'Kickboxing', category: 'Indoor', desc: 'High-energy martial art blending kicks and punches.' },
  { id: 'wrestling', name: 'Wrestling', category: 'Indoor', desc: 'Grappling sport requiring intense endurance and technique.' },

  // Athletics & Track/Field
  { id: 'running', name: '100m Running', category: 'Athletics', desc: 'Explosive track sprint testing maximum velocity.' },
  { id: 'relay', name: '4x100m Relay', category: 'Athletics', desc: 'Team sprint relay requiring precise baton passes.' },
  { id: 'marathon', name: 'Marathon', category: 'Athletics', desc: 'Ultimate long-distance endurance running race.' },
  { id: 'half_marathon', name: 'Half Marathon', category: 'Athletics', desc: '21km endurance distance running event.' },
  { id: 'long_jump', name: 'Long Jump', category: 'Athletics', desc: 'Track & field event combining speed, leap and distance.' },
  { id: 'high_jump', name: 'High Jump', category: 'Athletics', desc: 'Vertical leaping over a horizontal bar.' },
  { id: 'triple_jump', name: 'Triple Jump', category: 'Athletics', desc: 'Hop, step, and jump into the sand pit.' },
  { id: 'shot_put', name: 'Shot Put', category: 'Athletics', desc: 'Heavy spherical ball throwing competition.' },
  { id: 'discus_throw', name: 'Discus Throw', category: 'Athletics', desc: 'Rotational heavy disc throwing for distance.' },
  { id: 'javelin_throw', name: 'Javelin Throw', category: 'Athletics', desc: 'Spear-like javelin throw event showcasing power.' }
];

const SportsPage = () => {
  const [sports, setSports] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const res = await fetch('/api/sports');
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          // Merge server sports with full sports list so all athletics events are preserved
          const serverNames = new Set(data.data.map((s: any) => s.name?.toLowerCase()));
          const apiSportsMapped = data.data.map((s: any) => ({
            ...s,
            category: getSportCategory(s.name || '')
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
    <div>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="section-title" style={{ fontSize: 28 }}>
              EXPLORE <span style={{ color: '#38A7FF' }}>ALL SPORTS</span>
            </h1>
            <p className="section-subtitle">Choose your passion. Be a part of something bigger.</p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6E86A5' }} />
            <input
              type="text"
              placeholder="Search sports..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-bar"
              style={{ paddingLeft: 36, width: 220 }}
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`filter-tab ${activeCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sports Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6E86A5' }}>
          <Dumbbell style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>No sports found</p>
          <p style={{ fontSize: 13 }}>Try a different category or search term</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
          {filtered.map((sport, i) => (
            <div
              key={sport.id || sport._id || i}
              className="sport-card animate-fade-up"
              style={{ animationDelay: `${i * 0.04}s`, opacity: 0 }}
            >
              {/* Sport Image */}
              <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                <img
                  src={getSportImage(sport.name)}
                  alt={sport.name}
                  className="sport-img"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = getSportImage('running'); }}
                />
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,27,53,0.90) 0%, transparent 50%)' }} />

                {/* Category badge */}
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <span className={`badge ${sport.category === 'Indoor' ? 'badge-purple' : sport.category === 'Athletics' ? 'badge-orange' : 'badge-blue'}`}>
                    {sport.category}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: '16px' }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: '#FFFFFF', margin: '0 0 6px' }}>
                  {sport.name}
                </h3>
                <p style={{ fontSize: 12, color: '#6E86A5', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {sport.desc || sport.description || 'Premium college sport with competitive events.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#38A7FF', fontWeight: 600 }}>
                    {sport.category === 'Indoor' ? '🏛️ Indoor' : sport.category === 'Athletics' ? '🏃 Athletics' : '🏟️ Outdoor'}
                  </span>
                  <Link to="/student/tournaments" className="btn-outline" style={{ padding: '6px 12px', fontSize: 11 }}>
                    Register <ArrowRight style={{ width: 12, height: 12 }} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SportsPage;
