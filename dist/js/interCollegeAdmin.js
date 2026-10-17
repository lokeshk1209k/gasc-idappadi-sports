/**
 * GASC Idappadi Smart Sports Management System
 * Admin Portal — Inter-College Championships & QR Management Module
 */

let extCompetitionsCache = [];
let extRegistrationsCache = [];
let extTeamsCache = [];
let extPlayersCache = [];
let currentActiveExtTab = 'tournaments';
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
  return 'https://gasc-idappadi-sports.vercel.app';
}

function getPublicRegistrationUrl(token) {
  const base = getPublicPortalBaseUrl();
  return `${base}/open-registration/${token}`;
}

function getQrImageUrl(token, size = 300) {
  const base = getPublicPortalBaseUrl();
  return `/api/inter-college/qr/${token}?format=png&size=${size}&baseUrl=${encodeURIComponent(base)}&path=${encodeURIComponent('/open-registration/' + token)}`;
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
  if (tabName === 'tournaments') {
    if (typeof loadAdminCompetitions === 'function') loadAdminCompetitions();
  }
  else if (tabName === 'competitions') renderExtCompetitionsCards();
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
        if (comps.length === 0 && res.allCompetitions && res.allCompetitions.length > 0) {
          comps = res.allCompetitions;
        }
      }
    } catch (e) {
      console.warn('Fallback: Fetching competitions & registrations separately:', e.message);
      // Fallback: fetch separately
      try {
        const compRes = await apiRequest('/competitions');
        const allComps = compRes.competitions || compRes.data || [];
        const filtered = allComps.filter(c => 
          c.participation_type === 'INTER_COLLEGE' || 
          c.participationType === 'INTER_COLLEGE' ||
          (c.type && c.type.toLowerCase().includes('inter-college'))
        );
        comps = filtered.length > 0 ? filtered : allComps;
      } catch (err) {}

      try {
        const regRes = await apiRequest('/inter-college/admin/registrations');
        if (regRes && regRes.data) regs = regRes.data;
      } catch (err) {}
    }

    // Secondary safety check: ensure competitions cache is not empty if competitions exist in DB
    if (comps.length === 0) {
      try {
        const compRes = await apiRequest('/competitions');
        const allComps = compRes.competitions || compRes.data || [];
        if (allComps.length > 0) comps = allComps;
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

    const tournCountBadge = document.getElementById('unified-tournaments-count');
    if (tournCountBadge && window.allTournamentsCache && Array.isArray(window.allTournamentsCache)) {
      tournCountBadge.innerText = window.allTournamentsCache.length;
    }

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
  const tourSelect = document.getElementById('ext-reg-filter-tournament');
  if (tourSelect) {
    const currentTour = tourSelect.value;
    const tourMap = new Map();
    if (window.allTournamentsCache && Array.isArray(window.allTournamentsCache)) {
      window.allTournamentsCache.forEach(t => {
        const id = t.id || t.registration_token || t.name;
        const name = t.name || t.tournament_name;
        if (id && name) tourMap.set(String(id), name);
      });
    }
    extCompetitionsCache.forEach(c => {
      const tId = c.tournament_id || `tour_${(c.tournament_name || c.tournamentName || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const tName = c.tournament_name || c.tournamentName;
      if (tName) tourMap.set(String(tId), tName);
    });
    extRegistrationsCache.forEach(r => {
      const tId = r.tournament_id;
      const tName = r.tournament_name || (r.tournament && r.tournament.name);
      if (tId && tName) tourMap.set(String(tId), tName);
    });

    let tourHtml = '<option value="All">All Tournaments</option>';
    tourMap.forEach((tName, tId) => {
      tourHtml += `<option value="${tId}">${tName}</option>`;
    });
    tourSelect.innerHTML = tourHtml;
    if (currentTour) tourSelect.value = currentTour;
  }

  const selectedTour = tourSelect ? tourSelect.value : 'All';
  const compSelects = [
    document.getElementById('ext-reg-filter-comp'),
    document.getElementById('report-ext-comp')
  ];

  compSelects.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    let html = '<option value="All">All Competitions</option>';
    let compsToUse = extCompetitionsCache;
    if (selectedTour !== 'All') {
      compsToUse = compsToUse.filter(c => {
        const tId = c.tournament_id || `tour_${(c.tournament_name || c.tournamentName || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        return String(tId).toLowerCase() === String(selectedTour).toLowerCase() ||
               String(c.tournament_id).toLowerCase() === String(selectedTour).toLowerCase() ||
               (c.tournament_name && c.tournament_name.toLowerCase() === selectedTour.toLowerCase()) ||
               (c.tournamentName && c.tournamentName.toLowerCase() === selectedTour.toLowerCase());
      });
    }
    compsToUse.forEach(c => {
      const cId = c.id || c._id;
      const cName = c.name || c.tournamentName || 'Inter-College Competition';
      html += `<option value="${cId}">${cName}</option>`;
    });
    sel.innerHTML = html;
    if (current) sel.value = current;
  });
}

function onAdminTournamentFilterChange() {
  populateCompFilterOptions();
  renderExtRegistrationsTable();
}
window.onAdminTournamentFilterChange = onAdminTournamentFilterChange;

// ─────────────────────────────────────────────────────────────
// Category Label and Badge Normalizers
// ─────────────────────────────────────────────────────────────
function normalizeCategoryLabel(raw) {
  if (!raw) return 'Men';
  const s = String(raw).trim();
  if (/^boys?|^men$/i.test(s)) return 'Men';
  if (/^girls?|^women$/i.test(s)) return 'Women';
  if (/^mixed|^all$/i.test(s)) return 'Mixed';
  return s;
}

function getCategoryBadgeClass(cat) {
  const c = normalizeCategoryLabel(cat);
  if (c === 'Men') return 'bg-primary text-white';
  if (c === 'Women') return 'bg-danger text-white';
  if (c === 'Mixed') return 'bg-success text-white';
  return 'bg-secondary text-white';
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

    const rawCat = c.category || c.gender || '';
    let catLabel = normalizeCategoryLabel(rawCat);
    const showCatBadge = catLabel && catLabel.toLowerCase() !== 'team sport' && catLabel.toLowerCase() !== compMode.toLowerCase();

    html += `
      <div class="col-xl-6 col-lg-12">
        <div class="inter-comp-card ${isOpen ? '' : 'closed'} p-4 h-100 d-flex flex-column justify-content-between">
          <div>
            <!-- Card Header: Badges & Quick Status -->
            <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
              <div class="d-flex flex-wrap gap-1.5 align-items-center">
                <span class="badge px-2.5 py-1.5 fw-bold" style="background: rgba(22, 119, 255, 0.22); color: #38A7FF; border: 1px solid rgba(55, 140, 255, 0.45); font-size: 0.75rem;">
                  <i class="bi ${isTeam ? 'bi-shield-shaded' : 'bi-person-fill'} me-1"></i>${isTeam ? 'Team Tournament' : 'Individual Sport'}
                </span>
                <span class="badge px-2.5 py-1.5 fw-bold" style="background: rgba(245, 158, 11, 0.2); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.45); font-size: 0.75rem;">
                  <i class="bi bi-trophy-fill me-1"></i>${sportName}
                </span>
                ${showCatBadge ? `
                  <span class="badge px-2.5 py-1.5 fw-bold" style="background: rgba(34, 211, 238, 0.18); color: #22D3EE; border: 1px solid rgba(34, 211, 238, 0.4); font-size: 0.75rem;">
                    ${catLabel}
                  </span>
                ` : ''}
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="badge px-3 py-1.5 fw-bold" style="${isOpen ? 'background: rgba(16, 185, 129, 0.18); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.45);' : 'background: rgba(148, 163, 184, 0.18); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.35);'}; font-size: 0.72rem;">
                  ${isOpen ? '<span class="status-dot-pulse me-1.5"></span>REGISTRATION OPEN' : '<i class="bi bi-lock-fill me-1"></i>CLOSED'}
                </span>
                <button class="btn-icon-del" onclick="deleteInterCollegeCompetition('${compId}', decodeURIComponent('${encodeURIComponent(compName)}'))" title="Delete Championship">
                  <i class="bi bi-trash3-fill"></i>
                </button>
              </div>
            </div>

            <!-- Title & Location/Date Meta -->
            <h5 class="fw-bold text-white mb-2" style="font-size: 1.25rem; letter-spacing: -0.01em;">${compName}</h5>
            <div class="d-flex flex-wrap gap-3 mb-3 small" style="color: #AFC4DF;">
              <span><i class="bi bi-geo-alt-fill text-danger me-1"></i>${venue}</span>
              <span><i class="bi bi-calendar-event text-primary me-1"></i>${compDate}</span>
            </div>

            <!-- QR Code & Tournament Parameter Pod -->
            <div class="inter-qr-pod mb-3">
              <div class="row g-3 align-items-center">
                <div class="col-sm-4 text-center">
                  <div class="qr-code-plate">
                    <img src="${qrThumbSrc}" alt="Registration QR" style="width: 100px; height: 100px; object-fit: contain;" onerror="this.onerror=null; this.src='images/college-logo.png';">
                  </div>
                  <div class="mt-2">
                    <span class="badge font-monospace" style="background: rgba(34, 211, 238, 0.12); color: #22D3EE; border: 1px solid rgba(34, 211, 238, 0.3); font-size: 0.68rem; letter-spacing: 0.04em;">
                      <i class="bi bi-qr-code me-1"></i>PASS #${token.substring(0, 8)}
                    </span>
                  </div>
                </div>
                <div class="col-sm-8">
                  <div class="row g-2.5">
                    <div class="col-6">
                      <small class="text-muted d-block text-uppercase" style="font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em;">Reg. Deadline</small>
                      <span class="fw-bold text-danger" style="font-size: 0.9rem;">${deadlineStr}</span>
                    </div>
                    <div class="col-6">
                      <small class="text-muted d-block text-uppercase" style="font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em;">Applications</small>
                      <span class="fw-bold text-primary" style="font-size: 0.9rem; cursor: pointer;" onclick="switchExtTab('registrations'); filterAdminExtRegistrations();">
                        <i class="bi bi-people-fill me-1"></i>${regsForComp.length} External
                      </span>
                    </div>
                    <div class="col-12">
                      <small class="text-muted d-block text-uppercase" style="font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em;">Squad Format</small>
                      <span class="text-white fw-semibold" style="font-size: 0.85rem;">
                        ${isTeam ? (c.required_players || 11) + ' Main + ' + (c.substitutes || 4) + ' Substitutes' : 'Single Athlete (Individual Entry)'}
                      </span>
                    </div>
                    <div class="col-12 mt-1">
                      <div class="input-group input-group-sm">
                        <span class="input-group-text bg-transparent border-end-0" style="border-color: rgba(55, 140, 255, 0.3); color: #38A7FF;"><i class="bi bi-link-45deg"></i></span>
                        <input type="text" class="form-control border-start-0 border-end-0 font-monospace text-truncate" style="background: rgba(5, 19, 38, 0.85); border-color: rgba(55, 140, 255, 0.3); color: #22D3EE; font-size: 0.75rem;" value="${regUrl}" readonly>
                        <button class="btn btn-outline-primary btn-sm px-2.5" type="button" onclick="copyQrRegistrationLink('${token}')" title="Copy Registration Link">
                          <i class="bi bi-clipboard-check me-1"></i>Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons Toolbar -->
          <div class="d-flex flex-wrap gap-2 pt-2.5 border-top border-white border-opacity-10 mt-1 align-items-center">
            <button class="btn btn-sports-primary btn-sm rounded-pill px-3.5 py-1.5 fw-bold flex-grow-1" onclick="openInterCollegeQrModalById('${compId}')">
              <i class="bi bi-qr-code-scan me-1.5"></i>Preview & Download QR
            </button>
            <button class="btn btn-warning text-dark btn-sm rounded-pill px-3.5 py-1.5 fw-bold" onclick="openInterCollegePosterModalById('${compId}')">
              <i class="bi bi-file-earmark-richtext-fill me-1.5"></i>A4 Poster
            </button>
            <button class="btn btn-sm ${isOpen ? 'btn-outline-secondary text-white' : 'btn-outline-success'} rounded-pill px-3 py-1.5" onclick="toggleCompetitionRegistrationState('${compId}', '${status}')">
              ${isOpen ? '<i class="bi bi-pause-circle me-1"></i>Disable' : '<i class="bi bi-play-circle me-1"></i>Enable'}
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
  const tourFilter = document.getElementById('ext-reg-filter-tournament')?.value || 'All';
  const compFilter = document.getElementById('ext-reg-filter-comp')?.value || 'All';
  const statusFilter = document.getElementById('ext-reg-filter-status')?.value || 'All';
  const genderFilter = document.getElementById('ext-reg-filter-gender')?.value || 'All';

  let list = extRegistrationsCache;

  if (tourFilter !== 'All') {
    list = list.filter(r => {
      const rTourId = r.tournament_id || (r.competition && r.competition.tournament_id);
      const rTourName = r.tournament_name || (r.tournament && r.tournament.name) || (r.competition && (r.competition.tournament_name || r.competition.tournamentName));
      return (rTourId && String(rTourId).toLowerCase() === tourFilter.toLowerCase()) ||
             (rTourName && rTourName.toLowerCase() === tourFilter.toLowerCase());
    });
  }
  if (compFilter !== 'All') {
    list = list.filter(r => String(r.competition_id) === String(compFilter));
  }
  if (statusFilter !== 'All') {
    list = list.filter(r => (r.status || '').toUpperCase() === statusFilter.toUpperCase());
  }
  if (genderFilter !== 'All') {
    list = list.filter(r => {
      const g = normalizeCategoryLabel(r.category || r.gender || (r.competition && (r.competition.category || r.competition.gender)));
      return g.toLowerCase() === genderFilter.toLowerCase();
    });
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
    const cat = normalizeCategoryLabel(r.category || r.gender || (r.competition && (r.competition.category || r.competition.gender)));
    const catBadge = getCategoryBadgeClass(cat);

    let badgeClass = 'bg-warning text-dark';
    if (status === 'APPROVED') badgeClass = 'bg-success text-white';
    else if (status === 'REJECTED') badgeClass = 'bg-danger text-white';
    else if (status === 'CORRECTION_REQUIRED') badgeClass = 'bg-info text-dark';

    html += `
      <tr>
        <td class="font-monospace fw-bold text-primary">${regId}</td>
        <td>
          <div class="fw-bold text-white">${compName}</div>
          <small style="color: #AFC4DF;"><i class="bi bi-trophy-fill text-warning me-1"></i>${sport}</small>
        </td>
        <td>
          <div class="fw-bold text-white">${college}</div>
          <small style="color: #AFC4DF;">${r.district || ''} ${r.state ? '(' + r.state + ')' : ''}</small>
        </td>
        <td>
          <span class="badge ${isTeam ? 'bg-primary' : 'bg-info'} me-1">${isTeam ? 'Team' : 'Individual'}</span>
          <strong>${participantName}</strong>
        </td>
        <td><span class="badge ${catBadge}">${cat}</span></td>
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
        <div class="glass-card p-3.5 h-100 d-flex flex-column justify-content-between" style="border: 1px solid rgba(55, 140, 255, 0.28); border-radius: 16px; background: rgba(7, 27, 53, 0.72);">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2.5">
              <span class="badge px-2.5 py-1 fw-bold" style="background: rgba(22, 119, 255, 0.22); color: #38A7FF; border: 1px solid rgba(55, 140, 255, 0.45);"><i class="bi bi-trophy-fill me-1"></i>${sport}</span>
              <span class="badge ${badgeClass} px-2.5 py-1">${status}</span>
            </div>
            <h6 class="fw-bold text-white mb-1"><i class="bi bi-shield-shaded text-primary me-1"></i>${teamName}</h6>
            <div class="small fw-semibold mb-2.5" style="color: #AFC4DF;"><i class="bi bi-building me-1"></i>${college}</div>

            <div class="p-3 rounded-3 small mb-3" style="background: rgba(3, 17, 38, 0.82); border: 1px solid rgba(55, 140, 255, 0.2);">
              <div class="row g-1.5">
                <div class="col-5 text-muted">Tournament:</div>
                <div class="col-7 fw-bold text-white">${compName}</div>
                <div class="col-5 text-muted">Category:</div>
                <div class="col-7"><span class="badge px-2 py-0.5" style="background: rgba(34, 211, 238, 0.18); color: #22D3EE; border: 1px solid rgba(34, 211, 238, 0.4);">${normalizeCategoryLabel(t.category || t.gender)}</span></div>
                <div class="col-5 text-muted">Squad Size:</div>
                <div class="col-7 fw-bold text-primary">${playersCount} Registered Players</div>
                <div class="col-5 text-muted">Coach / Incharge:</div>
                <div class="col-7 text-white">${coach}</div>
                <div class="col-5 text-muted">Manager:</div>
                <div class="col-7 text-white">${manager}</div>
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
        <td class="fw-bold text-white">${p.player_name || '-'}</td>
        <td class="font-monospace text-primary">${p.college_register_number || '-'}</td>
        <td class="text-white">${p.college_name || '-'}</td>
        <td>${p.department || '-'} ${p.year ? '(' + p.year + ')' : ''}</td>
        <td><span class="badge" style="background: rgba(34, 211, 238, 0.16); color: #22D3EE; border: 1px solid rgba(34, 211, 238, 0.35);">${p.sport_name || 'Sports'}</span></td>
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
          <h5 class="text-white">All Caught Up!</h5>
          <p class="small" style="color: #AFC4DF;">There are currently no external applications pending review.</p>
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
          <div class="fw-bold text-white">${r.college_name || '-'}</div>
          <small style="color: #AFC4DF;">${r.district || ''}, ${r.state || ''}</small>
        </td>
        <td>
          <div class="fw-bold text-white">${compName}</div>
          <small style="color: #AFC4DF;"><i class="bi bi-trophy-fill text-warning me-1"></i>${sport} (${r.gender || 'Boys'})</small>
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
  if (gender !== 'All') {
    list = list.filter(r => {
      const g = normalizeCategoryLabel(r.category || r.gender || (r.competition && (r.competition.category || r.competition.gender)));
      return g.toLowerCase() === gender.toLowerCase();
    });
  }

  let selectedCompName = 'All Inter-College Tournaments';
  let qrCodeSnippet = '';
  if (compId !== 'All') {
    const matched = extCompetitionsCache.find(c => String(c.id || c._id) === String(compId));
    if (matched) {
      selectedCompName = matched.name || matched.tournamentName;
      const token = matched.registration_token || matched.registrationToken || matched.id;
      const qrThumbUrl = getQrImageUrl(token, 130);
      const regUrl = getPublicRegistrationUrl(token);
      qrCodeSnippet = `
        <div class="text-center p-2 rounded-3 bg-white border border-2 border-dark shadow-sm d-inline-block" style="min-width: 130px;">
          <img src="${qrThumbUrl}" alt="Registration QR" style="width: 85px; height: 85px; object-fit: contain;">
          <div class="fw-bold text-dark" style="font-size: 0.65rem; margin-top: 2px;">SCAN TO REGISTER</div>
          <div class="text-muted font-monospace" style="font-size: 0.55rem; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${regUrl}</div>
        </div>
      `;
    }
  }

  const dateNow = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  let rowsHtml = '';
  if (list.length === 0) {
    rowsHtml = `<tr><td colspan="10" class="text-center py-4 text-muted">No records found matching criteria.</td></tr>`;
  } else {
    list.forEach((r, idx) => {
      const isTeam = (r.registration_type || r.registrationType) === 'TEAM';
      const participant = isTeam ? (r.team_name || 'Team') : (r.player_name || 'Athlete');
      const tourName = (r.tournament && r.tournament.name) || r.tournament_name || (r.competition && (r.competition.tournamentName || r.competition.tournament_name)) || 'GASC Tournament';
      const sport = r.sport_name || (r.competition && (r.competition.sportName || r.competition.sport_name)) || 'Sports';
      const compName = (r.competition && r.competition.name) || r.competition_name || 'Event';
      const cat = normalizeCategoryLabel(r.category || r.gender || (r.competition && (r.competition.category || r.competition.gender)));
      const catBadge = getCategoryBadgeClass(cat);
      const statusBadge = (r.status || 'PENDING').toUpperCase() === 'APPROVED' ? 'bg-success' : ((r.status || '').toUpperCase() === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark');

      rowsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td class="font-monospace fw-bold text-primary">${r.registration_id || r.id}</td>
          <td>${tourName}</td>
          <td><span class="badge bg-warning text-dark">${sport}</span></td>
          <td class="fw-bold">${compName}</td>
          <td><span class="badge ${catBadge}">${cat}</span></td>
          <td><strong>${r.college_name || r.department || '-'}</strong><br><small class="text-muted">${r.district || ''}</small></td>
          <td>${participant} <small class="text-muted">(${isTeam ? 'Team' : 'Individual'})</small></td>
          <td>${r.participant_phone || '-'}<br><small class="text-muted">${r.participant_email || '-'}</small></td>
          <td><span class="badge ${statusBadge}">${r.status || 'PENDING'}</span></td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div id="ext-report-printable-sheet" class="bg-white p-4 rounded-3 border text-dark">
      <!-- Report Header -->
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pb-3 border-bottom border-2 border-dark mb-3">
        <div class="text-center text-sm-start flex-grow-1">
          <h5 class="fw-bold mb-0 text-uppercase">GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI</h5>
          <div class="small fw-bold text-muted text-uppercase">DEPARTMENT OF PHYSICAL EDUCATION &bull; INTER-COLLEGE SPORTS REPORT</div>
          <h6 class="fw-bold text-primary mt-2 mb-0">${selectedCompName}</h6>
          <div class="small text-muted">Generated Date: ${dateNow} &bull; Filter: Status (${status}) / Category (${gender})</div>
        </div>
        ${qrCodeSnippet}
      </div>

      <!-- Report Tabulation Table -->
      <div class="table-responsive mb-4">
        <table class="table table-bordered table-sm align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th style="width: 45px;">S.No</th>
              <th>Reg ID</th>
              <th>Tournament</th>
              <th>Sport</th>
              <th>Competition / Event</th>
              <th>Category</th>
              <th>College / Department</th>
              <th>Player or Team Name</th>
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

  const compName = comp.isParentTournament ? (comp.name || comp.tournamentName) : (comp.name || comp.tournamentName || 'Inter-College Championship');
  const sport = comp.isParentTournament ? 'All Tournament Sports' : (comp.sportName || comp.sport_name || (comp.name ? comp.name.split('-')[0].trim() : 'Sports'));
  const compMode = comp.isParentTournament ? 'INTER-COLLEGE TOURNAMENT' : (comp.competition_mode || comp.competitionMode || comp.type || 'TEAM').toUpperCase();
  const token = comp.registration_token || comp.registrationToken || comp.id;
  const isEnabled = comp.external_registration_enabled !== false;
  const statusStr = (comp.registration_status || comp.registrationStatus || comp.status || 'OPEN').toUpperCase();
  const isClosed = statusStr.includes('CLOSED') || statusStr.includes('CANCELLED');
  const isOpen = isEnabled && !isClosed;
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
      domainSelect.value = 'https://gasc-idappadi-sports.vercel.app';
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
    if (!isEnabled) {
      statusBadge.innerHTML = '<span class="badge bg-secondary text-white">DISABLED</span>';
    } else if (isClosed) {
      statusBadge.innerHTML = '<span class="badge bg-danger text-white">CLOSED</span>';
    } else {
      statusBadge.innerHTML = '<span class="badge bg-success text-white">OPEN</span>';
    }
  }

  const linkInput = document.getElementById('qr-modal-link-input');
  if (linkInput) linkInput.value = regUrl;

  const toggleBtn = document.getElementById('btn-toggle-reg-status');
  if (toggleBtn) {
    toggleBtn.innerHTML = isEnabled ? 
      '<i class="bi bi-pause-circle me-1"></i> Disable Registration' : 
      '<i class="bi bi-play-circle me-1"></i> Enable Registration';
    toggleBtn.className = `btn btn-sm ${isEnabled ? 'btn-outline-danger' : 'btn-outline-success'} rounded-pill`;
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
    if (selectedExtCompForQr && String(selectedExtCompForQr.id || selectedExtCompForQr._id) === String(targetId)) {
      if (res.tournament) {
        selectedExtCompForQr = {
          ...selectedExtCompForQr,
          ...res.tournament,
          isParentTournament: true,
          external_registration_enabled: res.externalRegistrationEnabled !== false
        };
        openInterCollegeQrModal(selectedExtCompForQr);
      } else if (res.competition) {
        selectedExtCompForQr = res.competition;
        openInterCollegeQrModal(res.competition);
      }
    }
    
    // Refresh data in background
    loadAdminInterCollegeData();
  } catch (err) {
    notifyUser('Failed to update registration state: ' + err.message, 'error');
  }
}

async function deleteInterCollegeCompetition(compId, compName) {
  const targetId = compId || (selectedExtCompForQr && (selectedExtCompForQr.id || selectedExtCompForQr._id));
  const safeName = compName || (selectedExtCompForQr && selectedExtCompForQr.name) || 'Selected Competition';
  if (!targetId) return;

  const confirmed = typeof window.showCustomConfirm === 'function'
    ? await window.showCustomConfirm(
        `Delete "${safeName}"?`,
        `Are you sure you want to delete "${safeName}"? This will permanently remove the competition, its QR code, and registration link.`,
        'Delete Competition',
        'Cancel'
      )
    : confirm(`Are you sure you want to DELETE "${safeName}"?`);
  if (!confirmed) return;

  try {
    notifyUser(`Deleting "${safeName}"...`, 'info', 'Delete Competition');

    let deleted = false;
    // 1. Try inter-college specific delete endpoint
    try {
      const res = await apiRequest(`/inter-college/admin/competition/${targetId}`, 'DELETE', {});
      if (res && res.success) deleted = true;
    } catch (e1) {
      console.warn('inter-college DELETE API notice:', e1.message);
    }

    // 2. Try general competition delete endpoint
    if (!deleted) {
      try {
        const res = await apiRequest(`/competitions/${targetId}`, 'DELETE', {});
        if (res && res.success) deleted = true;
      } catch (e2) {
        console.warn('/competitions/ DELETE notice:', e2.message);
      }
    }

    // 3. Direct fetch fallback for live serverless API
    if (!deleted) {
      try {
        const res = await fetch(`/api/competitions/${targetId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (localStorage.getItem('adminToken') || '')
          }
        });
        const d = await res.json().catch(() => null);
        if (d && d.success) deleted = true;
      } catch (e3) {}
    }

    // 4. Purge from extCompetitionsCache and localStorage
    extCompetitionsCache = extCompetitionsCache.filter(c => String(c.id || c._id) !== String(targetId));
    try {
      const custom = JSON.parse(localStorage.getItem('gasc_custom_tournaments') || '[]');
      const filtered = custom.filter(c => String(c.id || c._id) !== String(targetId));
      localStorage.setItem('gasc_custom_tournaments', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('gasc_tournaments_updated'));
    } catch (e) {}

    // Close QR modal if open
    try {
      const modalEl = document.getElementById('qrPreviewModal');
      if (modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl);
        if (inst) inst.hide();
      }
    } catch (mErr) {}

    notifyUser(`Competition "${safeName}" deleted successfully!`, 'success', 'Competition Deleted');

    // Re-render immediately without crashing
    if (typeof renderExtCompetitionsCards === 'function') {
      renderExtCompetitionsCards();
    }
    const kpiComps = document.getElementById('ext-kpi-comps-count');
    if (kpiComps) kpiComps.innerText = extCompetitionsCache.length;

    // Reload from server in background
    if (typeof loadAdminInterCollegeData === 'function') {
      setTimeout(() => {
        try { loadAdminInterCollegeData(); } catch (e) {}
      }, 400);
    }
    if (typeof loadAdminCompetitions === 'function') {
      try { loadAdminCompetitions(); } catch (e) {}
    }
  } catch (err) {
    console.error('deleteInterCollegeCompetition error:', err);
    notifyUser('Failed to delete competition: ' + err.message, 'error');
  }
}
window.deleteInterCollegeCompetition = deleteInterCollegeCompetition;
window.renderExtCompetitionsGrid = renderExtCompetitionsCards;

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
    
    if (res.tournament) {
      selectedExtCompForQr = {
        ...selectedExtCompForQr,
        ...res.tournament,
        registration_token: res.registrationToken,
        isParentTournament: true
      };
      openInterCollegeQrModal(selectedExtCompForQr);
    } else if (res.competition) {
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
  // Purge any lingering or orphaned backdrops
  document.querySelectorAll('.modal-backdrop').forEach(b => {
    if (!document.querySelector('.modal.show')) b.remove();
  });

  // Ensure window focus in Electron
  window.focus();
  if (window.electronAPI && typeof window.electronAPI.fixFocus === 'function') {
    window.electronAPI.fixFocus();
  }

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
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl, { focus: false });
    modal.show();
    setTimeout(() => {
      const nameInput = document.getElementById('ctm-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 150);
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

function openSelectedExtReportQrModal() {
  const compId = document.getElementById('report-ext-comp')?.value;
  if (!compId || compId === 'All') {
    if (extCompetitionsCache && extCompetitionsCache.length > 0) {
      openInterCollegeQrModal(extCompetitionsCache[0]);
    } else {
      notifyUser('Please select a specific competition from the dropdown first.', 'warning');
    }
    return;
  }
  const comp = extCompetitionsCache.find(c => String(c.id || c._id) === String(compId));
  if (comp) {
    openInterCollegeQrModal(comp);
  } else {
    notifyUser('Selected competition details not found.', 'warning');
  }
}
window.openSelectedExtReportQrModal = openSelectedExtReportQrModal;

