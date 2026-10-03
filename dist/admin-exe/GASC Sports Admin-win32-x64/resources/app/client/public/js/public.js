/**
 * Public Website Dynamic Content Loader
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check active user to toggle navbar buttons (Login vs Dashboard)
  updateNavUserButtons();

  // Load dynamic department & incharge settings
  loadPublicSettings();

  // Load appropriate section data based on page
  if (document.getElementById('public-sports-grid')) {
    loadPublicSports();
  }
  if (document.getElementById('public-competitions-list')) {
    loadPublicCompetitions();
  }
  if (document.getElementById('public-achievements-wall')) {
    loadPublicAchievements();
  }
  if (document.getElementById('public-gallery-grid')) {
    loadPublicGallery();
  }
  if (document.getElementById('home-stats-banner')) {
    loadHomeStatsAndHighlights();
  }
});

function updateNavUserButtons() {
  const user = getCurrentUser();
  const navContainer = document.getElementById('nav-auth-container');
  if (!navContainer) return;

  if (user) {
    const dashboardUrl = user.role === 'admin' ? '/admin-dashboard.html' : '/student-dashboard.html';
    const isStudent = user.role === 'student';
    const badgeText = isStudent 
      ? `<span class="badge bg-success bg-opacity-25 text-success border border-success me-2 d-none d-md-inline-block"><i class="bi bi-patch-check-fill me-1"></i> GASC Student: ${user.registerNumber || user.name}</span>`
      : `<span class="badge bg-primary bg-opacity-25 text-primary border border-primary me-2 d-none d-md-inline-block"><i class="bi bi-shield-check me-1"></i> GASC Sports Dept</span>`;

    navContainer.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        ${badgeText}
        <a href="${dashboardUrl}" class="btn btn-sports-accent btn-sm">
          <i class="bi bi-speedometer2 me-1"></i> ${user.role === 'admin' ? 'Admin Portal' : 'My Sports Portal'}
        </a>
        <button onclick="logout()" class="btn btn-outline-danger btn-sm" title="Logout">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    `;
  }
}

// Load Home Page Live Stats & Highlights
async function loadHomeStatsAndHighlights() {
  try {
    const [sportsRes, compRes, achieveRes] = await Promise.all([
      apiRequest('/sports'),
      apiRequest('/competitions?status=Registration Open'),
      apiRequest('/achievements?featured=true')
    ]);

    // Update highlights
    const totalSportsEl = document.getElementById('stat-total-sports');
    if (totalSportsEl && sportsRes.sports) totalSportsEl.innerText = sportsRes.sports.length;

    const totalCompsEl = document.getElementById('stat-total-competitions');
    if (totalCompsEl && compRes.competitions) totalCompsEl.innerText = compRes.competitions.length;

    const totalMedalsEl = document.getElementById('stat-total-medals');
    if (totalMedalsEl && achieveRes.achievements) totalMedalsEl.innerText = achieveRes.achievements.length;

    // Load top sports on home
    const topSportsGrid = document.getElementById('home-top-sports');
    if (topSportsGrid && sportsRes.sports) {
      topSportsGrid.innerHTML = sportsRes.sports.slice(0, 4).map(sport => `
        <div class="col-md-6 col-lg-3">
          <div class="glass-card h-100 p-3 text-center">
            <div class="stat-icon mx-auto mb-3 bg-white text-primary">
              <i class="bi ${sport.icon || 'bi-trophy'} text-success"></i>
            </div>
            <h5 class="fw-bold mb-1">${sport.name}</h5>
            <span class="badge badge-glass-primary mb-2">${sport.category}</span>
            <p class="text-secondary small line-clamp-2">${sport.description || 'Inter-collegiate training and competitions.'}</p>
            <div class="text-muted small mt-auto pt-2 border-top">
              <i class="bi bi-person-badge me-1"></i> ${sport.registeredPlayersCount || 0} Registered Players
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading home stats:', err);
  }
}

// Load Sports Grid
async function loadPublicSports() {
  const container = document.getElementById('public-sports-grid');
  try {
    const res = await apiRequest('/sports');
    if (!res.sports || res.sports.length === 0) {
      container.innerHTML = `<div class="col-12 empty-state"><i class="bi bi-trophy empty-state-icon"></i><h5>No sports listed yet.</h5></div>`;
      return;
    }

    container.innerHTML = res.sports.map(s => `
      <div class="col-md-6 col-lg-4">
        <div class="glass-card h-100">
          <div style="height: 190px; overflow: hidden; position: relative;">
            <img src="${window.getSportImage(s.name, s.image)}" alt="${s.name}" class="w-100 h-100 object-fit-cover" onerror="this.src=window.getSportImage('${s.name}')">
            <span class="position-absolute top-0 end-0 m-3 badge bg-dark bg-opacity-75 backdrop-blur">${s.indoorOutdoor}</span>
          </div>
          <div class="p-4 d-flex flex-column">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h4 class="fw-bold mb-0">${s.name}</h4>
              <span class="badge badge-glass-success">${s.category}</span>
            </div>
            <p class="text-secondary small mb-3">${s.description}</p>
            <div class="bg-light bg-opacity-50 p-2 rounded mb-3 small">
              <strong>Coach / Incharge:</strong> ${s.coach || 'Sports Incharge'}<br>
              <strong>Equipment:</strong> ${(s.equipmentRequired || []).slice(0, 3).join(', ')}
            </div>
            <div class="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
              <span class="text-muted small"><i class="bi bi-people-fill text-success me-1"></i> ${s.playerCount} Players Per Side</span>
              <a href="/login.html" class="btn btn-sm btn-sports-primary">Join Sport</a>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load sports disciplines.</div>`;
  }
}

// Load Competitions
async function loadPublicCompetitions() {
  const container = document.getElementById('public-competitions-list');
  try {
    const res = await apiRequest('/competitions');
    if (!res.competitions || res.competitions.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x empty-state-icon"></i><h5>No competitions scheduled currently.</h5></div>`;
      return;
    }

    container.innerHTML = res.competitions.map(c => `
      <div class="glass-card mb-4 p-4">
        <div class="row align-items-center">
          <div class="col-lg-8">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge badge-glass-primary">${c.sportName}</span>
              <span class="badge badge-glass-success">${c.type}</span>
              <span class="badge bg-secondary">${c.level} Level</span>
            </div>
            <h4 class="fw-bold text-dark mb-2">${c.name}</h4>
            <div class="text-secondary small mb-3">
              <span class="me-3"><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${c.venue}</span>
              <span class="me-3"><i class="bi bi-calendar-event-fill text-primary me-1"></i> ${formatDate(c.date)}</span>
              <span><i class="bi bi-clock-fill text-warning me-1"></i> ${c.startTime} - ${c.endTime}</span>
            </div>
            <p class="text-muted small mb-0">${c.description || 'Open for regular undergraduate and postgraduate collegiate athletes.'}</p>
          </div>
          <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
            <div class="small text-muted mb-2">
              <strong>Registration Deadline:</strong><br>
              <span class="text-danger fw-bold">${formatDate(c.registrationEnd)}</span>
            </div>
            <a href="/login.html" class="btn btn-sports-accent">
              <i class="bi bi-pencil-square me-1"></i> Register as Player
            </a>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-center text-danger py-4">Failed to load competitions.</div>`;
  }
}

// Load Achievements Wall of Fame
async function loadPublicAchievements() {
  const container = document.getElementById('public-achievements-wall');
  try {
    const res = await apiRequest('/achievements');
    if (!res.achievements || res.achievements.length === 0) {
      container.innerHTML = `<div class="col-12 empty-state"><i class="bi bi-award empty-state-icon"></i><h5>No achievements recorded yet.</h5></div>`;
      return;
    }

    container.innerHTML = res.achievements.map(a => {
      let medalBadge = 'badge-gold';
      let medalIcon = '🥇';
      if (a.medal === 'Silver') { medalBadge = 'badge-silver'; medalIcon = '🥈'; }
      if (a.medal === 'Bronze') { medalBadge = 'badge-bronze'; medalIcon = '🥉'; }

      return `
        <div class="col-md-6 col-lg-4">
          <div class="glass-card h-100 p-4 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <span class="${medalBadge} fs-6">${medalIcon} ${a.medal} Medal</span>
              <span class="text-muted small">${a.year}</span>
            </div>
            <h5 class="fw-bold mb-2">${a.title}</h5>
            <div class="mb-3 text-secondary small">
              <strong>Athlete:</strong> ${a.studentName || 'Student'} (${a.department || 'GASC'})<br>
              <strong>Discipline:</strong> ${a.sportName || 'General'}<br>
              <strong>Tournament:</strong> ${a.competitionName || 'Collegiate Tournament'}
            </div>
            <p class="text-muted small mt-auto">${a.description || 'Proud achievement bringing honour to Government Arts and Science College, Idappadi.'}</p>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load achievements.</div>`;
  }
}

// Load Gallery
async function loadPublicGallery() {
  const container = document.getElementById('public-gallery-grid');
  try {
    const res = await apiRequest('/gallery');
    if (!res.gallery || res.gallery.length === 0) {
      container.innerHTML = `<div class="col-12 empty-state"><i class="bi bi-images empty-state-icon"></i><h5>No photos uploaded yet.</h5></div>`;
      return;
    }

    container.innerHTML = res.gallery.map(g => `
      <div class="col-md-6 col-lg-4">
        <div class="glass-card h-100 overflow-hidden">
          <img src="${g.image}" alt="${g.title}" class="w-100" style="height: 220px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&q=80'">
          <div class="p-3">
            <span class="badge badge-glass-primary mb-2">${g.category}</span>
            <h6 class="fw-bold mb-1">${g.title}</h6>
            <p class="text-secondary small mb-0">${g.description || ''}</p>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load gallery.</div>`;
  }
}

// Dynamically load and sync department and incharge settings
async function loadPublicSettings() {
  try {
    const res = await apiRequest('/settings');
    if (!res || !res.settings) return;
    const s = res.settings;

    // Incharge Name elements
    document.querySelectorAll('.dyn-incharge-name').forEach(el => {
      if (s.sportsInchargeName) el.innerText = s.sportsInchargeName;
    });

    // Incharge Role elements
    document.querySelectorAll('.dyn-incharge-role').forEach(el => {
      if (s.sportsInchargeRole) el.innerText = s.sportsInchargeRole;
    });

    // Incharge Photo elements
    document.querySelectorAll('.dyn-incharge-photo').forEach(el => {
      const p = s.sportsInchargePhoto || s.profilePhoto;
      if (p) el.src = p;
    });

    // College Name elements
    document.querySelectorAll('.dyn-college-name').forEach(el => {
      if (s.collegeName) el.innerText = s.collegeName;
    });

    // Department Name elements
    document.querySelectorAll('.dyn-dept-name').forEach(el => {
      if (s.departmentName) el.innerText = s.departmentName;
    });

    // Phone elements
    document.querySelectorAll('.dyn-phone').forEach(el => {
      if (s.phone) {
        el.innerText = s.phone;
        if (el.tagName === 'A') el.href = `tel:${s.phone.replace(/[^+\d]/g, '')}`;
      }
    });

    // Email elements
    document.querySelectorAll('.dyn-email').forEach(el => {
      if (s.email) {
        el.innerText = s.email;
        if (el.tagName === 'A') el.href = `mailto:${s.email}`;
      }
    });

    // Address elements
    document.querySelectorAll('.dyn-address').forEach(el => {
      if (s.address) el.innerText = s.address;
    });

    // Office hours elements
    document.querySelectorAll('.dyn-office-hours').forEach(el => {
      if (s.officeHours) el.innerText = s.officeHours;
    });
  } catch (err) {
    console.warn('Could not load public settings:', err);
  }
}
