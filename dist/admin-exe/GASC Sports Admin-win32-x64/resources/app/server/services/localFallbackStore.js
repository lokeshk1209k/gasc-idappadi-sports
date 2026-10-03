const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');
const COMPS_FILE = path.join(DATA_DIR, 'external_competitions.json');
const NEWS_FILE = path.join(DATA_DIR, 'sports_news.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data for competitions
const INITIAL_COMPETITIONS = [
  {
    id: 'c101-cm-trophy-2026',
    title: "Chief Minister's Trophy (CM Trophy) 2026 - Inter-College District Level",
    sport: 'Athletics, Football, Volleyball, Kabaddi, Badminton',
    level: 'District',
    type: 'Both',
    organizer: 'Sports Development Authority of Tamil Nadu (SDAT)',
    venue: 'Mahatma Gandhi Stadium, Salem',
    district: 'Salem',
    state: 'Tamil Nadu',
    start_date: '2026-10-20',
    end_date: '2026-10-25',
    registration_start_date: '2026-09-01',
    registration_deadline: '2026-10-15',
    eligibility: 'Bonafide college students studying in Salem District institutions under 25 years',
    age_limit: 'Under 25 Years',
    gender: 'All',
    participation_type: 'Both',
    description: 'Tamil Nadu CM Trophy 2026 college level competitions across multiple disciplines. District winners will qualify for the State Level finals in Chennai with attractive cash rewards and government certificates.',
    announcement_summary: 'Official SDAT CM Trophy 2026 registration is open for college students in Salem. Cash prizes up to Rs. 1,00,000 for state champions.',
    source_name: 'SDAT Tamil Nadu Official Portal',
    source_url: 'https://sdat.tn.gov.in',
    registration_url: 'https://sdat.tn.gov.in/cmtrophy-registration',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    featured: true,
    status: 'Registration Open',
    created_at: new Date('2026-09-01T09:00:00Z').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'c102-periyar-univ-meet',
    title: 'Periyar University Inter-Collegiate Men & Women Athletics Championship 2026',
    sport: 'Athletics',
    level: 'University',
    type: 'Individual',
    organizer: 'Periyar University Sports Board',
    venue: 'University Synthetic Track, Periyar University, Salem',
    district: 'Salem',
    state: 'Tamil Nadu',
    start_date: '2026-10-08',
    end_date: '2026-10-10',
    registration_start_date: '2026-09-05',
    registration_deadline: '2026-10-01',
    eligibility: 'Affiliated colleges of Periyar University. Valid college ID card & physical fitness certificate required.',
    age_limit: 'Under 25 Years',
    gender: 'All',
    participation_type: 'Individual',
    description: 'Annual Inter-Collegiate Athletic Championship for affiliated colleges of Periyar University. Selection for South Zone All India Inter-University squad.',
    announcement_summary: 'Entries invited from college athletic teams for the 2026 Periyar University Athletic Meet.',
    source_name: 'Periyar University Sports Department',
    source_url: 'https://periyaruniversity.ac.in',
    registration_url: 'https://periyaruniversity.ac.in/sports/entries',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    featured: true,
    status: 'Registration Open',
    created_at: new Date('2026-09-02T10:00:00Z').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'c103-salem-dist-kabaddi',
    title: 'Salem District Inter-College Kabaddi Invitation Tournament 2026',
    sport: 'Kabaddi',
    level: 'District',
    type: 'Team',
    organizer: 'Salem Amateur Kabaddi Association & GASC Idappadi',
    venue: 'College Sports Pavilion, GASC Idappadi',
    district: 'Salem',
    state: 'Tamil Nadu',
    start_date: '2026-10-14',
    end_date: '2026-10-15',
    registration_start_date: '2026-09-05',
    registration_deadline: '2026-10-07',
    eligibility: 'Men & Women collegiate teams from Salem, Namakkal, and Erode districts.',
    age_limit: 'No age bar for bona fide college students',
    gender: 'All',
    participation_type: 'Team',
    description: 'Premier mat kabaddi invitation tournament featuring top college squads. Rolling trophy & cash prizes for semifinalists.',
    announcement_summary: 'GASC Idappadi will host the Salem District Inter-College Kabaddi Tournament on 14-15 October 2026.',
    source_name: 'Salem District Sports Council',
    source_url: '',
    registration_url: 'http://localhost:5000/student-dashboard.html',
    image: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?w=800&auto=format&fit=crop&q=80',
    featured: false,
    status: 'Registration Open',
    created_at: new Date('2026-09-03T11:00:00Z').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'c104-tn-state-volleyball',
    title: 'Tamil Nadu State Senior Open Volleyball Championship 2026',
    sport: 'Volleyball',
    level: 'State',
    type: 'Team',
    organizer: 'Tamil Nadu State Volleyball Association (TNSVA)',
    venue: 'Jawaharlal Nehru Indoor Stadium, Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    start_date: '2026-11-05',
    end_date: '2026-11-10',
    registration_start_date: '2026-09-10',
    registration_deadline: '2026-10-25',
    eligibility: 'Open to college and club teams recognized by District Volleyball Associations.',
    age_limit: 'Open Category',
    gender: 'All',
    participation_type: 'Team',
    description: 'State-wide championship conducted by TNSVA. Top players will be scouted for the National Games camp.',
    announcement_summary: 'State Senior Open Volleyball Championship 2026 announced. Registration open through district associations.',
    source_name: 'TNSVA Official Notice',
    source_url: 'https://volleyballindia.com',
    registration_url: 'https://volleyballindia.com/tn-senior-2026',
    image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80',
    featured: false,
    status: 'Published',
    created_at: new Date('2026-09-04T12:00:00Z').toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Initial seed data for sports news
const INITIAL_NEWS = [
  {
    id: 'n101-cm-trophy-news',
    title: 'CM Trophy 2026 Selection Trials Announced for Salem District College Athletes',
    short_summary: 'SDAT announced selection schedules for collegiate sports teams across Salem district for the upcoming Tamil Nadu Chief Minister Trophy 2026.',
    full_description: 'Sports Development Authority of Tamil Nadu (SDAT) has released the complete schedule for college students participating in CM Trophy 2026. Events include Track & Field, Volleyball, Football, Badminton, and Kabaddi. Interested student players from GASC Idappadi are requested to contact Physical Directress Dr. R. Anitha for registration guidance and team entries.',
    sport: 'General',
    category: 'Tournament',
    source_name: 'Daily Thanthi Sports / SDAT Notice',
    source_url: 'https://sdat.tn.gov.in',
    published_date: '2026-09-08',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
    featured: true,
    status: 'Published',
    created_at: new Date('2026-09-08T08:00:00Z').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'n102-gasc-athletic-victory',
    title: 'GASC Idappadi Athletes Win 4 Medals at Zone Athletic Meet',
    short_summary: 'College players bagged 2 Gold, 1 Silver, and 1 Bronze medals in 100m, 400m, and Shot Put events at the Zonal Meet.',
    full_description: 'Our college athletes showcased exceptional grit and sportsmanship at the Periyar University Zonal Athletic Meet. Congratulations to Selvan K. Vignesh (III B.Sc CS) for winning Gold in 100m sprint and Selvi M. Deepa (II B.A Tamil) for winning Gold in Shot Put.',
    sport: 'Athletics',
    category: 'Achievement',
    source_name: 'Department of Physical Education, GASC Idappadi',
    source_url: '',
    published_date: '2026-09-06',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    featured: true,
    status: 'Published',
    created_at: new Date('2026-09-06T10:00:00Z').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'n103-sdat-scholarship',
    title: 'SDAT Sports Scholarship Scheme 2026-27 Open for Outstanding College Players',
    short_summary: 'Financial assistance of up to Rs. 25,000 per annum offered by Tamil Nadu Government for collegiate medalists.',
    full_description: 'Applications are invited from students who secured medals in National, State, or University-level sports tournaments during the academic year 2025-26. Eligible candidates may submit their certificates to the Physical Education office before October 15, 2026.',
    sport: 'General',
    category: 'Sports Announcement',
    source_name: 'Tamil Nadu Sports Youth Welfare Dept',
    source_url: 'https://sdat.tn.gov.in',
    published_date: '2026-09-04',
    image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&auto=format&fit=crop&q=80',
    featured: false,
    status: 'Published',
    created_at: new Date('2026-09-04T09:30:00Z').toISOString(),
    updated_at: new Date().toISOString()
  }
];

function readJSON(file, defaultData) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }
    return parsed;
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
    return defaultData;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Error writing ${file}:`, e.message);
    return false;
  }
}

// ----------------------------------------------------------------
// COMPETITIONS METHODS
// ----------------------------------------------------------------
function getCompetitions(filter = {}) {
  let list = readJSON(COMPS_FILE, INITIAL_COMPETITIONS);
  const { sport, level, type, status, search, featured, isAdmin } = filter;

  if (!isAdmin) {
    list = list.filter(c => ['Published', 'Registration Open', 'Registration Closed'].includes(c.status));
  }
  if (sport && sport !== 'All') {
    const s = sport.toLowerCase();
    list = list.filter(c => (c.sport || '').toLowerCase().includes(s));
  }
  if (level && level !== 'All') {
    list = list.filter(c => c.level === level);
  }
  if (type && type !== 'All') {
    list = list.filter(c => c.type === type || c.participation_type === type);
  }
  if (status && status !== 'All') {
    list = list.filter(c => c.status === status);
  }
  if (featured === 'true' || featured === true) {
    list = list.filter(c => c.featured === true);
  }
  if (search) {
    const rawQ = search.toLowerCase();
    const normalizedQ = rawQ.replace(/troffy/g, 'trophy');
    const words = normalizedQ.split(/\s+/).filter(w => w.length > 1);
    list = list.filter(c => {
      const combined = `${c.title || ''} ${c.organizer || ''} ${c.venue || ''} ${c.sport || ''} ${c.description || ''}`.toLowerCase();
      if (combined.includes(rawQ) || combined.includes(normalizedQ)) return true;
      return words.length > 0 && words.every(w => combined.includes(w));
    });
  }

  // Sort by created_at desc
  list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return list;
}

function getCompetitionById(id) {
  const list = readJSON(COMPS_FILE, INITIAL_COMPETITIONS);
  return list.find(c => c.id === id) || null;
}

function createCompetition(payload) {
  const list = readJSON(COMPS_FILE, INITIAL_COMPETITIONS);
  const newComp = {
    id: crypto.randomUUID(),
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  list.unshift(newComp);
  writeJSON(COMPS_FILE, list);
  return newComp;
}

function updateCompetition(id, updates) {
  const list = readJSON(COMPS_FILE, INITIAL_COMPETITIONS);
  const index = list.findIndex(c => c.id === id);
  if (index === -1) return null;
  list[index] = {
    ...list[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  writeJSON(COMPS_FILE, list);
  return list[index];
}

function deleteCompetition(id) {
  const list = readJSON(COMPS_FILE, INITIAL_COMPETITIONS);
  const index = list.findIndex(c => c.id === id);
  if (index === -1) return null;
  const [deleted] = list.splice(index, 1);
  writeJSON(COMPS_FILE, list);
  return deleted;
}

function togglePublishCompetition(id) {
  const list = readJSON(COMPS_FILE, INITIAL_COMPETITIONS);
  const comp = list.find(c => c.id === id);
  if (!comp) return null;
  const wasPublished = ['Published', 'Registration Open'].includes(comp.status);
  comp.status = wasPublished ? 'Draft' : 'Published';
  comp.updated_at = new Date().toISOString();
  writeJSON(COMPS_FILE, list);
  return comp;
}

function updateCompetitionStatus(id, status) {
  const list = readJSON(COMPS_FILE, INITIAL_COMPETITIONS);
  const comp = list.find(c => c.id === id);
  if (!comp) return null;
  comp.status = status;
  comp.updated_at = new Date().toISOString();
  writeJSON(COMPS_FILE, list);
  return comp;
}

// ----------------------------------------------------------------
// SPORTS NEWS METHODS
// ----------------------------------------------------------------
function getNews(filter = {}) {
  let list = readJSON(NEWS_FILE, INITIAL_NEWS);
  const { sport, category, status, search, featured, isAdmin } = filter;

  if (!isAdmin) {
    list = list.filter(n => n.status === 'Published');
  }
  if (sport && sport !== 'All') {
    const s = sport.toLowerCase();
    list = list.filter(n => (n.sport || '').toLowerCase().includes(s));
  }
  if (category && category !== 'All') {
    list = list.filter(n => n.category === category);
  }
  if (status && status !== 'All') {
    list = list.filter(n => n.status === status);
  }
  if (featured === 'true' || featured === true) {
    list = list.filter(n => n.featured === true);
  }
  if (search) {
    const rawQ = search.toLowerCase();
    const normalizedQ = rawQ.replace(/troffy/g, 'trophy');
    const words = normalizedQ.split(/\s+/).filter(w => w.length > 1);
    list = list.filter(n => {
      const combined = `${n.title || ''} ${n.short_summary || ''} ${n.sport || ''} ${n.source_name || ''} ${n.full_description || ''}`.toLowerCase();
      if (combined.includes(rawQ) || combined.includes(normalizedQ)) return true;
      return words.length > 0 && words.every(w => combined.includes(w));
    });
  }

  // Sort by published_date desc, created_at desc
  list.sort((a, b) => new Date(b.published_date || b.created_at || 0) - new Date(a.published_date || a.created_at || 0));
  return list;
}

function getNewsById(id) {
  const list = readJSON(NEWS_FILE, INITIAL_NEWS);
  return list.find(n => n.id === id) || null;
}

function createNews(payload) {
  const list = readJSON(NEWS_FILE, INITIAL_NEWS);
  const newItem = {
    id: crypto.randomUUID(),
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  list.unshift(newItem);
  writeJSON(NEWS_FILE, list);
  return newItem;
}

function updateNews(id, updates) {
  const list = readJSON(NEWS_FILE, INITIAL_NEWS);
  const index = list.findIndex(n => n.id === id);
  if (index === -1) return null;
  list[index] = {
    ...list[index],
    ...updates,
    updated_at: new Date().toISOString()
  };
  writeJSON(NEWS_FILE, list);
  return list[index];
}

function deleteNews(id) {
  const list = readJSON(NEWS_FILE, INITIAL_NEWS);
  const index = list.findIndex(n => n.id === id);
  if (index === -1) return null;
  const [deleted] = list.splice(index, 1);
  writeJSON(NEWS_FILE, list);
  return deleted;
}

function togglePublishNews(id) {
  const list = readJSON(NEWS_FILE, INITIAL_NEWS);
  const item = list.find(n => n.id === id);
  if (!item) return null;
  item.status = item.status === 'Published' ? 'Draft' : 'Published';
  item.updated_at = new Date().toISOString();
  writeJSON(NEWS_FILE, list);
  return item;
}

module.exports = {
  // Competitions
  getCompetitions,
  getCompetitionById,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  togglePublishCompetition,
  updateCompetitionStatus,
  // News
  getNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  togglePublishNews
};
