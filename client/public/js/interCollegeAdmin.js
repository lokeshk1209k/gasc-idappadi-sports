/**
 * GASC Idappadi Smart Sports Management System
 * Admin Portal — Inter-College Championships & QR Management Module
 */

let extCompetitionsCache = [];
let extRegistrationsCache = [];
let extTeamsCache = [];
let extPlayersCache = [];
let currentActiveExtTab = 'competitions';
let selectedExtCompForQr = null;
let selectedExtRegForAction = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  // Fetch local server network info for LAN Wi-Fi QR mode
  fetchServerNetworkInfo();

  // Listen for view switches to inter-college
  const interCollegeNav = document.querySelector('.admin-nav-item[data-view="inter-college"]');
  if (interCollegeNav) {
    interCollegeNav.addEventListener('click', () => {
      loadAdminInterCollegeData();
    });
  }
});

// ── QR Portal URL & Network Helpers ──
let detectedServerLanIp = '10.164.116.21';

async function fetchServerNetworkInfo() {
  try {
    const res = await apiRequest('/inter-college/network-info', 'GET');
    if (res && res.localIp) {
      detectedServerLanIp = res.localIp;
    }
  } catch (e) {
    // Keep fallback 10.164.116.21
  }
}

function getPublicPortalBaseUrl() {
  const custom = localStorage.getItem('gasc_inter_college_portal_base_url');
  if (custom && custom.trim() !== '') {
    return custom.trim().replace(/\/+$/, '');
  }
  if (window.GASC_CONFIG && window.GASC_CONFIG.PUBLIC_STUDENT_PORTAL_URL) {
    return window.GASC_CONFIG.PUBLIC_STUDENT_PORTAL_URL.replace(/\/+$/, '');
  }
  const origin = window.location.origin;
  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return origin.replace(/\/+$/, '');
  }
  return 'https://gasc-student-portal.vercel.app';
}

function getPublicRegistrationUrl(token) {
  const base = getPublicPortalBaseUrl();
  return `${base}/inter-college/register/${token}`;
}

function getQrImageUrl(token, size = 300) {
  const base = getPublicPortalBaseUrl();
  return `/api/inter-college/qr/${token}?format=png&size=${size}&baseUrl=${encodeURIComponent(base)}`;
}

function onQrPortalDomainChange(value) {
  const badge = document.getElementById('qr-target-mode-badge');
  const customContainer = document.getElementById('qr-custom-domain-container');
  const customInput = document.getElementById('qr-custom-domain-input');

  if (value === 'LOCAL_LAN') {
    if (customContainer) customContainer.classList.add('d-none');
    const lanUrl = `http://${detectedServerLanIp}:5000`;
    localStorage.setItem('gasc_inter_college_portal_base_url', lanUrl);
    if (badge) {
      badge.textContent = `CAMPUS WI-FI (${detectedServerLanIp})`;
      badge.className = 'badge bg-warning text-dark';
    }
    refreshActiveQrModalDisplay();
    notifyUser(`QR target updated to Campus Wi-Fi (${lanUrl}). Both phone and PC must be on the same Wi-Fi!`, 'info', 'Campus Wi-Fi Mode');
  } else if (value === 'CUSTOM') {
    if (customContainer) customContainer.classList.remove('d-none');
    if (customInput) {
      customInput.value = localStorage.getItem('gasc_inter_college_portal_base_url') || '';
      customInput.focus();
    }
    if (badge) {
      badge.textContent = 'CUSTOM DOMAIN';
      badge.className = 'badge bg-info text-dark';
    }
  } else {
    // Public Cloud URL
    if (customContainer) customContainer.classList.add('d-none');
    localStorage.setItem('gasc_inter_college_portal_base_url', value);
    if (badge) {
      badge.textContent = 'PUBLIC CLOUD (PHONE READY)';
      badge.className = 'badge bg-success text-white';
    }
    refreshActiveQrModalDisplay();
    notifyUser(`QR target set to Live Website: ${value}. Mobile phones can scan anywhere!`, 'success', 'Live Portal Selected');
  }
}

function saveCustomQrDomain() {
  const customInput = document.getElementById('qr-custom-domain-input');
  let val = customInput ? customInput.value.trim() : '';
  if (!val) {
    notifyUser('Please enter a valid website address or domain.', 'warning');
    return;
  }
  if (!val.startsWith('http://') && !val.startsWith('https://')) {
    val = 'https://' + val;
  }
  val = val.replace(/\/+$/, '');
  localStorage.setItem('gasc_inter_college_portal_base_url', val);
  const badge = document.getElementById('qr-target-mode-badge');
  if (badge) {
    badge.textContent = 'CUSTOM: ' + val;
    badge.className = 'badge bg-info text-dark';
  }
  refreshActiveQrModalDisplay();
  notifyUser('Custom QR URL saved: ' + val, 'success');
}

function refreshActiveQrModalDisplay() {
  if (!selectedExtCompForQr) return;
  const token = selectedExtCompForQr.registration_token || selectedExtCompForQr.registrationToken || selectedExtCompForQr.id;
  const regUrl = getPublicRegistrationUrl(token);
  const qrImgSrc = getQrImageUrl(token, 300);

  const qrImg = document.getElementById('qr-modal-image');
  if (qrImg) qrImg.src = qrImgSrc;

  const linkInput = document.getElementById('qr-modal-link-input');
  if (linkInput) linkInput.value = regUrl;

  const posterImg = document.getElementById('poster-qr-image');
  if (posterImg) posterImg.src = getQrImageUrl(token, 300);

  const posterLink = document.getElementById('poster-link-text');
  if (posterLink) posterLink.innerText = regUrl;
}

// Expose globally for onclick handlers
window.onQrPortalDomainChange = onQrPortalDomainChange;
window.saveCustomQrDomain = saveCustomQrDomain;
window.getPublicPortalBaseUrl = getPublicPortalBaseUrl;
window.getPublicRegistrationUrl = getPublicRegistrationUrl;
window.getQrImageUrl = getQrImageUrl;
window.refreshActiveQrModalDisplay = refreshActiveQrModalDisplay;

// Helper for UI Toast notifications (falls back to existing showToast if present)
function notifyUser(msg, type = 'info', title = 'Notice') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type, title);
  } else {
    alert(`${title}: ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 1. TOP TAB SWITCHER
// ─────────────────────────────────────────────────────────────
function switchExtTab(tabName) {
  currentActiveExtTab = tabName;

  // Update nav-pills active state
  const tabButtons = document.querySelectorAll('#inter-college-tabs .nav-link');
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('onclick')?.includes(`'${tabName}'`)) {
      btn.classList.add('active');
    }
  });

  // Switch visible sub-tab pane
  const panes = document.querySelectorAll('.ext-tab-pane');
  panes.forEach(p => p.classList.add('d-none'));

  const targetPane = document.getElementById(`ext-tab-pane-${tabName}`);
  if (targetPane) targetPane.classList.remove('d-none');

  // Trigger sub-tab loader
  if (tabName === 'competitions') renderExtCompetitionsCards();
  else if (tabName === 'registrations') renderExtRegistrationsTable();
  else if (tabName === 'teams') renderExtTeamsCards();
  else if (tabName === 'players') renderExtPlayersTable();
  else if (tabName === 'approvals') renderExtApprovalsTable();
  else if (tabName === 'analytics') renderExtAnalytics();
  else if (tabName === 'reports') initExtReportsView();
}

// ─────────────────────────────────────────────────────────────
// 2. MAIN DATA LOADER & KPI SYNC
// ─────────────────────────────────────────────────────────────
async function loadAdminInterCollegeData() {
  try {
    let comps = [];
    let regs = [];

    // Try API endpoint for inter-college all-in-one data
    try {
      const res = await apiRequest('/inter-college/admin/all');
      if (res && res.success) {
        comps = res.competitions || [];
        regs = res.registrations || [];
      }
    } catch (e) {
      console.warn('Fallback: Fetching competitions & registrations separately:', e.message);
      // Fallback: fetch separately
      try {
        const compRes = await apiRequest('/competitions');
        const allComps = compRes.competitions || compRes.data || [];
        comps = allComps.filter(c => 
          c.participation_type === 'INTER_COLLEGE' || 
          c.participationType === 'INTER_COLLEGE' ||
          c.type === 'Inter-College'
        );
      } catch (err) {}

      try {
        const regRes = await apiRequest('/inter-college/admin/registrations');
        if (regRes && regRes.data) regs = regRes.data;
      } catch (err) {}
    }

    extCompetitionsCache = comps;
    extRegistrationsCache = regs;

    // Flatten teams & players caches from registrations
    extTeamsCache = regs.filter(r => (r.registration_type || r.registrationType) === 'TEAM');
    
    const playersList = [];
    regs.forEach(r => {
      const regPlayers = r.players || [];
      if (regPlayers.length > 0) {
        regPlayers.forEach(p => {
          playersList.push({
            ...p,
            college_name: r.college_name,
            registration_id: r.registration_id,
            sport_name: r.sport_name || (r.competition && r.competition.name),
            status: r.status
          });
        });
      } else {
        // Individual registration athlete
        playersList.push({
          player_name: r.player_name || r.contact_person || r.team_name,
          college_register_number: r.college_register_number || r.college_roll_number || '-',
          college_name: r.college_name,
          department: r.department || '-',
          year: r.year || '-',
          gender: r.gender,
          player_role: 'Single Athlete',
          registration_id: r.registration_id,
          sport_name: r.sport_name || (r.competition && r.competition.name),
          status: r.status
        });
      }
    });
    extPlayersCache = playersList;

    // Update KPI badges
    const pendingCount = regs.filter(r => (r.status || '').toUpperCase() === 'PENDING').length;
    
    const navBadge = document.getElementById('nav-ext-pending-badge');
    if (navBadge) {
      navBadge.innerText = pendingCount;
      navBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }

    const kpiComps = document.getElementById('ext-kpi-comps-count');
    if (kpiComps) kpiComps.innerText = comps.length;

    const kpiRegs = document.getElementById('ext-kpi-regs-count');
    if (kpiRegs) kpiRegs.innerText = regs.length;

    const kpiTeams = document.getElementById('ext-kpi-teams-count');
    if (kpiTeams) kpiTeams.innerText = extTeamsCache.length;

    const kpiPlayers = document.getElementById('ext-kpi-players-count');
    if (kpiPlayers) kpiPlayers.innerText = extPlayersCache.length;

    const kpiPending = document.getElementById('ext-kpi-pending-count');
    if (kpiPending) kpiPending.innerText = pendingCount;

    // Populate competition filter dropdowns
    populateCompFilterOptions();

    // Render current active sub-view
    switchExtTab(currentActiveExtTab);
  } catch (err) {
    console.error('Error loading Inter-College data:', err);
    notifyUser('Notice loading Inter-College data: ' + err.message, 'warning');
  }
}

function populateCompFilterOptions() {
  const compSelects = [
    document.getElementById('ext-reg-filter-comp'),
    document.getElementById('report-ext-comp')
  ];

  compSelects.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    let html = '<option value="All">All Competitions</option>';
    extCompetitionsCache.forEach(c => {
      const cId = c.id || c._id;
      const cName = c.name || c.tournamentName || 'Inter-College Competition';
      html += `<option value="${cId}">${cName}</option>`;
    });
    sel.innerHTML = html;
    if (current) sel.value = current;
  });
}

// ─────────────────────────────────────────────────────────────
// 3. SUB-TAB 1: COMPETITIONS & QR CODES
// ─────────────────────────────────────────────────────────────
function renderExtCompetitionsCards() {
  const container = document.getElementById('ext-competitions-cards-container');
  if (!container) return;

  if (extCompetitionsCache.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="p-4 glass-card d-inline-block text-center" style="max-width: 500px;">
          <i class="bi bi-qr-code text-warning fs-1 d-block mb-3"></i>
          <h5 class="fw-bold text-dark">No Inter-College Competitions Created Yet</h5>
          <p class="text-secondary small mb-3">
            Create an Inter-College Competition to automatically generate a unique QR code for external college registrations.
          </p>
          <button class="btn btn-warning fw-bold text-dark rounded-pill px-4" onclick="openCreateInterCollegeModal()">
            <i class="bi bi-plus-circle me-1"></i> Create First Inter-College Competition
          </button>
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  extCompetitionsCache.forEach(c => {
    const compId = c.id || c._id;
    const compName = c.name || c.tournamentName || 'GASC Inter-College Championship';
    const sportName = c.sportName || c.sport_name || (c.name ? c.name.split('-')[0].trim() : 'Sports');
    const compMode = (c.competition_mode || c.competitionMode || c.type || 'TEAM').toUpperCase();
    const isTeam = compMode.includes('TEAM');
    const token = c.registration_token || c.registrationToken || compId;
    const regUrl = getPublicRegistrationUrl(token);
    const qrThumbSrc = getQrImageUrl(token, 150);
    const status = (c.registration_status || c.registrationStatus || c.status || 'OPEN').toUpperCase();
    const isOpen = status.includes('OPEN') || status.includes('PUBLISHED');
    const compDate = c.date ? new Date(c.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBA';
    const deadline = c.registration_deadline || c.registrationEnd || c.date;
    const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBA';
    const venue = c.venue || 'GASC Idappadi Ground';

    // Count registrations for this competition
    const regsForComp = extRegistrationsCache.filter(r => String(r.competition_id) === String(compId));

    html += `
      <div class="col-xl-6 col-lg-12">
        <div class="glass-card p-3.5 h-100 d-flex flex-column justify-content-between border border-warning border-opacity-30 shadow-sm">
          <div>
            <!-- Card Header -->
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div>
                <span class="badge ${isTeam ? 'bg-primary' : 'bg-info'} text-white fw-bold me-1 text-xs">
                  <i class="bi ${isTeam ? 'bi-shield-shaded' : 'bi-person-fill'} me-1"></i>${compMode}
                </span>
                <span class="badge bg-warning text-dark fw-bold text-xs">
                  <i class="bi bi-trophy-fill me-1"></i>${sportName}
                </span>
              </div>
              <span class="badge ${isOpen ? 'bg-success' : 'bg-secondary'} px-2.5 py-1 text-xs fw-bold">
                ${isOpen ? '<i class="bi bi-check-circle-fill me-1"></i>REGISTRATION OPEN' : '<i class="bi bi-pause-circle me-1"></i>REGISTRATION CLOSED'}
              </span>
            </div>

            <!-- Title & Info -->
            <h5 class="fw-bold text-dark mb-1">${compName}</h5>
            <div class="text-secondary small mb-3">
              <i class="bi bi-geo-alt-fill text-danger me-1"></i>${venue} &bull; 
              <i class="bi bi-calendar-event text-primary me-1"></i>${compDate}
            </div>

            <!-- QR Code & Quick Meta Grid -->
            <div class="row g-3 align-items-center mb-3 p-2.5 rounded-3 bg-light bg-opacity-75 border">
              <div class="col-sm-4 text-center">
                <div class="bg-white p-1.5 rounded-3 border d-inline-block shadow-sm">
                  <img src="${qrThumbSrc}" alt="Registration QR" class="img-fluid" style="width: 100px; height: 100px; object-fit: contain;" onerror="this.onerror=null; this.src='images/college-logo.png';">
                </div>
                <div class="mt-1">
                  <span class="badge bg-dark bg-opacity-75 text-white font-monospace text-xs" style="font-size: 0.65rem;">
                    ${token.substring(0, 10)}...
                  </span>
                </div>
              </div>
              <div class="col-sm-8 small text-dark">
                <div class="row g-1">
                  <div class="col-5 text-muted">Reg. Deadline:</div>
                  <div class="col-7 fw-bold text-danger">${deadlineStr}</div>
                  <div class="col-5 text-muted">Registrations:</div>
                  <div class="col-7 fw-bold text-primary">${regsForComp.length} External Applications</div>
                  <div class="col-5 text-muted">Squad Rules:</div>
                  <div class="col-7">${isTeam ? (c.required_players || 11) + ' Main + ' + (c.substitutes || 4) + ' Subs' : 'Single Athlete'}</div>
                  <div class="col-12 mt-1">
                    <div class="input-group input-group-sm">
                      <input type="text" class="form-control font-monospace" style="font-size:0.75rem;" value="${regUrl}" readonly>
                      <button class="btn btn-outline-secondary btn-sm" type="button" onclick="copyQrRegistrationLink('${token}')" title="Copy Link">
                        <i class="bi bi-clipboard"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="d-flex flex-wrap gap-2 pt-2 border-top border-secondary border-opacity-25 mt-2">
            <button class="btn btn-sm btn-primary rounded-pill px-3 fw-bold flex-grow-1" onclick="openInterCollegeQrModalById('${compId}')">
              <i class="bi bi-qr-code-scan me-1"></i> Preview & Download QR
            </button>
            <button class="btn btn-sm btn-warning text-dark rounded-pill px-3 fw-bold" onclick="openInterCollegePosterModalById('${compId}')">
              <i class="bi bi-file-earmark-richtext-fill me-1"></i> A4 Poster
            </button>
            <button class="btn btn-sm ${isOpen ? 'btn-outline-danger' : 'btn-outline-success'} rounded-pill px-3" onclick="toggleCompetitionRegistrationState('${compId}', '${status}')">
              ${isOpen ? '<i class="bi bi-pause-circle me-1"></i> Disable' : '<i class="bi bi-play-circle me-1"></i> Enable'}
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// 4. SUB-TAB 2: ALL REGISTRATIONS TABLE
// ─────────────────────────────────────────────────────────────
function renderExtRegistrationsTable() {
  const tbody = document.getElementById('ext-registrations-tbody');
  const countEl = document.getElementById('ext-reg-table-count');
  if (!tbody) return;

  const search = (document.getElementById('ext-reg-search')?.value || '').toLowerCase().trim();
  const compFilter = document.getElementById('ext-reg-filter-comp')?.value || 'All';
  const statusFilter = document.getElementById('ext-reg-filter-status')?.value || 'All';
  const genderFilter = document.getElementById('ext-reg-filter-gender')?.value || 'All';

  let list = extRegistrationsCache;

  if (compFilter !== 'All') {
    list = list.filter(r => String(r.competition_id) === String(compFilter));
  }
  if (statusFilter !== 'All') {
    list = list.filter(r => (r.status || '').toUpperCase() === statusFilter.toUpperCase());
  }
  if (genderFilter !== 'All') {
    list = list.filter(r => (r.gender || '').toLowerCase() === genderFilter.toLowerCase());
  }
  if (search) {
    list = list.filter(r => 
      (r.registration_id || '').toLowerCase().includes(search) ||
      (r.college_name || '').toLowerCase().includes(search) ||
      (r.team_name || '').toLowerCase().includes(search) ||
      (r.participant_email || '').toLowerCase().includes(search)
    );
  }

  if (countEl) countEl.innerText = `Showing ${list.length} entries`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-muted">
          <i class="bi bi-inbox fs-3 d-block mb-1"></i>
          No external registrations found matching selected filters.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  list.forEach(r => {
    const regId = r.registration_id || `GASC-IC-${r.id}`;
    const compName = (r.competition && r.competition.name) || r.competition_name || 'Inter-College Championship';
    const sport = r.sport_name || (r.competition && r.competition.sportName) || 'Sports';
    const college = r.college_name || '-';
    const isTeam = (r.registration_type || r.registrationType) === 'TEAM';
    const participantName = isTeam ? (r.team_name || 'College Squad') : (r.player_name || r.contact_person || 'Athlete');
    const status = (r.status || 'PENDING').toUpperCase();
    const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    let badgeClass = 'bg-warning text-dark';
    if (status === 'APPROVED') badgeClass = 'bg-success text-white';
    else if (status === 'REJECTED') badgeClass = 'bg-danger text-white';
    else if (status === 'CORRECTION_REQUIRED') badgeClass = 'bg-info text-dark';

    html += `
      <tr>
        <td class="font-monospace fw-bold text-primary">${regId}</td>
        <td>
          <div class="fw-bold text-dark">${compName}</div>
          <small class="text-muted"><i class="bi bi-trophy-fill text-warning me-1"></i>${sport}</small>
        </td>
        <td>
          <div class="fw-bold">${college}</div>
          <small class="text-muted">${r.district || ''} ${r.state ? '(' + r.state + ')' : ''}</small>
        </td>
        <td>
          <span class="badge ${isTeam ? 'bg-primary' : 'bg-info'} me-1">${isTeam ? 'Team' : 'Individual'}</span>
          <strong>${participantName}</strong>
        </td>
        <td>${r.gender || 'Boys'}</td>
        <td>
          <div class="small">${r.participant_email || '-'}</div>
          <small class="text-muted">${r.participant_phone || '-'}</small>
        </td>
        <td class="small text-muted">${dateStr}</td>
        <td><span class="badge ${badgeClass} px-2 py-1">${status}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-0.5" onclick="openExtRegDetails('${r.id}')" title="View Full Details">
            <i class="bi bi-eye-fill me-1"></i> View
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function filterAdminExtRegistrations() {
  renderExtRegistrationsTable();
}

// ─────────────────────────────────────────────────────────────
// 5. SUB-TAB 3: EXTERNAL TEAMS CARDS
// ─────────────────────────────────────────────────────────────
function renderExtTeamsCards() {
  const container = document.getElementById('ext-teams-cards-container');
  if (!container) return;

  if (extTeamsCache.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5 text-muted">
        <i class="bi bi-shield-x fs-1 d-block mb-2"></i>
        <h5>No External Teams Registered Yet</h5>
        <p class="small text-secondary">Team registrations received via QR code will appear here with complete squad rosters.</p>
      </div>
    `;
    return;
  }

  let html = '';
  extTeamsCache.forEach(t => {
    const teamName = t.team_name || `${t.college_name} Squad`;
    const college = t.college_name || '-';
    const compName = (t.competition && t.competition.name) || t.competition_name || 'Inter-College Meet';
    const sport = t.sport_name || (t.competition && t.competition.sportName) || 'Sports';
    const status = (t.status || 'PENDING').toUpperCase();
    const playersCount = (t.players && t.players.length) || 0;
    const coach = t.coach_name || '-';
    const manager = t.manager_name || '-';

    let badgeClass = 'bg-warning text-dark';
    if (status === 'APPROVED') badgeClass = 'bg-success text-white';
    else if (status === 'REJECTED') badgeClass = 'bg-danger text-white';

    html += `
      <div class="col-lg-4 col-md-6">
        <div class="glass-card p-3 h-100 d-flex flex-column justify-content-between border border-primary border-opacity-25 shadow-sm">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="badge bg-primary text-white"><i class="bi bi-trophy-fill me-1"></i>${sport}</span>
              <span class="badge ${badgeClass}">${status}</span>
            </div>
            <h6 class="fw-bold text-dark mb-1"><i class="bi bi-shield-shaded text-primary me-1"></i>${teamName}</h6>
            <div class="text-secondary small fw-bold mb-2"><i class="bi bi-building me-1"></i>${college}</div>

            <div class="p-2.5 rounded-3 bg-light border small mb-3">
              <div class="row g-1 text-dark">
                <div class="col-5 text-muted">Tournament:</div>
                <div class="col-7 fw-bold">${compName}</div>
                <div class="col-5 text-muted">Category:</div>
                <div class="col-7">${t.gender || 'Boys'}</div>
                <div class="col-5 text-muted">Squad Size:</div>
                <div class="col-7 fw-bold text-primary">${playersCount} Registered Players</div>
                <div class="col-5 text-muted">Coach / Incharge:</div>
                <div class="col-7">${coach}</div>
                <div class="col-5 text-muted">Manager:</div>
                <div class="col-7">${manager}</div>
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center pt-2 border-top">
            <span class="badge bg-secondary font-monospace">${t.registration_id || t.id}</span>
            <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="openExtRegDetails('${t.id}')">
              <i class="bi bi-people-fill me-1"></i> View Squad
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// 6. SUB-TAB 4: EXTERNAL PLAYERS TABLE
// ─────────────────────────────────────────────────────────────
function renderExtPlayersTable() {
  const tbody = document.getElementById('ext-players-tbody');
  if (!tbody) return;

  const search = (document.getElementById('ext-players-search')?.value || '').toLowerCase().trim();

  let list = extPlayersCache;
  if (search) {
    list = list.filter(p => 
      (p.player_name || '').toLowerCase().includes(search) ||
      (p.college_register_number || '').toLowerCase().includes(search) ||
      (p.college_name || '').toLowerCase().includes(search) ||
      (p.department || '').toLowerCase().includes(search)
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-muted">
          No external players found.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  list.forEach((p, idx) => {
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td class="fw-bold text-dark">${p.player_name || '-'}</td>
        <td class="font-monospace text-primary">${p.college_register_number || '-'}</td>
        <td>${p.college_name || '-'}</td>
        <td>${p.department || '-'} ${p.year ? '(' + p.year + ')' : ''}</td>
        <td><span class="badge bg-light text-dark border">${p.sport_name || 'Sports'}</span></td>
        <td>${p.player_role || 'Athlete'}</td>
        <td class="font-monospace small text-muted">${p.registration_id || '-'}</td>
        <td>
          <span class="badge ${(p.status || '').toUpperCase() === 'APPROVED' ? 'bg-success' : 'bg-warning text-dark'}">
            ${p.status || 'PENDING'}
          </span>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function filterAdminExtPlayers() {
  renderExtPlayersTable();
}

// ─────────────────────────────────────────────────────────────
// 7. SUB-TAB 5: APPROVAL QUEUE
// ─────────────────────────────────────────────────────────────
function renderExtApprovalsTable() {
  const tbody = document.getElementById('ext-approvals-tbody');
  if (!tbody) return;

  const pending = extRegistrationsCache.filter(r => (r.status || '').toUpperCase() === 'PENDING');

  if (pending.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-muted">
          <i class="bi bi-check2-all fs-1 text-success d-block mb-2"></i>
          <h5>All Caught Up!</h5>
          <p class="small text-secondary">There are currently no external applications pending review.</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  pending.forEach(r => {
    const isTeam = (r.registration_type || r.registrationType) === 'TEAM';
    const compName = (r.competition && r.competition.name) || r.competition_name || 'Inter-College Championship';
    const sport = r.sport_name || (r.competition && r.competition.sportName) || 'Sports';
    const participant = isTeam ? (r.team_name || 'College Squad') : (r.player_name || r.contact_person || 'Athlete');
    const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    html += `
      <tr>
        <td class="font-monospace fw-bold text-primary">${r.registration_id || r.id}</td>
        <td>
          <div class="fw-bold">${r.college_name || '-'}</div>
          <small class="text-muted">${r.district || ''}, ${r.state || ''}</small>
        </td>
        <td>
          <div class="fw-bold">${compName}</div>
          <small class="text-muted"><i class="bi bi-trophy-fill text-warning me-1"></i>${sport} (${r.gender || 'Boys'})</small>
        </td>
        <td>
          <span class="badge ${isTeam ? 'bg-primary' : 'bg-info'} me-1">${isTeam ? 'Team' : 'Individual'}</span>
          <strong>${participant}</strong>
        </td>
        <td>
          <div class="small">${r.participant_email || '-'}</div>
          <small class="text-muted">${r.participant_phone || '-'}</small>
        </td>
        <td class="small text-muted">${dateStr}</td>
        <td class="text-center">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="openExtRegDetails('${r.id}')" title="Review Full Application">
              <i class="bi bi-eye-fill"></i>
            </button>
            <button class="btn btn-success fw-bold text-white px-2.5" onclick="quickApproveExtReg('${r.id}')" title="Approve Registration">
              <i class="bi bi-check-lg me-1"></i> Approve
            </button>
            <button class="btn btn-warning text-dark fw-bold" onclick="openCorrectionModal('${r.id}')" title="Request Correction">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-danger" onclick="openRejectModal('${r.id}')" title="Reject Registration">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// 8. SUB-TAB 6: ANALYTICS VIEW
// ─────────────────────────────────────────────────────────────
function renderExtAnalytics() {
  // Update stat cards
  const compsCount = extCompetitionsCache.length;
  const collegesSet = new Set(extRegistrationsCache.map(r => (r.college_name || '').trim()).filter(Boolean));
  const playersCount = extPlayersCache.length;
  const approvedTeams = extTeamsCache.filter(t => (t.status || '').toUpperCase() === 'APPROVED').length;

  const elComps = document.getElementById('an-ext-total-comps');
  if (elComps) elComps.innerText = compsCount;

  const elColleges = document.getElementById('an-ext-total-colleges');
  if (elColleges) elColleges.innerText = collegesSet.size;

  const elPlayers = document.getElementById('an-ext-total-players');
  if (elPlayers) elPlayers.innerText = playersCount;

  const elApproved = document.getElementById('an-ext-approved-count');
  if (elApproved) elApproved.innerText = approvedTeams;

  // Render Sport-wise distribution bars
  const sportCounts = {};
  extRegistrationsCache.forEach(r => {
    const s = r.sport_name || (r.competition && r.competition.name) || 'Other Sports';
    sportCounts[s] = (sportCounts[s] || 0) + 1;
  });

  const sportBars = document.getElementById('an-sport-bars');
  if (sportBars) {
    const total = extRegistrationsCache.length || 1;
    let html = '';
    for (const [sport, count] of Object.entries(sportCounts)) {
      const pct = Math.round((count / total) * 100);
      html += `
        <div class="mb-3">
          <div class="d-flex justify-content-between small fw-bold mb-1">
            <span>${sport}</span>
            <span>${count} Registrations (${pct}%)</span>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-primary" role="progressbar" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }
    if (!html) html = '<div class="text-muted small">No registration data available yet.</div>';
    sportBars.innerHTML = html;
  }

  // Render College participation breakdown
  const collegeCounts = {};
  extRegistrationsCache.forEach(r => {
    const col = r.college_name || 'Unknown College';
    collegeCounts[col] = (collegeCounts[col] || 0) + 1;
  });

  const collegeBars = document.getElementById('an-college-bars');
  if (collegeBars) {
    const total = extRegistrationsCache.length || 1;
    let html = '';
    const sortedColleges = Object.entries(collegeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    for (const [col, count] of sortedColleges) {
      const pct = Math.round((count / total) * 100);
      html += `
        <div class="mb-3">
          <div class="d-flex justify-content-between small fw-bold mb-1">
            <span class="text-truncate" style="max-width: 70%;">${col}</span>
            <span>${count} Teams / Athletes</span>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar bg-warning" role="progressbar" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }
    if (!html) html = '<div class="text-muted small">No external college registrations yet.</div>';
    collegeBars.innerHTML = html;
  }
}

// ─────────────────────────────────────────────────────────────
// 9. SUB-TAB 7: OFFICIAL REPORTS GENERATOR
// ─────────────────────────────────────────────────────────────
function initExtReportsView() {
  populateCompFilterOptions();
}

function generateAdminExtReport() {
  const compId = document.getElementById('report-ext-comp')?.value || 'All';
  const status = document.getElementById('report-ext-status')?.value || 'All';
  const gender = document.getElementById('report-ext-gender')?.value || 'All';
  const container = document.getElementById('ext-report-output-container');
  if (!container) return;

  let list = extRegistrationsCache;
  if (compId !== 'All') list = list.filter(r => String(r.competition_id) === String(compId));
  if (status !== 'All') list = list.filter(r => (r.status || '').toUpperCase() === status.toUpperCase());
  if (gender !== 'All') list = list.filter(r => (r.gender || '').toLowerCase() === gender.toLowerCase());

  let selectedCompName = 'All Inter-College Tournaments';
  if (compId !== 'All') {
    const matched = extCompetitionsCache.find(c => String(c.id || c._id) === String(compId));
    if (matched) selectedCompName = matched.name || matched.tournamentName;
  }

  const dateNow = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  let rowsHtml = '';
  if (list.length === 0) {
    rowsHtml = `<tr><td colspan="7" class="text-center py-4 text-muted">No records found matching criteria.</td></tr>`;
  } else {
    list.forEach((r, idx) => {
      const isTeam = (r.registration_type || r.registrationType) === 'TEAM';
      const participant = isTeam ? (r.team_name || 'Team') : (r.player_name || 'Athlete');
      rowsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td class="font-monospace">${r.registration_id || r.id}</td>
          <td><strong>${r.college_name}</strong><br><small class="text-muted">${r.district || ''}</small></td>
          <td>${participant} <span class="badge bg-light text-dark">${isTeam ? 'Team' : 'Individual'}</span></td>
          <td>${r.gender || 'Boys'}</td>
          <td>${r.participant_phone || '-'}<br><small class="text-muted">${r.participant_email || '-'}</small></td>
          <td><span class="badge bg-secondary">${r.status}</span></td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div id="ext-report-printable-sheet" class="bg-white p-4 rounded-3 border text-dark">
      <!-- Report Header -->
      <div class="text-center pb-3 border-bottom border-2 border-dark mb-3">
        <h5 class="fw-bold mb-0 text-uppercase">GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI</h5>
        <div class="small fw-bold text-muted text-uppercase">DEPARTMENT OF PHYSICAL EDUCATION &bull; INTER-COLLEGE SPORTS REPORT</div>
        <h6 class="fw-bold text-primary mt-2 mb-0">${selectedCompName}</h6>
        <div class="small text-muted">Generated Date: ${dateNow} &bull; Filter: Status (${status}) / Category (${gender})</div>
      </div>

      <!-- Report Tabulation Table -->
      <div class="table-responsive mb-4">
        <table class="table table-bordered table-sm align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th style="width: 45px;">S.No</th>
              <th>Reg ID</th>
              <th>College Name & District</th>
              <th>Team / Athlete Name</th>
              <th>Category</th>
              <th>Contact Details</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Signature Footer -->
      <div class="row pt-4 text-center mt-5">
        <div class="col-4">
          <div class="border-top pt-2 small fw-bold">Prepared By / Staff Incharge</div>
        </div>
        <div class="col-4">
          <div class="border-top pt-2 small fw-bold">Dr. R. ANITHA<br><span class="text-muted fw-normal">Director of Physical Education</span></div>
        </div>
        <div class="col-4">
          <div class="border-top pt-2 small fw-bold">PRINCIPAL<br><span class="text-muted fw-normal">GASC Idappadi</span></div>
        </div>
      </div>
    </div>
  `;
}

function printAdminExtReport() {
  const sheet = document.getElementById('ext-report-printable-sheet');
  if (!sheet) {
    notifyUser('Please generate the report first before printing.', 'warning');
    return;
  }
  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html>
      <head>
        <title>GASC Idappadi - Official Inter-College Report</title>
        <link href="vendor/bootstrap.min.css" rel="stylesheet" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: white; color: black; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${sheet.innerHTML}
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
    </html>
  `);
  printWin.document.close();
}

// ─────────────────────────────────────────────────────────────
// 10. QR CODE & POSTER MODAL ACTIONS
// ─────────────────────────────────────────────────────────────
function openInterCollegeQrModalById(compId) {
  const comp = extCompetitionsCache.find(c => String(c.id || c._id) === String(compId));
  if (comp) openInterCollegeQrModal(comp);
}

function openInterCollegeQrModal(comp) {
  if (!comp) return;
  selectedExtCompForQr = comp;

  const compName = comp.name || comp.tournamentName || 'Inter-College Championship';
  const sport = comp.sportName || comp.sport_name || (comp.name ? comp.name.split('-')[0].trim() : 'Sports');
  const compMode = (comp.competition_mode || comp.competitionMode || comp.type || 'TEAM').toUpperCase();
  const token = comp.registration_token || comp.registrationToken || comp.id;
  const status = (comp.registration_status || comp.registrationStatus || comp.status || 'OPEN').toUpperCase();
  const isOpen = status.includes('OPEN') || status.includes('PUBLISHED');
  const compDate = comp.date ? new Date(comp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBA';
  const deadline = comp.registration_deadline || comp.registrationEnd || comp.date;
  const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBA';
  const venue = comp.venue || 'GASC Idappadi Ground';

  // Synchronize Target Domain Selector in Modal
  const currentBase = getPublicPortalBaseUrl();
  const domainSelect = document.getElementById('qr-portal-domain-select');
  const badge = document.getElementById('qr-target-mode-badge');
  const customContainer = document.getElementById('qr-custom-domain-container');
  const customInput = document.getElementById('qr-custom-domain-input');

  if (domainSelect) {
    if (currentBase.includes('vercel.app')) {
      domainSelect.value = 'https://gasc-student-portal.vercel.app';
      if (badge) {
        badge.textContent = 'PUBLIC CLOUD (PHONE READY)';
        badge.className = 'badge bg-success text-white';
      }
      if (customContainer) customContainer.classList.add('d-none');
    } else if (currentBase.includes(detectedServerLanIp) || currentBase.includes(':5000') || currentBase.includes('192.168.') || currentBase.includes('10.')) {
      domainSelect.value = 'LOCAL_LAN';
      if (badge) {
        badge.textContent = `CAMPUS WI-FI (${detectedServerLanIp})`;
        badge.className = 'badge bg-warning text-dark';
      }
      if (customContainer) customContainer.classList.add('d-none');
    } else {
      domainSelect.value = 'CUSTOM';
      if (badge) {
        badge.textContent = 'CUSTOM DOMAIN';
        badge.className = 'badge bg-info text-dark';
      }
      if (customContainer) {
        customContainer.classList.remove('d-none');
        if (customInput) customInput.value = currentBase;
      }
    }
  }

  const regUrl = getPublicRegistrationUrl(token);

  // Populate fields
  const titleEl = document.getElementById('qr-modal-comp-name');
  if (titleEl) titleEl.innerText = compName;

  const qrImg = document.getElementById('qr-modal-image');
  if (qrImg) qrImg.src = getQrImageUrl(token, 300);

  const tokenBadge = document.getElementById('qr-modal-token-display');
  if (tokenBadge) tokenBadge.innerText = `TOKEN: ${token}`;

  const sportEl = document.getElementById('qr-modal-sport');
  if (sportEl) sportEl.innerText = sport;

  const modeEl = document.getElementById('qr-modal-mode');
  if (modeEl) modeEl.innerText = compMode;

  const dateEl = document.getElementById('qr-modal-date');
  if (dateEl) dateEl.innerText = compDate;

  const venueEl = document.getElementById('qr-modal-venue');
  if (venueEl) venueEl.innerText = venue;

  const deadlineEl = document.getElementById('qr-modal-deadline');
  if (deadlineEl) deadlineEl.innerText = deadlineStr;

  const statusBadge = document.getElementById('qr-modal-status-badge');
  if (statusBadge) {
    statusBadge.innerHTML = `<span class="badge ${isOpen ? 'bg-success' : 'bg-danger'}">${isOpen ? 'OPEN' : 'CLOSED'}</span>`;
  }

  const linkInput = document.getElementById('qr-modal-link-input');
  if (linkInput) linkInput.value = regUrl;

  const toggleBtn = document.getElementById('btn-toggle-reg-status');
  if (toggleBtn) {
    toggleBtn.innerHTML = isOpen ? 
      '<i class="bi bi-pause-circle me-1"></i> Disable Registration' : 
      '<i class="bi bi-play-circle me-1"></i> Enable Registration';
    toggleBtn.className = `btn btn-sm ${isOpen ? 'btn-outline-danger' : 'btn-outline-success'} rounded-pill`;
  }

  const modalEl = document.getElementById('qrPreviewModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

function copyQrRegistrationLink(providedToken) {
  const token = providedToken || (selectedExtCompForQr && (selectedExtCompForQr.registration_token || selectedExtCompForQr.registrationToken || selectedExtCompForQr.id));
  const url = token ? getPublicRegistrationUrl(token) : document.getElementById('qr-modal-link-input')?.value;

  if (url) {
    navigator.clipboard.writeText(url).then(() => {
      notifyUser('Registration link copied to clipboard!', 'success', 'Link Copied');
    }).catch(() => {
      // Fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      notifyUser('Registration link copied to clipboard!', 'success', 'Link Copied');
    });
  }
}

function downloadQrImagePng() {
  if (!selectedExtCompForQr) return;
  const token = selectedExtCompForQr.registration_token || selectedExtCompForQr.registrationToken || selectedExtCompForQr.id;
  const name = selectedExtCompForQr.name || 'GASC_InterCollege';
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
  const a = document.createElement('a');
  a.href = getQrImageUrl(token, 600);
  a.download = `${safeName}_Registration_QR.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  notifyUser('QR Code PNG download started!', 'success');
}

function printQrDirect() {
  if (!selectedExtCompForQr) return;
  const comp = selectedExtCompForQr;
  const token = comp.registration_token || comp.registrationToken || comp.id;
  const compName = comp.name || comp.tournamentName || 'Inter-College Championship';
  const regUrl = getPublicRegistrationUrl(token);
  const qrImgSrc = getQrImageUrl(token, 400);

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html>
      <head>
        <title>GASC Idappadi - Registration QR</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; }
          .qr-box { border: 2px solid #000; padding: 20px; display: inline-block; border-radius: 12px; }
          h2 { margin: 0 0 10px 0; }
          p { margin: 5px 0; color: #555; }
        </style>
      </head>
      <body>
        <div class="qr-box">
          <h2>GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI</h2>
          <p>DEPARTMENT OF PHYSICAL EDUCATION</p>
          <hr/>
          <h3>${compName}</h3>
          <p>Scan to Register Online</p>
          <img src="${qrImgSrc}" style="width: 280px; height: 280px;"/>
          <p style="font-family: monospace; font-size: 12px;">${regUrl}</p>
        </div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
    </html>
  `);
  printWin.document.close();
}

function openPosterModalFromQr() {
  if (selectedExtCompForQr) {
    // Hide QR modal and show Poster modal
    const qrModalEl = document.getElementById('qrPreviewModal');
    if (qrModalEl) {
      const qrModal = bootstrap.Modal.getInstance(qrModalEl);
      if (qrModal) qrModal.hide();
    }
    openInterCollegePosterModal(selectedExtCompForQr);
  }
}

function openInterCollegePosterModalById(compId) {
  const comp = extCompetitionsCache.find(c => String(c.id || c._id) === String(compId));
  if (comp) openInterCollegePosterModal(comp);
}

function openInterCollegePosterModal(comp) {
  if (!comp) return;
  selectedExtCompForQr = comp;

  const compName = comp.name || comp.tournamentName || 'GASC Inter-College Championship 2026';
  const sport = comp.sportName || comp.sport_name || (comp.name ? comp.name.split('-')[0].trim() : 'Sports');
  const compMode = (comp.competition_mode || comp.competitionMode || comp.type || 'TEAM').toUpperCase();
  const token = comp.registration_token || comp.registrationToken || comp.id;
  const compDate = comp.date ? new Date(comp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'TBA';
  const deadline = comp.registration_deadline || comp.registrationEnd || comp.date;
  const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'TBA';
  const venue = comp.venue || 'GASC Idappadi Sports Ground';
  const contactPerson = comp.contact_person || comp.contactPerson || 'Dr. R. ANITHA (Physical Director)';
  const contactPhone = comp.contact_phone || comp.contactPhone || '+91 94432 18765';
  const contactEmail = comp.contact_email || comp.contactEmail || 'sportsgascidappadi@gmail.com';
  const rules = comp.rules || comp.description || 'College ID card is compulsory for all participating athletes. Official entry forms must be verified before match commencement.';

  // Populate poster elements
  const titleEl = document.getElementById('poster-comp-title');
  if (titleEl) titleEl.innerText = compName;

  const sportBadge = document.getElementById('poster-sport-badge');
  if (sportBadge) sportBadge.innerText = `${sport.toUpperCase()} (${compMode} CHAMPIONSHIP)`;

  const dateEl = document.getElementById('poster-date');
  if (dateEl) dateEl.innerText = compDate;

  const deadlineEl = document.getElementById('poster-deadline');
  if (deadlineEl) deadlineEl.innerText = deadlineStr;

  const venueEl = document.getElementById('poster-venue');
  if (venueEl) venueEl.innerText = venue;

  const qrImg = document.getElementById('poster-qr-image');
  if (qrImg) qrImg.src = getQrImageUrl(token, 300);

  const linkText = document.getElementById('poster-link-text');
  if (linkText) linkText.innerText = getPublicRegistrationUrl(token);

  const rulesEl = document.getElementById('poster-rules-text');
  if (rulesEl) rulesEl.innerText = rules;

  const cPersonEl = document.getElementById('poster-contact-person');
  if (cPersonEl) cPersonEl.innerText = contactPerson;

  const cPhoneEl = document.getElementById('poster-contact-phone');
  if (cPhoneEl) cPhoneEl.innerText = contactPhone;

  const cEmailEl = document.getElementById('poster-contact-email');
  if (cEmailEl) cEmailEl.innerText = contactEmail;

  const modalEl = document.getElementById('qrPosterModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

function printPosterSheet() {
  const sheet = document.getElementById('poster-printable-sheet');
  if (!sheet) return;

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html>
      <head>
        <title>GASC Idappadi - Official Poster</title>
        <link href="vendor/bootstrap.min.css" rel="stylesheet" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: white; color: black; }
          @media print {
            body { padding: 0; margin: 0; }
            #poster-printable-sheet { max-width: 100% !important; border: 2px solid black !important; box-shadow: none !important; }
          }
        </style>
      </head>
      <body>
        ${sheet.outerHTML}
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
    </html>
  `);
  printWin.document.close();
}

async function toggleCompetitionRegistrationState(compId, currentStatus) {
  const targetId = compId || (selectedExtCompForQr && (selectedExtCompForQr.id || selectedExtCompForQr._id));
  if (!targetId) return;

  try {
    const res = await apiRequest(`/inter-college/admin/competition/${targetId}/toggle-registration`, 'POST', {});
    notifyUser(res.message || 'Registration state updated successfully!', 'success');
    
    // Refresh modal if open
    if (res.competition && selectedExtCompForQr && String(selectedExtCompForQr.id || selectedExtCompForQr._id) === String(targetId)) {
      selectedExtCompForQr = res.competition;
      openInterCollegeQrModal(res.competition);
    }
    
    // Refresh data in background
    loadAdminInterCollegeData();
  } catch (err) {
    notifyUser('Failed to update registration state: ' + err.message, 'error');
  }
}

async function promptRegenerateQrToken(compId, compName) {
  const targetId = compId || (selectedExtCompForQr && (selectedExtCompForQr.id || selectedExtCompForQr._id));
  const targetName = compName || (selectedExtCompForQr && selectedExtCompForQr.name) || 'Competition';
  if (!targetId) return;

  const confirmed = confirm(
    `Are you sure you want to REGENERATE the QR Code for "${targetName}"?\n\n` +
    `⚠️ IMPORTANT: The previous QR code and link will become immediately invalid!`
  );

  if (!confirmed) return;

  try {
    const res = await apiRequest(`/inter-college/admin/competition/${targetId}/regenerate-token`, 'POST', {});
    notifyUser('New QR token generated successfully!', 'success');
    
    if (res.competition) {
      selectedExtCompForQr = res.competition;
      openInterCollegeQrModal(res.competition);
    }
    loadAdminInterCollegeData();
  } catch (err) {
    notifyUser('Failed to regenerate QR token: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// 11. REGISTRATION DETAILS & APPROVAL ACTIONS
// ─────────────────────────────────────────────────────────────
async function openExtRegDetails(regId) {
  let reg = extRegistrationsCache.find(r => String(r.id) === String(regId));

  // If not found or needs full details, fetch from API
  try {
    const res = await apiRequest(`/inter-college/admin/registration/${regId}`);
    if (res && res.data) reg = res.data;
  } catch (e) {
    console.warn('Using cached registration record:', e.message);
  }

  if (!reg) {
    notifyUser('Registration record not found.', 'error');
    return;
  }

  selectedExtRegForAction = reg;

  const isTeam = (reg.registration_type || reg.registrationType) === 'TEAM';
  const status = (reg.status || 'PENDING').toUpperCase();
  const dateStr = reg.created_at ? new Date(reg.created_at).toLocaleString('en-IN') : '-';

  // Badges & Labels
  const badgeEl = document.getElementById('detail-ext-status-badge');
  if (badgeEl) {
    badgeEl.innerText = status;
    badgeEl.className = 'badge ms-2 ' + (status === 'APPROVED' ? 'bg-success' : status === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark');
  }

  const idEl = document.getElementById('detail-ext-reg-id-display');
  if (idEl) idEl.innerText = `Registration ID: ${reg.registration_id || reg.id}`;

  // College Info
  const cName = document.getElementById('detail-ext-college-name');
  if (cName) cName.innerText = reg.college_name || '-';

  const cAddr = document.getElementById('detail-ext-college-addr');
  if (cAddr) cAddr.innerText = reg.college_address || '-';

  const cDist = document.getElementById('detail-ext-college-dist-state');
  if (cDist) cDist.innerText = `${reg.district || '-'}, ${reg.state || '-'}`;

  const cPhone = document.getElementById('detail-ext-college-phone');
  if (cPhone) cPhone.innerText = reg.college_phone || '-';

  const cEmail = document.getElementById('detail-ext-college-email');
  if (cEmail) cEmail.innerText = reg.college_email || '-';

  // Event & Contact Info
  const compName = document.getElementById('detail-ext-comp-name');
  if (compName) compName.innerText = (reg.competition && reg.competition.name) || reg.competition_name || 'Inter-College Championship';

  const typeGender = document.getElementById('detail-ext-type-gender');
  if (typeGender) typeGender.innerText = `${isTeam ? 'Team Squad' : 'Individual Athlete'} (${reg.gender || 'Boys'})`;

  const teamName = document.getElementById('detail-ext-team-name');
  if (teamName) teamName.innerText = isTeam ? (reg.team_name || 'College Squad') : (reg.player_name || reg.contact_person || 'Athlete');

  const emailEl = document.getElementById('detail-ext-email');
  if (emailEl) emailEl.innerText = reg.participant_email || '-';

  const phoneEl = document.getElementById('detail-ext-phone');
  if (phoneEl) phoneEl.innerText = reg.participant_phone || '-';

  const coachEl = document.getElementById('detail-ext-coach-manager');
  if (coachEl) coachEl.innerText = `Coach: ${reg.coach_name || '-'} | Manager: ${reg.manager_name || '-'}`;

  const subDate = document.getElementById('detail-ext-submitted-date');
  if (subDate) subDate.innerText = dateStr;

  // Players table
  const playersTbody = document.getElementById('detail-ext-players-tbody');
  const playersCountBadge = document.getElementById('detail-ext-players-count');
  const players = reg.players || [];

  if (playersCountBadge) playersCountBadge.innerText = `${players.length} Players`;

  if (playersTbody) {
    if (players.length === 0) {
      // Individual athlete fallback row
      playersTbody.innerHTML = `
        <tr>
          <td>1</td>
          <td class="fw-bold">${reg.player_name || reg.contact_person || '-'}</td>
          <td class="font-monospace text-primary">${reg.college_register_number || '-'}</td>
          <td>${reg.department || '-'}</td>
          <td>${reg.year || '-'}</td>
          <td>${reg.gender || 'Boys'}</td>
          <td><span class="badge bg-primary">Single Athlete</span></td>
        </tr>
      `;
    } else {
      let pHtml = '';
      players.forEach((p, idx) => {
        pHtml += `
          <tr>
            <td>${idx + 1}</td>
            <td class="fw-bold">${p.player_name || '-'}</td>
            <td class="font-monospace text-primary">${p.college_register_number || '-'}</td>
            <td>${p.department || '-'}</td>
            <td>${p.year || '-'}</td>
            <td>${p.gender || 'Boys'}</td>
            <td>${p.player_role || 'Squad Member'}</td>
          </tr>
        `;
      });
      playersTbody.innerHTML = pHtml;
    }
  }

  // Admin notes container
  const notesContainer = document.getElementById('detail-ext-admin-notes-container');
  const notesText = document.getElementById('detail-ext-admin-notes-text');
  if (notesContainer && notesText) {
    if (reg.rejection_reason) {
      notesContainer.style.display = 'block';
      notesText.innerText = `Rejection Reason: ${reg.rejection_reason}`;
    } else if (reg.correction_message) {
      notesContainer.style.display = 'block';
      notesText.innerText = `Correction Required: ${reg.correction_message}`;
    } else {
      notesContainer.style.display = 'none';
    }
  }

  // Setup action buttons in modal footer
  const actionsContainer = document.getElementById('detail-ext-actions-container');
  if (actionsContainer) {
    if (status === 'PENDING' || status === 'CORRECTION_REQUIRED') {
      actionsContainer.innerHTML = `
        <button type="button" class="btn btn-outline-warning text-dark fw-bold rounded-pill px-3" onclick="openCorrectionModal('${reg.id}')">
          <i class="bi bi-pencil-square me-1"></i> Request Correction
        </button>
        <button type="button" class="btn btn-outline-danger rounded-pill px-3" onclick="openRejectModal('${reg.id}')">
          <i class="bi bi-x-circle me-1"></i> Reject
        </button>
        <button type="button" class="btn btn-success fw-bold rounded-pill px-4" onclick="confirmApproveExtReg('${reg.id}')">
          <i class="bi bi-check-circle-fill me-1"></i> Approve Registration
        </button>
      `;
    } else if (status === 'APPROVED') {
      actionsContainer.innerHTML = `
        <button type="button" class="btn btn-outline-danger rounded-pill px-3" onclick="openRejectModal('${reg.id}')">
          <i class="bi bi-x-circle me-1"></i> Revoke Approval / Reject
        </button>
      `;
    } else {
      actionsContainer.innerHTML = `
        <button type="button" class="btn btn-outline-success rounded-pill px-3" onclick="confirmApproveExtReg('${reg.id}')">
          <i class="bi bi-arrow-counterclockwise me-1"></i> Re-Open / Approve
        </button>
      `;
    }
  }

  const modalEl = document.getElementById('extRegDetailsModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

async function quickApproveExtReg(regId) {
  const confirmed = confirm('Are you sure you want to APPROVE this external registration? The team will become eligible for tournament fixtures.');
  if (confirmed) {
    await confirmApproveExtReg(regId);
  }
}

async function confirmApproveExtReg(regId) {
  try {
    const res = await apiRequest(`/inter-college/admin/registration/${regId}/status`, 'PATCH', {
      status: 'APPROVED'
    });

    notifyUser('Registration approved! Notification email sent to participant.', 'success', 'Approved');

    // Close details modal if open
    const modalEl = document.getElementById('extRegDetailsModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    loadAdminInterCollegeData();
  } catch (err) {
    notifyUser('Failed to approve registration: ' + err.message, 'error');
  }
}

function openRejectModal(regId) {
  const inputId = document.getElementById('reject-ext-reg-id');
  if (inputId) inputId.value = regId;

  const reasonEl = document.getElementById('reject-ext-reason');
  if (reasonEl) reasonEl.value = '';

  const modalEl = document.getElementById('extRejectModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

async function confirmRejectExtRegistration() {
  const regId = document.getElementById('reject-ext-reg-id')?.value;
  const reason = document.getElementById('reject-ext-reason')?.value?.trim();

  if (!reason) {
    notifyUser('Please provide a specific rejection reason.', 'warning');
    return;
  }

  try {
    await apiRequest(`/inter-college/admin/registration/${regId}/status`, 'PATCH', {
      status: 'REJECTED',
      rejectionReason: reason
    });

    notifyUser('Registration rejected and notice emailed to participant.', 'info', 'Rejected');

    // Close modals
    const rejectModal = bootstrap.Modal.getInstance(document.getElementById('extRejectModal'));
    if (rejectModal) rejectModal.hide();

    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('extRegDetailsModal'));
    if (detailsModal) detailsModal.hide();

    loadAdminInterCollegeData();
  } catch (err) {
    notifyUser('Failed to reject registration: ' + err.message, 'error');
  }
}

function openCorrectionModal(regId) {
  const inputId = document.getElementById('correction-ext-reg-id');
  if (inputId) inputId.value = regId;

  const msgEl = document.getElementById('correction-ext-message');
  if (msgEl) msgEl.value = '';

  const modalEl = document.getElementById('extCorrectionModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

async function confirmCorrectionExtRegistration() {
  const regId = document.getElementById('correction-ext-reg-id')?.value;
  const message = document.getElementById('correction-ext-message')?.value?.trim();

  if (!message) {
    notifyUser('Please provide correction instructions.', 'warning');
    return;
  }

  try {
    await apiRequest(`/inter-college/admin/registration/${regId}/status`, 'PATCH', {
      status: 'CORRECTION_REQUIRED',
      correctionMessage: message
    });

    notifyUser('Correction notice dispatched to participant email.', 'info', 'Correction Sent');

    // Close modals
    const corrModal = bootstrap.Modal.getInstance(document.getElementById('extCorrectionModal'));
    if (corrModal) corrModal.hide();

    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('extRegDetailsModal'));
    if (detailsModal) detailsModal.hide();

    loadAdminInterCollegeData();
  } catch (err) {
    notifyUser('Failed to send correction request: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// 12. COMPETITION CREATION HELPERS
// ─────────────────────────────────────────────────────────────
function openCreateInterCollegeModal() {
  if (typeof openCreateTournamentModal === 'function') {
    openCreateTournamentModal();
  }

  // Pre-select Inter-College radio
  const radio = document.getElementById('part-intercollege');
  if (radio) {
    radio.checked = true;
    toggleInterCollegeFields(true);
  }

  const modalEl = document.getElementById('addCompetitionModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

function toggleInterCollegeFields(isInterCollege) {
  const fields = document.getElementById('inter-college-config-fields');
  const badge = document.getElementById('part-type-badge');

  if (fields) {
    if (isInterCollege) {
      fields.classList.remove('d-none');
    } else {
      fields.classList.add('d-none');
    }
  }

  if (badge) {
    badge.innerText = isInterCollege ? 'Inter-College (External QR)' : 'Internal Tournament';
    badge.className = isInterCollege ? 'badge bg-warning text-dark' : 'badge bg-warning bg-opacity-20 text-dark';
  }
}

function onCompetitionModeChange(mode) {
  const isTeam = mode === 'TEAM';
  const teamFields = document.querySelectorAll('.team-rule-field');
  teamFields.forEach(el => {
    el.style.display = isTeam ? '' : 'none';
  });
}

// Attach functions to window for onclick handlers
window.loadAdminInterCollegeData = loadAdminInterCollegeData;
window.switchExtTab = switchExtTab;
window.openCreateInterCollegeModal = openCreateInterCollegeModal;
window.toggleInterCollegeFields = toggleInterCollegeFields;
window.onCompetitionModeChange = onCompetitionModeChange;
window.openInterCollegeQrModal = openInterCollegeQrModal;
window.openInterCollegeQrModalById = openInterCollegeQrModalById;
window.openInterCollegePosterModal = openInterCollegePosterModal;
window.openInterCollegePosterModalById = openInterCollegePosterModalById;
window.copyQrRegistrationLink = copyQrRegistrationLink;
window.downloadQrImagePng = downloadQrImagePng;
window.printQrDirect = printQrDirect;
window.printPosterSheet = printPosterSheet;
window.openPosterModalFromQr = openPosterModalFromQr;
window.toggleCompetitionRegistrationState = toggleCompetitionRegistrationState;
window.promptRegenerateQrToken = promptRegenerateQrToken;
window.openExtRegDetails = openExtRegDetails;
window.quickApproveExtReg = quickApproveExtReg;
window.confirmApproveExtReg = confirmApproveExtReg;
window.openRejectModal = openRejectModal;
window.confirmRejectExtRegistration = confirmRejectExtRegistration;
window.openCorrectionModal = openCorrectionModal;
window.confirmCorrectionExtRegistration = confirmCorrectionExtRegistration;
window.filterAdminExtRegistrations = filterAdminExtRegistrations;
window.filterAdminExtPlayers = filterAdminExtPlayers;
window.generateAdminExtReport = generateAdminExtReport;
window.printAdminExtReport = printAdminExtReport;
