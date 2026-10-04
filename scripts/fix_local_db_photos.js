const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../server/data/local_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Fix Users photos
(db.users || []).forEach(u => {
  if (!u.profile_photo || u.profile_photo.includes('unsplash') || u.profile_photo.includes('incharge-portrait')) {
    u.profile_photo = '/images/default-avatar.png';
  }
});

// Fix Admin Settings photos
(db.admin_settings || []).forEach(s => {
  if (!s.sports_incharge_photo || s.sports_incharge_photo.includes('unsplash')) {
    s.sports_incharge_photo = '/images/default-avatar.png';
  }
  if (!s.profile_photo || s.profile_photo.includes('unsplash')) {
    s.profile_photo = '/images/default-avatar.png';
  }
});

// Ensure gallery has local photo moments
if (!db.gallery || db.gallery.length === 0) {
  db.gallery = [
    {
      id: 'gal_01',
      title: 'Periyar University Zonal Cricket Trophy Victory',
      description: 'GASC Idappadi team lifting the Runners-up Trophy with Physical Directress Dr. R. Anitha.',
      sport_name: 'Cricket',
      category: 'Tournaments',
      image: '/images/sports/cricket.jpg',
      date: '2026-02-15'
    },
    {
      id: 'gal_02',
      title: 'Annual Sports Day 2026 - Track & Field Finals',
      description: 'Students competing in the 100m sprint finals at college campus ground.',
      sport_name: 'Running',
      category: 'Annual Sports Day',
      image: '/images/sports/running.jpg',
      date: '2026-03-10'
    },
    {
      id: 'gal_03',
      title: 'Inter-College Volleyball Championship',
      description: 'Spirited action from the semifinal clash at the synthetic volleyball court.',
      sport_name: 'Volleyball',
      category: 'Tournaments',
      image: '/images/sports/volleyball.jpg',
      date: '2026-02-28'
    },
    {
      id: 'gal_04',
      title: 'State Badminton Zonal Tournament',
      description: 'Men and Women singles championship clash at Idappadi Indoor arena.',
      sport_name: 'Badminton',
      category: 'Tournaments',
      image: '/images/sports/badminton.jpg',
      date: '2026-03-05'
    }
  ];
}

// Update all sports images to prefer .jpg if available
(db.sports || []).forEach(s => {
  if (s.image && s.image.endsWith('.png')) {
    const jpgCandidate = s.image.replace('.png', '.jpg');
    const localPath = path.join(__dirname, '../client/public', jpgCandidate);
    if (fs.existsSync(localPath)) {
      s.image = jpgCandidate;
    }
  }
});

// Update competitions banner_image
(db.competitions || []).forEach(c => {
  if (!c.banner_image || c.banner_image === 'tournament.png' || c.banner_image === '/images/sports/tournament.png') {
    c.banner_image = '/images/sports/tournament.jpg';
  } else if (c.banner_image && c.banner_image.endsWith('.png')) {
    const jpgCandidate = c.banner_image.replace('.png', '.jpg');
    const localPath = path.join(__dirname, '../client/public', jpgCandidate);
    if (fs.existsSync(localPath)) {
      c.banner_image = jpgCandidate;
    }
  }
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('✅ local_db.json photos and gallery updated with clean local assets!');
