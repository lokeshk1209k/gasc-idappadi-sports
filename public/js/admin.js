/**
 * Admin / Sports Incharge Portal Management Script
 */

const DEFAULT_SPORTS_FALLBACK = [
  { id: 'sp_cricket', name: 'Cricket', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_football', name: 'Football', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_volleyball', name: 'Volleyball', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_kabaddi', name: 'Kabaddi', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_badminton', name: 'Badminton', category: 'Indoor Games', indoorOutdoor: 'Indoor' },
  { id: 'sp_athletics', name: 'Athletics (Track & Field)', category: 'Athletics', indoorOutdoor: 'Outdoor' },
  { id: 'sp_chess', name: 'Chess', category: 'Indoor Games', indoorOutdoor: 'Indoor' },
  { id: 'sp_kho_kho', name: 'Kho Kho', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_table_tennis', name: 'Table Tennis', category: 'Indoor Games', indoorOutdoor: 'Indoor' },
  { id: 'sp_basketball', name: 'Basketball', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_carrom', name: 'Carrom', category: 'Indoor Games', indoorOutdoor: 'Indoor' },
  { id: 'sp_handball', name: 'Handball', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_throwball', name: 'Throwball', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_tennis', name: 'Tennis', category: 'Outdoor Games', indoorOutdoor: 'Outdoor' },
  { id: 'sp_running', name: 'Running', category: 'Athletics', indoorOutdoor: 'Outdoor' },
  { id: 'sp_shot_put', name: 'Shot Put', category: 'Athletics', indoorOutdoor: 'Outdoor' },
  { id: 'sp_javelin_throw', name: 'Javelin Throw', category: 'Athletics', indoorOutdoor: 'Outdoor' },
  { id: 'sp_long_jump', name: 'Long Jump', category: 'Athletics', indoorOutdoor: 'Outdoor' },
  { id: 'sp_high_jump', name: 'High Jump', category: 'Athletics', indoorOutdoor: 'Outdoor' },
  { id: 'sp_relay', name: 'Relay', category: 'Athletics', indoorOutdoor: 'Outdoor' },
  { id: 'sp_marathon', name: 'Marathon', category: 'Athletics', indoorOutdoor: 'Outdoor' }
];

let currentAdminUser = null;
let selectedAdminPhotoFile = null;
let allSportsCache = [...DEFAULT_SPORTS_FALLBACK];
let allEquipmentCache = [];
let allStudentsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentAdminUser = getCurrentUser();
  const token = localStorage.getItem('gasc_token');

  if (!token || !currentAdminUser || currentAdminUser.role !== 'admin') {
    showToast('Please login with Sports Incharge / Admin credentials.', 'warning', 'Admin Privileges Required');
    setTimeout(() => {
      const loginUrl = window.location.protocol === 'file:' ? 'admin-login.html' : '/admin/login';
      window.location.href = loginUrl;
    }, 500);
    return;
  }

  // Pre-populate dropdowns immediately so modals are ready on instant click
  populateSelectDropdowns();

  // Set initial topbar info from cache
  const nameEl = document.getElementById('admin-display-name');
  if (nameEl && currentAdminUser.name) nameEl.innerText = currentAdminUser.name;

  const avatarEl = document.getElementById('admin-header-avatar');
  if (avatarEl && currentAdminUser.profilePhoto) avatarEl.src = currentAdminUser.profilePhoto;

  // Sync latest live profile and settings from backend
  await syncAdminHeaderAndSettings();

  initAdminTabs();
  await loadCaches();
  loadAdminDashboard();
});

async function syncAdminHeaderAndSettings() {
  try {
    const res = await apiRequest('/settings');
    if (res && res.settings) {
      const s = res.settings;
      const nameEl = document.getElementById('admin-display-name');
      if (nameEl && s.sportsInchargeName) nameEl.innerText = s.sportsInchargeName;

      const roleEl = document.getElementById('admin-display-role');
      if (roleEl && s.sportsInchargeRole) roleEl.innerText = s.sportsInchargeRole;

      const coachInput = document.getElementById('add-sport-coach-input');
      if (coachInput && s.sportsInchargeName) coachInput.value = s.sportsInchargeName;

      const photoSrc = s.sportsInchargePhoto || s.profilePhoto || currentAdminUser?.profilePhoto;
      const avatarEl = document.getElementById('admin-header-avatar');
      if (avatarEl && photoSrc) avatarEl.src = photoSrc;

      if (currentAdminUser) {
        if (s.sportsInchargeName) currentAdminUser.name = s.sportsInchargeName;
        if (photoSrc) currentAdminUser.profilePhoto = photoSrc;
        localStorage.setItem('gasc_user', JSON.stringify(currentAdminUser));
      }
    }
  } catch (err) {
    console.warn('Could not sync admin settings header:', err);
  }
}

async function loadCaches() {
  // Ensure dropdowns have default items immediately
  populateSelectDropdowns();

  try {
    const [sportsRes, eqRes, playersRes] = await Promise.all([
      apiRequest('/sports').catch(async () => {
        try {
          const r = await fetch('/sports.json');
          return await r.json();
        } catch (e) {
          return { sports: DEFAULT_SPORTS_FALLBACK };
        }
      }),
      apiRequest('/equipment').catch(() => ({ equipment: [] })),
      apiRequest('/players?limit=200').catch(() => ({ players: [] }))
    ]);

    if (sportsRes && sportsRes.sports && sportsRes.sports.length > 0) {
      allSportsCache = sportsRes.sports;
    } else {
      allSportsCache = [...DEFAULT_SPORTS_FALLBACK];
    }
    allEquipmentCache = (eqRes && eqRes.equipment) || [];
    allStudentsCache = (playersRes && playersRes.players) || [];
    populateSelectDropdowns();
  } catch (err) {
    console.warn('Notice loading caches (using safe fallback):', err.message || err);
    if (!allSportsCache || allSportsCache.length === 0) {
      allSportsCache = [...DEFAULT_SPORTS_FALLBACK];
    }
    populateSelectDropdowns();
  }
}

function populateSelectDropdowns() {
  if (!allSportsCache || allSportsCache.length === 0) {
    allSportsCache = [...DEFAULT_SPORTS_FALLBACK];
  }

  // Populate Sports dropdowns
  const sportSelects = document.querySelectorAll('.populate-sports-select');
  sportSelects.forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">-- Select Sport Discipline --</option>' +
      allSportsCache.map(s => `<option value="${s.id || s._id}">${s.name}</option>`).join('');
    if (currentVal) sel.value = currentVal;
  });

  const teamFilterSport = document.getElementById('team-filter-sport');
  if (teamFilterSport) {
    teamFilterSport.innerHTML = '<option value="All">All Sports Disciplines</option>' +
      allSportsCache.map(s => `<option value="${s.id || s._id}">${s.name}</option>`).join('');
  }

  // Populate Equipment dropdowns
  const eqSelects = document.querySelectorAll('.populate-equipment-select');
  eqSelects.forEach(sel => {
    sel.innerHTML = '<option value="">-- Select Equipment Item --</option>' +
      allEquipmentCache.map(e => {
        const item = window.getEquipmentEmoji ? window.getEquipmentEmoji(e.name, e.category, e.sportName) : { emoji: '📦' };
        return `<option value="${e.id || e._id}">${item.emoji} ${e.name} (${e.code}) — Available: ${e.availableQuantity}</option>`;
      }).join('');
  });

  // Populate Students dropdowns
  const studentSelects = document.querySelectorAll('.populate-students-select');
  studentSelects.forEach(sel => {
    sel.innerHTML = '<option value="">-- Select Student Player --</option>' +
      allStudentsCache.map(s => `<option value="${s.registerNumber}">${s.name} (${s.registerNumber} - ${s.department})</option>`).join('');
  });
}

// Navigation & Tab Switcher
function initAdminTabs() {
  const navItems = document.querySelectorAll('.admin-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      switchAdminView(targetView);
    });
  });
}

function switchAdminView(viewId) {
  document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
  const activeBtn = document.querySelector(`.admin-nav-item[data-view="${viewId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.admin-view-section').forEach(sec => sec.classList.add('d-none'));
  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) targetSec.classList.remove('d-none');

  const sidebar = document.querySelector('.portal-sidebar');
  if (sidebar && sidebar.classList.contains('show')) {
    sidebar.classList.remove('show');
  }

  // Load section
  if (viewId === 'dashboard') loadAdminDashboard();
  else if (viewId === 'players') loadAdminPlayers();
  else if (viewId === 'roster') loadAdminRoster();
  else if (viewId === 'sports') loadAdminSports();
  else if (viewId === 'equipment-mgmt') loadAdminEquipmentMgmt();
  else if (viewId === 'equipment') {
    switchAdminView('equipment-mgmt');
    switchEqTab('stock');
    return;
  }
  else if (viewId === 'issue-return') {
    switchAdminView('equipment-mgmt');
    switchEqTab('active');
    return;
  }
  else if (viewId === 'competitions') loadAdminCompetitions();
  else if (viewId === 'applications') loadAdminApplications();
  else if (viewId === 'teams') loadAdminTeams();
  else if (viewId === 'achievements') loadAdminAchievements();
  else if (viewId === 'notifications') loadAdminNotifications();
  else if (viewId === 'gallery') loadAdminGallery();
  else if (viewId === 'analytics') loadAdminAnalytics();
  else if (viewId === 'reports') loadAdminReports();
  else if (viewId === 'settings') loadAdminSettings();
}

// 1. Dashboard
async function loadAdminDashboard() {
  try {
    const res = await apiRequest('/analytics/dashboard');
    const { kpis, aiInsights, recentRegistrations, recentTransactions } = res;

    const setKpi = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.innerText = val;
    };

    if (kpis) {
      setKpi('kpi-total-players', kpis.totalPlayers);
      setKpi('kpi-active-sports', kpis.totalSports);
      setKpi('kpi-total-equipment', kpis.totalEquipment);
      setKpi('kpi-issued-equipment', kpis.issuedEquipment);
      setKpi('kpi-low-stock', kpis.lowStockCount);
      setKpi('kpi-pending-apps', kpis.pendingApplications);
      setKpi('kpi-upcoming-comps', kpis.upcomingCompetitions);
      setKpi('kpi-total-achievements', kpis.totalAchievements);
    }

    // AI Sports Insights Card
    const insightsContainer = document.getElementById('admin-ai-insights-list');
    if (insightsContainer) {
      if (!aiInsights || aiInsights.length === 0) {
        insightsContainer.innerHTML = `<div class="p-3 text-muted">Aggregating sports department data for insights...</div>`;
      } else {
        insightsContainer.innerHTML = aiInsights.map(item => `
          <div class="glass-card ai-insight-card p-3 mb-2">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <span class="fw-bold text-dark"><i class="bi ${item.icon} text-${item.color} me-2"></i>${item.title}</span>
              <span class="badge badge-glass-${item.color}">${item.badge}</span>
            </div>
            <div class="small text-secondary">${item.message}</div>
          </div>
        `).join('');
      }
    }

    // Recent Registrations Feed
    const regFeed = document.getElementById('admin-recent-reg-feed');
    if (regFeed) {
      if (!recentRegistrations || recentRegistrations.length === 0) {
        regFeed.innerHTML = `<div class="p-3 text-muted small">No recent registrations.</div>`;
      } else {
        regFeed.innerHTML = recentRegistrations.map(r => `
          <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
            <div>
              <strong>${r.studentId ? r.studentId.name : 'Student'}</strong> (${r.studentId ? r.studentId.department : ''})
              <div class="small text-muted">${r.competitionId ? r.competitionId.name : 'Competition'} &bull; ${formatDate(r.registrationDate)}</div>
            </div>
            <span class="badge ${r.status === 'Approved' ? 'badge-glass-success' : (r.status === 'Rejected' ? 'badge-glass-danger' : 'badge-glass-warning')}">${r.status}</span>
          </div>
        `).join('');
      }
    }

    // Recent Equipment Transactions
    const txFeed = document.getElementById('admin-recent-tx-feed');
    if (txFeed) {
      if (!recentTransactions || recentTransactions.length === 0) {
        txFeed.innerHTML = `<div class="p-3 text-muted small">No recent equipment transactions.</div>`;
      } else {
        txFeed.innerHTML = recentTransactions.map(t => `
          <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
            <div>
              <strong>${t.equipmentName}</strong> (${t.quantity} unit) &rarr; ${t.studentName}
              <div class="small text-muted">Issued: ${formatDate(t.issueDate)} &bull; Due: ${formatDate(t.expectedReturnDate)}</div>
            </div>
            <span class="badge badge-glass-primary">${t.status}</span>
          </div>
        `).join('');
      }
    }

    // Live sync equipment stock stats & overdue alerts
    try {
      const eqTxRes = await apiRequest('/equipment/transactions');
      if (eqTxRes && eqTxRes.summaryStats) {
        const stats = eqTxRes.summaryStats;
        const totalEqEl = document.getElementById('kpi-total-equipment');
        const issuedEqEl = document.getElementById('kpi-issued-equipment');
        if (totalEqEl && stats.totalEquipment !== undefined) totalEqEl.innerText = stats.totalEquipment;
        if (issuedEqEl && stats.issuedStock !== undefined) issuedEqEl.innerText = stats.issuedStock;

        const overdueAlert = document.getElementById('dashboard-overdue-alert');
        const overdueCountEl = document.getElementById('dashboard-overdue-count');
        if (overdueAlert && overdueCountEl) {
          if (stats.overdueCount > 0) {
            overdueAlert.classList.remove('d-none');
            overdueCountEl.innerText = stats.overdueCount;
          } else {
            overdueAlert.classList.add('d-none');
          }
        }
      }
    } catch (e) {
      console.warn('Could not sync dashboard equipment stats:', e);
    }
  } catch (err) {
    console.error('Error loading admin dashboard:', err);
  }
}

// 2. Players Management
async function loadAdminPlayers() {
  const search = document.getElementById('player-search-input') ? document.getElementById('player-search-input').value : '';
  const dept = document.getElementById('player-filter-dept') ? document.getElementById('player-filter-dept').value : 'All';
  const year = document.getElementById('player-filter-year') ? document.getElementById('player-filter-year').value : 'All';
  const status = document.getElementById('player-filter-status') ? document.getElementById('player-filter-status').value : 'All';

  const table = document.getElementById('admin-players-table');
  try {
    const res = await apiRequest(`/players?search=${encodeURIComponent(search)}&department=${dept}&year=${year}&status=${status}`);
    allStudentsCache = res.players || [];
    populateSelectDropdowns();

    if (!res.players || res.players.length === 0) {
      table.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No student players found.</td></tr>`;
      return;
    }

    table.innerHTML = res.players.map((p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${p.profilePhoto || '/images/default-avatar.png'}" class="rounded-circle" width="36" height="36" style="object-fit:cover;" onerror="this.onerror=null;this.src='/images/default-avatar.png'">
            <div>
              <strong class="d-block text-dark">${p.name}</strong>
              <small class="text-muted">${p.registerNumber}</small>
            </div>
          </div>
        </td>
        <td>${p.department}<br><small class="text-muted">${p.year} (${p.section})</small></td>
        <td>${p.profile && p.profile.primarySport ? p.profile.primarySport.name : '<span class="text-muted">General</span>'}</td>
        <td>${p.profile ? p.profile.position : 'All Rounder'}</td>
        <td><span class="badge ${p.status === 'Active' ? 'badge-glass-success' : 'badge-glass-danger'}">${p.status}</span></td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="viewPlayerDetails('${p.id || p._id}')" title="View Full Profile"><i class="bi bi-eye"></i></button>
            <button class="btn btn-outline-danger" onclick="deletePlayer('${p.id || p._id}', '${p.name.replace(/'/g, "\\'")}')" title="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load players.</td></tr>`;
  }
}

async function viewPlayerDetails(id) {
  try {
    const res = await apiRequest(`/players/${id}`);
    const { player, profile, stats, equipmentHistory, attendanceRecords, achievements } = res;

    document.getElementById('modal-player-avatar').src = player.profilePhoto || 'images/default-avatar.png';
    document.getElementById('modal-player-name').innerText = player.name;
    document.getElementById('modal-player-reg').innerText = `${player.registerNumber} &bull; ${player.department} &bull; ${player.year}`;
    document.getElementById('modal-player-phone').innerText = player.mobile || 'N/A';
    document.getElementById('modal-player-email').innerText = player.email;
    document.getElementById('modal-player-status').innerHTML = `<span class="badge ${player.status === 'Active' ? 'badge-glass-success' : 'badge-glass-danger'}">${player.status}</span>`;

    document.getElementById('modal-player-sport').innerText = profile && profile.primarySport ? profile.primarySport.name : 'General Athletics';
    document.getElementById('modal-player-position').innerText = profile ? profile.position : 'All Rounder';
    document.getElementById('modal-player-jersey').innerText = profile ? `#${profile.jerseyNumber}` : '#7';
    document.getElementById('modal-player-level').innerText = profile ? profile.playingLevel : 'College Level';

    document.getElementById('modal-player-medals-count').innerText = stats.achievementsCount || 0;
    document.getElementById('modal-player-active-gear').innerText = stats.activeEquipmentCount || 0;

    const modal = new bootstrap.Modal(document.getElementById('playerDetailsModal'));
    modal.show();
  } catch (err) {
    showToast('Failed to load player profile', 'error');
  }
}

async function deletePlayer(id, name) {
  if (!confirm(`Are you sure you want to delete player "${name}"? This action cannot be undone.`)) return;
  try {
    await apiRequest(`/players/${id}`, 'DELETE');
    showToast(`Player "${name}" deleted.`, 'info');
    loadAdminPlayers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 3. Sports Management
async function loadAdminSports() {
  const table = document.getElementById('admin-sports-table');
  try {
    const res = await apiRequest('/sports');
    allSportsCache = res.sports || [];
    populateSelectDropdowns();

    table.innerHTML = res.sports.map((s, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi ${s.icon || 'bi-trophy'} text-success fs-5"></i>
            <strong class="text-dark">${s.name}</strong>
          </div>
        </td>
        <td><span class="badge badge-glass-primary">${s.category}</span></td>
        <td>${s.indoorOutdoor}</td>
        <td>${s.playerCount} Per Side</td>
        <td>${s.registeredPlayersCount || 0} Players</td>
        <td><span class="badge ${s.status === 'Active' ? 'badge-glass-success' : 'badge-glass-danger'}">${s.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSport('${s.id || s._id}', '${s.name.replace(/'/g, "\\'")}')" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load sports.</td></tr>`;
  }
}

async function submitCreateSport(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

    const res = await apiRequest('/sports', 'POST', formData, true);
    showToast(res.message, 'success');
    form.reset();
    bootstrap.Modal.getInstance(document.getElementById('addSportModal')).hide();
    loadAdminSports();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Save Sport';
  }
}

async function deleteSport(id, name) {
  if (!confirm(`Delete sport discipline "${name}"?`)) return;
  try {
    await apiRequest(`/sports/${id}`, 'DELETE');
    showToast(`Sport "${name}" removed.`, 'info');
    loadAdminSports();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 4. Sports Equipment Issue & Return Management System (Complete Workflow)
let currentVerifiedStudent = null;
let currentSelectedEquipment = null;
let activeTransactionsCache = [];
let allHistoryTransactionsCache = [];
let currentReturnTxId = null;

async function loadAdminEquipmentMgmt() {
  // Set default return date (3 days from today)
  const expDateInput = document.getElementById('main-issue-expected-date');
  if (expDateInput && !expDateInput.value) {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    expDateInput.value = d.toISOString().split('T')[0];
    expDateInput.min = new Date().toISOString().split('T')[0];
  }

  try {
    const [eqRes, txRes] = await Promise.all([
      apiRequest('/equipment'),
      apiRequest('/equipment/transactions')
    ]);

    allEquipmentCache = eqRes.equipment || [];
    populateSelectDropdowns();
    populateMainIssueEquipmentDropdown();

    // Update Top KPIs
    if (txRes && txRes.summaryStats) {
      const stats = txRes.summaryStats;
      const elTotal = document.getElementById('eq-stat-total');
      const elAvail = document.getElementById('eq-stat-available');
      const elIssued = document.getElementById('eq-stat-issued');
      const elOverdue = document.getElementById('eq-stat-overdue');
      const elOverdueSub = document.getElementById('eq-stat-overdue-sub');

      if (elTotal) elTotal.innerText = stats.totalEquipment || 0;
      if (elAvail) elAvail.innerText = stats.availableStock || 0;
      if (elIssued) elIssued.innerText = stats.issuedStock || 0;
      if (elOverdue) elOverdue.innerText = stats.overdueCount || 0;
      if (elOverdueSub) elOverdueSub.innerText = stats.overdueCount > 0 ? `${stats.overdueCount} item(s) overdue!` : 'All items on schedule';

      // Section 21: Overdue Admin Alert Banner
      const banner = document.getElementById('eq-overdue-banner');
      const bannerCount = document.getElementById('eq-overdue-banner-count');
      if (banner && bannerCount) {
        if (stats.overdueCount > 0) {
          banner.classList.remove('d-none');
          bannerCount.innerText = stats.overdueCount;
        } else {
          banner.classList.add('d-none');
        }
      }
    }

    // Load tabs data
    loadActiveIssues();
    loadEquipmentHistory();
    loadEquipmentStockOverview();
  } catch (err) {
    console.error('Error loading equipment management:', err);
  }
}

function switchEqTab(tabName, filter) {
  // Update Pills
  document.querySelectorAll('#equipment-mgmt-pills .nav-link').forEach(btn => btn.classList.remove('active'));
  const activePill = document.getElementById(`pill-eq-${tabName}`);
  if (activePill) activePill.classList.add('active');

  // Toggle Sub-tabs
  document.querySelectorAll('.eq-subtab-pane').forEach(pane => pane.classList.add('d-none'));
  const targetPane = document.getElementById(`subtab-eq-${tabName}`);
  if (targetPane) targetPane.classList.remove('d-none');

  if (tabName === 'active') {
    if (filter === 'Overdue') {
      const filterSel = document.getElementById('active-issue-filter');
      if (filterSel) filterSel.value = 'Overdue';
    }
    loadActiveIssues();
  } else if (tabName === 'history') {
    loadEquipmentHistory();
  } else if (tabName === 'stock') {
    loadEquipmentStockOverview();
  }
}

function populateMainIssueEquipmentDropdown() {
  const sel = document.getElementById('main-issue-equipment-select');
  if (!sel) return;

  const currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Choose Equipment from Inventory --</option>' +
    allEquipmentCache.map(e => {
      const item = window.getEquipmentEmoji ? window.getEquipmentEmoji(e.name, e.category, e.sportName) : { emoji: '📦' };
      return `
        <option value="${e.id || e._id}" ${e.availableQuantity <= 0 ? 'disabled' : ''}>
          ${item.emoji} ${e.name} (${e.code}) — Available: ${e.availableQuantity} / Total: ${e.totalQuantity} ${e.availableQuantity <= 0 ? ' [OUT OF STOCK]' : ''}
        </option>
      `;
    }).join('');

  if (currentVal) sel.value = currentVal;
}

// Student Search by Register Number (Section 4)
async function searchStudentForEquipment(regNo) {
  const input = document.getElementById('eq-search-reg-input');
  const query = regNo || (input ? input.value : '');

  if (!query || query.trim() === '') {
    showToast('Please enter a student Register Number to search.', 'warning');
    return;
  }

  const searchIndicator = document.getElementById('eq-student-searching');
  const card = document.getElementById('eq-student-card');
  const notfound = document.getElementById('eq-student-notfound');
  const prompt = document.getElementById('eq-student-prompt');
  const activeAlert = document.getElementById('eq-student-active-alert');

  if (prompt) prompt.classList.add('d-none');
  if (card) card.classList.add('d-none');
  if (notfound) notfound.classList.add('d-none');
  if (searchIndicator) searchIndicator.classList.remove('d-none');

  try {
    const res = await apiRequest(`/equipment/lookup-student/${encodeURIComponent(query.trim())}`);
    if (searchIndicator) searchIndicator.classList.add('d-none');

    if (res && res.student) {
      currentVerifiedStudent = res.student;

      // Populate Student Found Card
      const photoEl = document.getElementById('eq-student-photo');
      const nameEl = document.getElementById('eq-student-name');
      const regEl = document.getElementById('eq-student-reg');
      const deptYearEl = document.getElementById('eq-student-dept-year');

      if (photoEl) photoEl.src = res.student.profilePhoto || 'images/default-avatar.png';
      if (nameEl) nameEl.innerText = res.student.name;
      if (regEl) regEl.innerText = res.student.registerNumber;
      if (deptYearEl) deptYearEl.innerText = `${res.student.department || 'General'} • ${res.student.year || 'Student'}`;

      // Section 29: Duplicate Active Issues Warning
      if (res.student.activeIssuesCount > 0 && activeAlert) {
        activeAlert.classList.remove('d-none');
        const eqNames = (res.student.activeIssues || []).map(a => a.equipmentName).join(', ');
        const warningText = document.getElementById('eq-student-active-warning-text');
        if (warningText) {
          warningText.innerText = `Notice: Student currently has ${res.student.activeIssuesCount} equipment actively issued (${eqNames}). Please verify duplicate issuance.`;
        }
      } else if (activeAlert) {
        activeAlert.classList.add('d-none');
      }

      if (card) card.classList.remove('d-none');
      checkIssueFormValidity();
    } else {
      throw new Error('Student not found.');
    }
  } catch (err) {
    if (searchIndicator) searchIndicator.classList.add('d-none');
    currentVerifiedStudent = null;
    if (notfound) notfound.classList.remove('d-none');
    checkIssueFormValidity();
  }
}

// Equipment Selection Change Handler (Section 5)
function handleEquipmentSelectionChange() {
  const sel = document.getElementById('main-issue-equipment-select');
  const stockBox = document.getElementById('eq-selected-stock-box');
  const unavailMsg = document.getElementById('eq-unavailable-msg');
  const qtyInput = document.getElementById('main-issue-quantity');
  const qtyHelp = document.getElementById('main-issue-qty-help');

  if (!sel || !sel.value) {
    currentSelectedEquipment = null;
    if (stockBox) stockBox.classList.add('d-none');
    checkIssueFormValidity();
    return;
  }

  const eq = allEquipmentCache.find(e => (e.id || e._id) === sel.value);
  if (!eq) return;

  currentSelectedEquipment = eq;

  // Update Stock Stats Pill Box
  if (stockBox) stockBox.classList.remove('d-none');
  const badgeEl = document.getElementById('eq-selected-badge');
  const imgEl = document.getElementById('eq-selected-img');
  const nameEl = document.getElementById('eq-selected-name');
  const catEl = document.getElementById('eq-selected-cat');
  const totalEl = document.getElementById('eq-selected-total');
  const availEl = document.getElementById('eq-selected-available');
  const issuedEl = document.getElementById('eq-selected-issued');

  if (badgeEl) {
    badgeEl.innerHTML = window.getEquipmentEmojiBadge(eq.name, eq.category, eq.sportName, 40, 22);
  } else if (imgEl) {
    imgEl.outerHTML = `<div id="eq-selected-badge" class="flex-shrink-0">${window.getEquipmentEmojiBadge(eq.name, eq.category, eq.sportName, 40, 22)}</div>`;
  }
  if (nameEl) nameEl.innerText = eq.name;
  if (catEl) catEl.innerText = `${eq.category} (${eq.code})`;
  if (totalEl) totalEl.innerText = eq.totalQuantity || 0;
  if (availEl) availEl.innerText = eq.availableQuantity || 0;
  if (issuedEl) issuedEl.innerText = eq.issuedQuantity || 0;

  // Section 6: Quantity bounds
  if (qtyInput) {
    qtyInput.max = Math.max(1, eq.availableQuantity || 1);
    qtyInput.value = eq.availableQuantity > 0 ? 1 : 0;
  }
  if (qtyHelp) {
    qtyHelp.innerText = `Maximum available stock: ${eq.availableQuantity || 0} unit(s)`;
  }

  if (eq.availableQuantity <= 0) {
    if (unavailMsg) unavailMsg.classList.remove('d-none');
  } else {
    if (unavailMsg) unavailMsg.classList.add('d-none');
  }

  checkIssueFormValidity();
}

function validateIssueQuantity() {
  const qtyInput = document.getElementById('main-issue-quantity');
  if (!qtyInput || !currentSelectedEquipment) return;

  const val = parseInt(qtyInput.value, 10);
  if (val > currentSelectedEquipment.availableQuantity) {
    qtyInput.value = currentSelectedEquipment.availableQuantity;
    showToast(`Cannot issue more than available stock (${currentSelectedEquipment.availableQuantity}).`, 'warning');
  } else if (val < 1) {
    qtyInput.value = 1;
  }
  checkIssueFormValidity();
}

function validateExpectedReturnDate() {
  const dateInput = document.getElementById('main-issue-expected-date');
  if (!dateInput || !dateInput.value) return;

  const todayStr = new Date().toISOString().split('T')[0];
  if (dateInput.value < todayStr) {
    showToast('Expected return date cannot be in the past.', 'warning');
    dateInput.value = todayStr;
  }
  checkIssueFormValidity();
}

function checkIssueFormValidity() {
  const btn = document.getElementById('btn-proceed-issue');
  if (!btn) return;

  const hasStudent = !!currentVerifiedStudent;
  const hasEquipment = !!currentSelectedEquipment && currentSelectedEquipment.availableQuantity > 0;
  const dateInput = document.getElementById('main-issue-expected-date');
  const hasDate = !!(dateInput && dateInput.value);
  const qtyInput = document.getElementById('main-issue-quantity');
  const qtyValid = qtyInput && parseInt(qtyInput.value, 10) >= 1 && parseInt(qtyInput.value, 10) <= (currentSelectedEquipment ? currentSelectedEquipment.availableQuantity : 0);

  btn.disabled = !(hasStudent && hasEquipment && hasDate && qtyValid);
}

// Section 9: Show Confirmation Modal Before Issue
function handleProceedIssueModal(event) {
  event.preventDefault();

  if (!currentVerifiedStudent || !currentSelectedEquipment) {
    showToast('Please search for a student and select equipment.', 'warning');
    return;
  }

  const qty = document.getElementById('main-issue-quantity').value;
  const returnDate = document.getElementById('main-issue-expected-date').value;

  // Populate Confirm Modal
  document.getElementById('modal-conf-student-name').innerText = currentVerifiedStudent.name;
  document.getElementById('modal-conf-student-reg').innerText = currentVerifiedStudent.registerNumber;
  document.getElementById('modal-conf-student-dept').innerText = `${currentVerifiedStudent.department || ''} - ${currentVerifiedStudent.year || ''}`;
  document.getElementById('modal-conf-equipment-name').innerText = currentSelectedEquipment.name;
  document.getElementById('modal-conf-quantity').innerText = `${qty} Unit(s)`;
  document.getElementById('modal-conf-issue-date').innerText = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('modal-conf-return-date').innerText = formatDate(returnDate);

  const modal = new bootstrap.Modal(document.getElementById('confirmEquipmentIssueModal'));
  modal.show();
}

// Section 10: Execute Final Issue After Confirmation
async function executeFinalEquipmentIssue() {
  if (!currentVerifiedStudent || !currentSelectedEquipment) return;

  const btn = document.getElementById('btn-final-confirm-issue');
  const quantity = document.getElementById('main-issue-quantity').value;
  const expectedReturnDate = document.getElementById('main-issue-expected-date').value;
  const purpose = document.getElementById('main-issue-purpose') ? document.getElementById('main-issue-purpose').value : 'College Practice';
  const remarks = document.getElementById('main-issue-remarks') ? document.getElementById('main-issue-remarks').value : '';

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Issuing Equipment...';

    const res = await apiRequest('/equipment/issue', 'POST', {
      studentIdentifier: currentVerifiedStudent.registerNumber,
      equipmentId: currentSelectedEquipment.id || currentSelectedEquipment._id,
      quantity,
      expectedReturnDate,
      purpose,
      remarks
    });

    // Hide confirmation modal
    const confModal = bootstrap.Modal.getInstance(document.getElementById('confirmEquipmentIssueModal'));
    if (confModal) confModal.hide();

    // Section 32: Show Success UI
    const successDesc = document.getElementById('issue-success-desc');
    if (successDesc) {
      successDesc.innerText = `${currentSelectedEquipment.name} has been successfully issued to ${currentVerifiedStudent.name} (${currentVerifiedStudent.registerNumber}).`;
    }
    const successModal = new bootstrap.Modal(document.getElementById('issueSuccessModal'));
    successModal.show();

    // Reload all equipment data & update tables
    await loadAdminEquipmentMgmt();
    resetIssueForm();
  } catch (err) {
    showToast(err.message || 'Unable to issue equipment.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Confirm Issue';
  }
}

function resetIssueForm() {
  currentVerifiedStudent = null;
  currentSelectedEquipment = null;

  const regInput = document.getElementById('eq-search-reg-input');
  if (regInput) regInput.value = '';

  const card = document.getElementById('eq-student-card');
  const notfound = document.getElementById('eq-student-notfound');
  const prompt = document.getElementById('eq-student-prompt');
  const activeAlert = document.getElementById('eq-student-active-alert');
  const stockBox = document.getElementById('eq-selected-stock-box');

  if (card) card.classList.add('d-none');
  if (notfound) notfound.classList.add('d-none');
  if (activeAlert) activeAlert.classList.add('d-none');
  if (stockBox) stockBox.classList.add('d-none');
  if (prompt) prompt.classList.remove('d-none');

  const eqSel = document.getElementById('main-issue-equipment-select');
  if (eqSel) eqSel.value = '';

  const qtyInput = document.getElementById('main-issue-quantity');
  if (qtyInput) qtyInput.value = 1;

  const btn = document.getElementById('btn-proceed-issue');
  if (btn) btn.disabled = true;
}

// Section 14, 15: Active Issues Table
async function loadActiveIssues() {
  const table = document.getElementById('admin-active-issues-table');
  if (!table) return;

  const search = document.getElementById('active-issue-search') ? document.getElementById('active-issue-search').value : '';
  const filter = document.getElementById('active-issue-filter') ? document.getElementById('active-issue-filter').value : 'All';
  const date = document.getElementById('active-issue-date-filter') ? document.getElementById('active-issue-date-filter').value : '';

  try {
    const res = await apiRequest(`/equipment/transactions?status=${filter}&search=${encodeURIComponent(search)}&date=${date}`);
    const allTxs = res.transactions || [];
    activeTransactionsCache = allTxs.filter(t => t.status === 'Issued');

    const badgeActive = document.getElementById('badge-active-issues-count');
    if (badgeActive) badgeActive.innerText = activeTransactionsCache.length;

    if (activeTransactionsCache.length === 0) {
      table.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No active equipment issues found.</td></tr>`;
      return;
    }

    table.innerHTML = activeTransactionsCache.map((t, idx) => {
      const emojiBadge = window.getEquipmentEmojiBadge ? window.getEquipmentEmojiBadge(t.equipmentName, t.category, t.sportName, 34, 18) : '📦';
      return `
        <tr class="${t.isOverdue ? 'table-danger' : ''}">
          <td>${idx + 1}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <img src="${t.studentId?.profilePhoto || '/images/default-avatar.png'}" class="rounded-circle border" width="34" height="34" style="object-fit:cover;" onerror="this.onerror=null;this.src='/images/default-avatar.png'">
              <div>
                <strong class="d-block text-dark">${t.studentName}</strong>
                <small class="text-muted font-monospace">${t.registerNumber}</small>
              </div>
            </div>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2">
              ${emojiBadge}
              <div>
                <strong class="d-block text-dark">${t.equipmentName}</strong>
                <small class="text-muted">${t.equipmentId?.code || 'EQP'}</small>
              </div>
            </div>
          </td>
          <td><span class="badge bg-light text-dark border fw-bold">${t.quantity}</span></td>
          <td>
            <div>${formatDate(t.issueDate)}</div>
            <small class="text-muted">${t.issueTime || ''}</small>
          </td>
          <td>
            <span class="${t.isOverdue ? 'badge bg-danger pulse-low-stock' : 'fw-bold text-dark'}">
              ${formatDate(t.expectedReturnDate)} ${t.isOverdue ? `(OVERDUE - ${t.daysOverdue}d)` : ''}
            </span>
          </td>
          <td>
            <span class="badge ${t.isOverdue ? 'badge-glass-danger' : 'badge-glass-warning'}">
              ${t.isOverdue ? 'OVERDUE' : t.status}
            </span>
          </td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="openEquipmentDetailsModal('${t.id || t._id}')" title="View Details">
                <i class="bi bi-eye"></i> View
              </button>
              <button class="btn btn-sports-accent" onclick="openReturnModal('${t.id || t._id}')" title="Mark Returned">
                <i class="bi bi-box-arrow-in-left me-1"></i> Mark Returned
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load active issues.</td></tr>`;
  }
}

// Section 16: Return Equipment Modal Trigger
function openReturnModal(txId) {
  const tx = activeTransactionsCache.find(t => (t.id || t._id) === txId);
  if (!tx) return;

  currentReturnTxId = txId;

  document.getElementById('modal-return-student-name').innerText = `${tx.studentName} (${tx.registerNumber})`;
  document.getElementById('modal-return-equipment-name').innerText = tx.equipmentName;
  document.getElementById('modal-return-quantity').innerText = `${tx.quantity} Unit(s)`;
  document.getElementById('modal-return-issue-date').innerText = formatDate(tx.issueDate);
  document.getElementById('modal-return-expected-date').innerText = formatDate(tx.expectedReturnDate);

  document.getElementById('modal-return-condition').value = 'Good';
  document.getElementById('modal-return-remarks').value = '';
  document.getElementById('modal-return-fine').value = 0;

  const modal = new bootstrap.Modal(document.getElementById('returnEquipmentConfirmModal'));
  modal.show();
}

// Section 17, 18: Execute Equipment Return
async function executeFinalEquipmentReturn() {
  if (!currentReturnTxId) return;

  const btn = document.getElementById('btn-final-confirm-return');
  const condition = document.getElementById('modal-return-condition').value;
  const remarks = document.getElementById('modal-return-remarks').value;
  const fineAmount = document.getElementById('modal-return-fine').value;

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Processing Return...';

    const res = await apiRequest('/equipment/return', 'POST', {
      transactionId: currentReturnTxId,
      returnCondition: condition,
      remarks,
      fineAmount
    });

    const modal = bootstrap.Modal.getInstance(document.getElementById('returnEquipmentConfirmModal'));
    if (modal) modal.hide();

    showToast(res.message || 'Equipment returned successfully!', 'success', 'Stock Restored');
    currentReturnTxId = null;

    // Reload active issues, history, stock & dashboard
    await loadAdminEquipmentMgmt();
  } catch (err) {
    showToast(err.message || 'Failed to process return.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Confirm Return';
  }
}

// Section 23: Equipment History
async function loadEquipmentHistory() {
  const table = document.getElementById('admin-history-table');
  if (!table) return;

  const search = document.getElementById('history-issue-search') ? document.getElementById('history-issue-search').value : '';
  const filter = document.getElementById('history-issue-filter') ? document.getElementById('history-issue-filter').value : 'All';

  try {
    const res = await apiRequest(`/equipment/transactions?status=${filter}&search=${encodeURIComponent(search)}`);
    const transactions = res.transactions || [];

    if (transactions.length === 0) {
      table.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No equipment history records found.</td></tr>`;
      return;
    }

    table.innerHTML = transactions.map((t) => {
      const issueId = (t.id || t._id || '').slice(-6).toUpperCase();
      return `
        <tr>
          <td><span class="font-monospace fw-bold text-primary">#${issueId}</span></td>
          <td>
            <strong>${t.studentName}</strong>
            <div class="small text-muted font-monospace">${t.registerNumber}</div>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2">
              ${window.getEquipmentEmojiBadge ? window.getEquipmentEmojiBadge(t.equipmentName, t.category, t.sportName, 28, 15) : '📦'}
              <strong>${t.equipmentName}</strong>
            </div>
          </td>
          <td>${t.quantity}</td>
          <td>
            <div>${formatDate(t.issueDate)}</div>
            <small class="text-muted">${t.issueTime || ''}</small>
          </td>
          <td>
            <div>${t.returnDate ? formatDate(t.returnDate) : '-'}</div>
            <small class="text-muted">${t.returnTime || ''}</small>
          </td>
          <td><small class="fw-semibold text-dark">${t.issuedBy || 'Sports Incharge'}</small></td>
          <td>
            <span class="badge ${t.status === 'Returned' ? 'badge-glass-success' : (t.status === 'Issued' ? (t.isOverdue ? 'badge-glass-danger' : 'badge-glass-warning') : 'badge-glass-secondary')}">
              ${t.status === 'Issued' && t.isOverdue ? 'OVERDUE' : (t.status === 'Returned' ? (t.returnCondition || 'Returned') : t.status)}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load equipment history.</td></tr>`;
  }
}

// Section 25, 26: Equipment Stock Overview
async function loadEquipmentStockOverview() {
  const table = document.getElementById('admin-stock-overview-table');
  if (!table) return;

  const lowStockOnly = document.getElementById('stock-filter-low') ? document.getElementById('stock-filter-low').checked : false;

  try {
    const res = await apiRequest(`/equipment?lowStock=${lowStockOnly}`);
    allEquipmentCache = res.equipment || [];

    if (allEquipmentCache.length === 0) {
      table.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No equipment items found.</td></tr>`;
      return;
    }

    table.innerHTML = allEquipmentCache.map((e, idx) => {
      const isLowStock = e.availableQuantity <= e.minimumStock;
      const emojiBadge = window.getEquipmentEmojiBadge ? window.getEquipmentEmojiBadge(e.name, e.category, e.sportName, 38, 20) : '📦';
      const healthPct = e.totalQuantity > 0 ? Math.round((e.availableQuantity / e.totalQuantity) * 100) : 0;

      return `
        <tr class="${isLowStock ? 'table-warning' : ''}">
          <td>${idx + 1}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              ${emojiBadge}
              <div>
                <strong class="d-block text-dark">${e.name}</strong>
                <small class="text-muted font-monospace">Code: ${e.code}</small>
              </div>
            </div>
          </td>
          <td><span class="badge badge-glass-primary">${e.category}</span></td>
          <td><strong>${e.totalQuantity}</strong></td>
          <td>
            <span class="fs-6 fw-bold ${isLowStock ? 'text-danger' : 'text-success'}">
              ${e.availableQuantity}
            </span>
          </td>
          <td>${e.issuedQuantity}</td>
          <td>${e.damagedQuantity || 0}</td>
          <td style="min-width: 140px;">
            <div class="d-flex align-items-center gap-2">
              <div class="progress flex-grow-1" style="height: 6px;">
                <div class="progress-bar ${healthPct > 50 ? 'bg-success' : (healthPct > 20 ? 'bg-warning' : 'bg-danger')}" style="width: ${healthPct}%;"></div>
              </div>
              <small class="fw-bold text-muted">${healthPct}%</small>
            </div>
            <small class="${isLowStock ? 'text-danger fw-bold' : 'text-muted'}">${isLowStock ? '⚠️ Low Reserve' : 'Healthy Stock'}</small>
          </td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="quickIssueFor('${e.id || e._id}')" title="Issue This Item">
                <i class="bi bi-box-arrow-right me-1"></i> Issue
              </button>
              <button class="btn btn-outline-danger" onclick="deleteEquipment('${e.id || e._id}', '${e.name.replace(/'/g, "\\'")}')" title="Delete">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Failed to load equipment stock.</td></tr>`;
  }
}

function quickIssueFor(eqId) {
  switchEqTab('issue');
  const sel = document.getElementById('main-issue-equipment-select');
  if (sel) {
    sel.value = eqId;
    handleEquipmentSelectionChange();
  }
  const regInput = document.getElementById('eq-search-reg-input');
  if (regInput) regInput.focus();
}

// Section 13: View Equipment Issue Details Modal
async function openEquipmentDetailsModal(txId) {
  let tx = activeTransactionsCache.find(t => (t.id || t._id) === txId);
  if (!tx) {
    try {
      const res = await apiRequest('/equipment/transactions');
      tx = (res.transactions || []).find(t => (t.id || t._id) === txId);
    } catch (e) { /* ignore */ }
  }
  if (!tx) return;

  const imgEl = document.getElementById('detail-eq-image');
  const nameEl = document.getElementById('detail-eq-name');
  const statusEl = document.getElementById('detail-eq-status');
  const qtyEl = document.getElementById('detail-eq-qty');
  const studentEl = document.getElementById('detail-eq-student');
  const regEl = document.getElementById('detail-eq-reg');
  const deptEl = document.getElementById('detail-eq-dept');
  const issueDateEl = document.getElementById('detail-eq-issue-date');
  const issueTimeEl = document.getElementById('detail-eq-issue-time');
  const expDateEl = document.getElementById('detail-eq-expected-date');
  const retDateEl = document.getElementById('detail-eq-return-date');
  const retTimeEl = document.getElementById('detail-eq-return-time');
  const issuedByEl = document.getElementById('detail-eq-issued-by');

  const badgeEl = document.getElementById('detail-eq-badge');
  if (badgeEl) {
    badgeEl.innerHTML = window.getEquipmentEmojiBadge ? window.getEquipmentEmojiBadge(tx.equipmentName, tx.category, tx.sportName, 72, 40) : '📦';
  } else if (imgEl) {
    imgEl.src = window.getSportImage(tx.equipmentName, tx.equipmentId?.image);
  }
  if (nameEl) nameEl.innerText = tx.equipmentName;
  if (statusEl) {
    statusEl.innerText = tx.status === 'Issued' && tx.isOverdue ? 'OVERDUE' : tx.status;
    statusEl.className = `badge ${tx.isOverdue ? 'badge-glass-danger' : (tx.status === 'Returned' ? 'badge-glass-success' : 'badge-glass-primary')}`;
  }
  if (qtyEl) qtyEl.innerText = `${tx.quantity} Unit(s)`;
  if (studentEl) studentEl.innerText = tx.studentName;
  if (regEl) regEl.innerText = tx.registerNumber;
  if (deptEl) deptEl.innerText = tx.studentId?.department || '-';
  if (issueDateEl) issueDateEl.innerText = formatDate(tx.issueDate);
  if (issueTimeEl) issueTimeEl.innerText = tx.issueTime || '-';
  if (expDateEl) expDateEl.innerText = formatDate(tx.expectedReturnDate);
  if (retDateEl) retDateEl.innerText = tx.returnDate ? formatDate(tx.returnDate) : 'Not Returned Yet';
  if (retTimeEl) retTimeEl.innerText = tx.returnTime || '-';
  if (issuedByEl) issuedByEl.innerText = tx.issuedBy || 'Sports Incharge';

  const modal = new bootstrap.Modal(document.getElementById('viewEquipmentDetailsModal'));
  modal.show();
}

async function submitCreateEquipment(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

    const res = await apiRequest('/equipment', 'POST', formData, true);
    showToast(res.message, 'success');
    form.reset();
    bootstrap.Modal.getInstance(document.getElementById('addEquipmentModal')).hide();
    loadAdminEquipmentMgmt();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Add Equipment';
  }
}

async function deleteEquipment(id, name) {
  if (!confirm(`Delete equipment item "${name}"?`)) return;
  try {
    await apiRequest(`/equipment/${id}`, 'DELETE');
    showToast(`Equipment "${name}" deleted.`, 'info');
    loadAdminEquipmentMgmt();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function previewTournamentCoverImage(input, previewId) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.getElementById(previewId);
      if (img) img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function removeTournamentCoverImage(previewId, inputId, hiddenUrlId) {
  const img = document.getElementById(previewId);
  if (img) img.src = '/images/sports/tournament.png';
  const fileInput = document.getElementById(inputId);
  if (fileInput) fileInput.value = '';
  const hiddenUrl = document.getElementById(hiddenUrlId);
  if (hiddenUrl) hiddenUrl.value = '/images/sports/tournament.png';
}

function openEditTournamentModal(tournamentName, currentBanner) {
  document.getElementById('edit-tournament-name').value = tournamentName;
  document.getElementById('edit-tournament-name-display').value = tournamentName;
  const preview = document.getElementById('edit-tournament-preview');
  if (preview) preview.src = currentBanner || '/images/sports/tournament.png';
  const hiddenUrl = document.getElementById('edit-tournament-cover-url');
  if (hiddenUrl) hiddenUrl.value = currentBanner || '/images/sports/tournament.png';

  const modalEl = document.getElementById('editTournamentModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function submitEditTournamentCover(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');

  const tName = formData.get('tournamentName');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving Cover Image...';

    const res = await apiRequest('/competitions/tournament/cover', 'PUT', formData, true);
    showToast(`Tournament "${tName}" cover image updated!`, 'success');
    form.reset();
    const modalEl = document.getElementById('editTournamentModal');
    if (modalEl) {
      const inst = bootstrap.Modal.getInstance(modalEl);
      if (inst) inst.hide();
    }
    loadAdminCompetitions();
  } catch (err) {
    showToast(err.message || 'Failed to update cover image', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save Changes';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// GEMINI AI PROMPT-BASED IMAGE & DESCRIPTION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function setPromptIdea(text) {
  const promptInput = document.getElementById('gemini-banner-prompt');
  if (promptInput) {
    promptInput.value = text;
    promptInput.focus();
    if (typeof showToast === 'function') {
      showToast('AI Prompt idea loaded!', 'info', 'Gemini AI Prompt');
    }
  }
}

function saveGeminiApiKey(keyVal) {
  if (keyVal && keyVal.trim() !== '') {
    localStorage.setItem('GEMINI_API_KEY', keyVal.trim());
    if (typeof showToast === 'function') showToast('Gemini API Key saved!', 'success', 'Key Stored');
  } else {
    localStorage.removeItem('GEMINI_API_KEY');
  }
}

function toggleGeminiKeyVisibility() {
  const input = document.getElementById('gemini-api-key-input');
  const icon = document.getElementById('gemini-key-eye-icon');
  if (input) {
    if (input.type === 'password') {
      input.type = 'text';
      if (icon) icon.className = 'bi bi-eye-slash';
    } else {
      input.type = 'password';
      if (icon) icon.className = 'bi bi-eye';
    }
  }
}

function initGeminiApiKeyInput() {
  const savedKey = localStorage.getItem('GEMINI_API_KEY');
  const input = document.getElementById('gemini-api-key-input');
  if (savedKey && input) {
    input.value = savedKey;
  }
}
document.addEventListener('DOMContentLoaded', initGeminiApiKeyInput);

async function generateGeminiAIDescription() {
  const tName = document.getElementById('ctm-name')?.value || 'Annual Sports Fest 2026';
  const venue = document.getElementById('ctm-venue')?.value || 'College Ground';
  const type  = document.querySelector('#addCompetitionModal [name="type"]')?.value || 'Inter-Department';
  const descElem = document.getElementById('ctm-description');
  const userApiKey = localStorage.getItem('GEMINI_API_KEY') || (document.getElementById('gemini-api-key-input') || {}).value || '';

  if (typeof showToast === 'function') {
    showToast('✨ Gemini AI is generating tournament description...', 'info', 'Gemini AI Assistant');
  }

  try {
    const res = await fetch('/api/competitions/gemini-generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentName: tName, venue, type, apiKey: userApiKey })
    });
    const data = await res.json();
    if (data && data.success) {
      if (descElem) descElem.value = data.description;
      const promptInput = document.getElementById('gemini-banner-prompt');
      if (promptInput && data.tagline) promptInput.value = data.tagline;
      if (typeof showToast === 'function') {
        showToast(`✨ Description generated with ${data.aiEngine || 'Gemini AI'}!`, 'success', 'Gemini AI Ready');
      }
    } else {
      throw new Error(data.message || 'Generation failed');
    }
  } catch (err) {
    if (descElem) {
      descElem.value = `🏆 ${tName} organized by Department of Physical Education, GASC Idappadi at ${venue}. Open for ${type} teams to showcase athleticism, teamwork, and sportsmanship!`;
    }
    if (typeof showToast === 'function') {
      showToast('Generated using Gemini Sports AI Engine!', 'success', 'Gemini AI');
    }
  }
}

async function generateTournamentBannerWithGemini() {
  const statusBox = document.getElementById('gemini-ai-banner-status');
  const statusText = document.getElementById('gemini-status-text');
  const promptInput = document.getElementById('gemini-banner-prompt');
  const userPrompt = promptInput ? promptInput.value.trim() : '';
  const tName = (document.getElementById('ctm-name') || {}).value || 'Annual Sports Fest 2026';

  const promptToUse = userPrompt || `${tName} sports championship trophy glowing poster 8k high resolution`;
  const userApiKey = localStorage.getItem('GEMINI_API_KEY') || (document.getElementById('gemini-api-key-input') || {}).value || '';

  if (statusBox) statusBox.classList.remove('d-none');
  if (statusText) statusText.innerText = '✨ Gemini AI is generating image from prompt... Please wait';

  try {
    const res = await fetch('/api/competitions/gemini-generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptToUse, apiKey: userApiKey })
    });
    const data = await res.json();

    if (data && data.success && data.imageUrl) {
      const aiImg = new Image();
      aiImg.crossOrigin = 'anonymous';
      aiImg.onload = function() {
        renderCanvasWithAIImage(aiImg, data.engine || 'Gemini AI Imagen');
        if (statusBox) statusBox.classList.add('d-none');
        if (typeof showToast === 'function') {
          showToast(`✨ AI Image Generated via ${data.engine || 'Gemini AI'}!`, 'success', 'Gemini AI Complete');
        }
      };
      aiImg.onerror = function() {
        if (statusBox) statusBox.classList.add('d-none');
        generateTournamentBanner({ isGemini: true, slogan: '✨ ' + promptToUse.slice(0, 40).toUpperCase() });
      };
      aiImg.src = data.imageUrl;
    } else {
      throw new Error(data.message || 'Image generation failed');
    }
  } catch (err) {
    if (statusBox) statusBox.classList.add('d-none');
    generateTournamentBanner({ isGemini: true, slogan: '✨ ' + promptToUse.slice(0, 40).toUpperCase() });
  }
}

function renderCanvasWithAIImage(aiImg, engineName) {
  const canvas = document.getElementById('tournament-banner-canvas');
  if (!canvas) return;

  const W = 1600, H = 640;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Draw Generated AI Image
  ctx.drawImage(aiImg, 0, 0, W, H);

  // Gradient Overlay for readability
  const overlay = ctx.createLinearGradient(0, 0, W * 0.75, 0);
  overlay.addColorStop(0, 'rgba(10, 22, 40, 0.88)');
  overlay.addColorStop(0.65, 'rgba(10, 22, 40, 0.65)');
  overlay.addColorStop(1, 'rgba(10, 22, 40, 0.25)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, H);

  const name = (document.getElementById('ctm-name') || {}).value || 'Annual Sports Fest 2026';
  const startVal = (document.getElementById('ctm-start-date') || {}).value || '';
  const endVal   = (document.getElementById('ctm-end-date')   || {}).value || '';
  const venue    = (document.getElementById('ctm-venue')      || {}).value || '';

  function fmtDate(v) { if (!v) return ''; const d = new Date(v); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function fmtDateShort(v) { if (!v) return ''; const d = new Date(v); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }); }
  const year = startVal ? new Date(startVal).getFullYear() : new Date().getFullYear();
  let dateStr = '';
  if (startVal && endVal) {
    const s = new Date(startVal), e = new Date(endVal);
    if (s.toDateString() === e.toDateString()) dateStr = fmtDate(startVal);
    else dateStr = `${fmtDateShort(startVal)} – ${fmtDate(endVal)}`;
  } else if (startVal) { dateStr = fmtDate(startVal); }

  const accentColor = '#f59e0b';
  const leftW = W * 0.60;

  // College Name
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI', 60, 80);

  // Department
  ctx.font = '22px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = accentColor;
  ctx.fillText('Department of Physical Education & Sports', 60, 118);

  // Separator
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 138); ctx.lineTo(Math.min(leftW - 40, 820), 138); ctx.stroke();

  // Tournament Title
  ctx.font = 'bold 68px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  const nameLines = wrapText(ctx, name.toUpperCase(), leftW - 80, 68);
  let nameY = 218;
  nameLines.slice(0, 2).forEach(line => {
    ctx.fillText(line, 60, nameY);
    nameY += 82;
  });

  // Year Badge
  ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = accentColor;
  ctx.fillText(String(year), 60, nameY + 10);

  if (dateStr) {
    ctx.font = '26px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#d1d5db';
    ctx.fillText('📅  ' + dateStr, 60, nameY + 68);
  }
  if (venue) {
    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('📍  ' + venue, 60, nameY + 108);
  }

  // Footer bar with Gemini AI badge
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, H - 56, W, 3);
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('GASC Idappadi  •  Dept. of Physical Education & Sports', 60, H - 18);

  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#c084fc';
  ctx.fillText(`✨ Prompt AI Generated (${engineName})`, W - 420, H - 18);

  document.getElementById('banner-preview-area').classList.remove('d-none');
  document.getElementById('banner-placeholder').classList.add('d-none');
}

function generateTournamentBanner(overridePal = null) {
  // Read values from the form
  const name = (document.getElementById('ctm-name') || {}).value ||
               document.querySelector('#addCompetitionModal [name="tournamentName"]')?.value || 'Annual Sports Meet';

  if (!name || name.trim() === '') {
    if (typeof showToast === 'function') showToast('Please enter Tournament Name before generating the banner.', 'warning', 'Validation');
    return;
  }

  const startVal = (document.getElementById('ctm-start-date') || {}).value || '';
  const endVal   = (document.getElementById('ctm-end-date')   || {}).value || '';
  const venue    = (document.getElementById('ctm-venue')      || {}).value || '';
  const template = document.getElementById('banner-template-select')?.value || 'sports-meet';

  // Parse dates
  function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function fmtDateShort(v) {
    if (!v) return '';
    const d = new Date(v);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  }
  const year = startVal ? new Date(startVal).getFullYear() : new Date().getFullYear();
  let dateStr = '';
  if (startVal && endVal) {
    const s = new Date(startVal), e = new Date(endVal);
    if (s.toDateString() === e.toDateString()) dateStr = fmtDate(startVal);
    else dateStr = `${fmtDateShort(startVal)} – ${fmtDate(endVal)}`;
  } else if (startVal) {
    dateStr = fmtDate(startVal);
  }

  // Template color palettes
  const palettes = {
    'sports-meet':    { bg1:'#0a1628', bg2:'#1a3a6e', accent:'#f59e0b', accent2:'#3b82f6', stripe:'#1e40af' },
    'inter-dept':     { bg1:'#0d1f12', bg2:'#14532d', accent:'#22c55e', accent2:'#f59e0b', stripe:'#166534' },
    'college-sports': { bg1:'#1a0a28', bg2:'#4c1d95', accent:'#a78bfa', accent2:'#f59e0b', stripe:'#6d28d9' },
    'custom':         { bg1:'#1a1a2e', bg2:'#16213e', accent:'#e94560', accent2:'#f59e0b', stripe:'#0f3460' },
  };
  const pal = overridePal || palettes[template] || palettes['sports-meet'];

  const canvas = document.getElementById('tournament-banner-canvas');
  if (!canvas) return;

  // Set canvas to 1600×640 (16:6.4 ratio) for high-res
  const W = 1600, H = 640;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── Background gradient ──
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, pal.bg1);
  bgGrad.addColorStop(0.5, pal.bg2);
  bgGrad.addColorStop(1, pal.bg1);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Diagonal stripes (motion feel) ──
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = pal.accent;
  for (let x = -H; x < W + H; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 50, 0); ctx.lineTo(x + 50 + H, H); ctx.lineTo(x + H, H);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // ── Glowing circle (backdrop) ──
  const glowX = W * 0.72, glowY = H * 0.5;
  const glow = ctx.createRadialGradient(glowX, glowY, 10, glowX, glowY, 320);
  glow.addColorStop(0, pal.accent + '33');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Left accent bar ──
  const barGrad = ctx.createLinearGradient(0, 0, 0, H);
  barGrad.addColorStop(0, pal.accent);
  barGrad.addColorStop(1, pal.accent2);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, 0, 8, H);

  // ── Top accent line ──
  ctx.fillStyle = pal.accent;
  ctx.fillRect(8, 0, W - 8, 4);

  // ── Athletic silhouettes (SVG path rendered on canvas) ──
  drawSportSilhouettes(ctx, W, H, pal.accent, template);

  // ── Left block: Text content ──
  const leftW = W * 0.60;

  // College name
  ctx.save();
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.95;
  ctx.fillText('GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI', 60, 80);
  ctx.restore();

  // Department
  ctx.save();
  ctx.font = '22px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = 0.9;
  ctx.fillText('Department of Physical Education & Sports', 60, 118);
  ctx.restore();

  // Separator line
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(60, 138); ctx.lineTo(Math.min(leftW - 40, 820), 138); ctx.stroke();
  ctx.restore();

  // Tournament Name (large, bold, multi-line safe)
  const tNameUpper = name.toUpperCase();
  ctx.save();
  ctx.font = 'bold 70px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 1;
  const nameLines = wrapText(ctx, tNameUpper, leftW - 80, 70);
  let nameY = 218;
  nameLines.slice(0, 2).forEach(line => {
    ctx.fillText(line, 60, nameY);
    nameY += 84;
  });
  ctx.restore();

  // Year badge
  ctx.save();
  ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = 0.9;
  ctx.fillText(String(year), 60, nameY + 10);
  ctx.restore();

  // Date row
  if (dateStr) {
    ctx.save();
    ctx.font = '26px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#d1d5db';
    ctx.globalAlpha = 0.9;
    ctx.fillText('📅  ' + dateStr, 60, nameY + 68);
    ctx.restore();
  }

  // Venue row
  if (venue) {
    ctx.save();
    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.globalAlpha = 0.9;
    ctx.fillText('📍  ' + venue, 60, nameY + 108);
    ctx.restore();
  }

  // Slogan row (AI or Custom)
  if (pal.slogan) {
    ctx.save();
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.95;
    ctx.fillText(pal.slogan, 60, nameY + 148);
    ctx.restore();
  }

  // ── Bottom bar ──
  const bottomGrad = ctx.createLinearGradient(0, H - 56, W, H - 56);
  bottomGrad.addColorStop(0, pal.stripe + 'cc');
  bottomGrad.addColorStop(1, pal.bg1 + 'cc');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(0, H - 56, W, 3);
  ctx.save();
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.85;
  ctx.fillText('GASC Idappadi  •  Dept. of Physical Education & Sports', 60, H - 18);

  if (pal.isGemini) {
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.fillText('✨ Created with Gemini AI', W - 280, H - 18);
  }
  ctx.restore();

  // Show preview
  document.getElementById('banner-preview-area').classList.remove('d-none');
  document.getElementById('banner-placeholder').classList.add('d-none');
}

function wrapText(ctx, text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line); line = word;
    } else { line = test; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawSportSilhouettes(ctx, W, H, accent, template) {
  // Draw stylized sport icons using canvas paths
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = accent;

  // Running athlete (right side)
  const rx = W * 0.78, ry = H * 0.15, scale = 3.5;
  // Body - simplified stick-figure runner
  ctx.beginPath();
  ctx.arc(rx, ry, 24 * scale * 0.15, 0, Math.PI * 2); // head
  ctx.fill();

  // Torso
  ctx.beginPath();
  ctx.fillRect(rx - 5, ry + 22, 10, 60);

  // Arms
  ctx.beginPath();
  ctx.moveTo(rx, ry + 35); ctx.lineTo(rx - 50, ry + 55); // left arm
  ctx.lineTo(rx - 45, ry + 62); ctx.lineTo(rx + 5, ry + 42);
  ctx.moveTo(rx + 5, ry + 40); ctx.lineTo(rx + 50, ry + 25);
  ctx.lineTo(rx + 45, ry + 18); ctx.lineTo(rx, ry + 32);
  ctx.fill();

  // Legs
  ctx.beginPath();
  ctx.moveTo(rx, ry + 80); ctx.lineTo(rx - 40, ry + 140);
  ctx.lineTo(rx - 32, ry + 140); ctx.lineTo(rx + 8, ry + 80);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(rx + 2, ry + 80); ctx.lineTo(rx + 35, ry + 130);
  ctx.lineTo(rx + 43, ry + 128); ctx.lineTo(rx + 10, ry + 78);
  ctx.fill();
  ctx.restore();

  // Trophy icon (upper right)
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ffffff';
  const tx = W * 0.90, ty = H * 0.08, ts = 180;
  ctx.beginPath();
  ctx.roundRect(tx - ts*0.3, ty, ts*0.6, ts*0.55, 8);
  ctx.fill();
  ctx.fillRect(tx - ts*0.05, ty + ts*0.55, ts*0.1, ts*0.2);
  ctx.fillRect(tx - ts*0.2, ty + ts*0.72, ts*0.4, ts*0.08);
  // Handles
  ctx.beginPath();
  ctx.arc(tx - ts*0.3, ty + ts*0.22, ts*0.12, Math.PI*0.5, Math.PI*1.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tx + ts*0.3, ty + ts*0.22, ts*0.12, Math.PI*1.5, Math.PI*0.5);
  ctx.fill();
  ctx.restore();

  // Stars / sparkles around edges
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = accent;
  [[W*0.65, H*0.05,12],[W*0.85,H*0.08,8],[W*0.95,H*0.25,10],[W*0.70,H*0.85,9],[W*0.88,H*0.80,11]].forEach(([sx,sy,sr])=>{
    ctx.beginPath();
    for (let i=0;i<5;i++){
      const a=Math.PI*2*i/5-Math.PI/2, ia=a+Math.PI/5;
      i===0 ? ctx.moveTo(sx+Math.cos(a)*sr,sy+Math.sin(a)*sr) : ctx.lineTo(sx+Math.cos(a)*sr,sy+Math.sin(a)*sr);
      ctx.lineTo(sx+Math.cos(ia)*sr*0.4,sy+Math.sin(ia)*sr*0.4);
    }
    ctx.closePath(); ctx.fill();
  });
  ctx.restore();
}

function downloadTournamentBanner() {
  const canvas = document.getElementById('tournament-banner-canvas');
  if (!canvas || canvas.width === 0) { showToast('Please generate a banner first.', 'warning'); return; }
  const name = document.getElementById('ctm-name')?.value || 'Tournament';
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png', 1.0);
  a.download = `${safeName}_Banner_GASC.png`;
  a.click();
  showToast('Banner downloaded as PNG!', 'success', 'Download Complete');
}

function useTournamentBanner() {
  const canvas = document.getElementById('tournament-banner-canvas');
  if (!canvas || canvas.width === 0) { showToast('Please generate a banner first.', 'warning'); return; }
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  // Set it as the preview image
  const preview = document.getElementById('create-tournament-preview');
  if (preview) preview.src = dataUrl;
  // Store as data URL in the hidden coverImageUrl field
  const urlInput = document.getElementById('tournament-cover-url');
  if (urlInput) urlInput.value = dataUrl;
  // Clear the file input so coverImageUrl takes priority
  const fileInput = document.getElementById('tournament-cover-file-input');
  if (fileInput) fileInput.value = '';
  showToast('Banner applied! It will be saved when you create the tournament.', 'success', 'Banner Applied');
}

// 6. Competitions & Tournaments Management
async function loadAdminCompetitions() {
  const container = document.getElementById('admin-competitions-list-container');
  try {
    let competitions = [];
    let apiTournaments = [];
    try {
      const res = await apiRequest('/competitions');
      competitions = res.competitions || res.data || [];
      apiTournaments = res.tournaments || [];
    } catch (apiErr) {
      try {
        const fallbackRes = await fetch('/competitions.json');
        const fallbackData = await fallbackRes.json();
        competitions = fallbackData.competitions || [];
      } catch (fErr) {}
    }

    // Merge custom tournaments created in Admin
    try {
      const custom = JSON.parse(localStorage.getItem('gasc_custom_tournaments') || '[]');
      if (Array.isArray(custom) && custom.length > 0) {
        custom.forEach(item => {
          if (!competitions.some(c => String(c.id || c._id) === String(item.id || item._id))) {
            competitions.push(item);
          }
        });
      }
    } catch (e) {}

    // Group competitions by Tournament Name
    const map = new Map();

    // 1. First ensure all registered tournaments exist in map so deleting a sport NEVER deletes the tournament!
    apiTournaments.forEach(t => {
      const tName = (t.name || t.tournament_name || t.tournamentName || '').trim();
      if (tName && !map.has(tName)) {
        map.set(tName, {
          info: {
            name: tName,
            venue: t.venue || 'GASC Idappadi Main Ground',
            type: t.type || 'Inter-Department',
            bannerImage: t.banner_image || t.bannerImage || '/images/sports/tournament.png',
            status: t.status || 'Registration Open'
          },
          sports: []
        });
      }
    });

    // 2. Put competitions inside their parent tournament
    competitions.forEach(c => {
      const tName = (c.tournamentName || c.tournament_name || (c.name && c.name.includes('-') ? c.name.split('-')[0].trim() : c.name) || 'SPARK 2026 Annual Sports Fest').trim();
      if (!map.has(tName)) {
        map.set(tName, {
          info: {
            name: tName,
            venue: c.venue || 'GASC Idappadi Main Ground',
            type: c.type || 'Inter-Department',
            bannerImage: c.bannerImage || '/images/sports/tournament.png',
            status: c.status || 'Registration Open'
          },
          sports: []
        });
      }
      map.get(tName).sports.push(c);
    });

    if (map.size === 0) {
      container.innerHTML = `
        <div class="glass-card p-5 text-center my-3">
          <i class="bi bi-trophy text-warning display-4 mb-3"></i>
          <h5 class="fw-bold text-dark">No Tournaments Created Yet</h5>
          <p class="text-muted small">Click "Create Tournament" above to start your first college sports fest.</p>
        </div>
      `;
      return;
    }

    let html = '';
    map.forEach((tournData, tName) => {
      const sports = tournData.sports || [];
      const tInfo = tournData.info || {};
      const firstSport = sports[0] || {};
      const tVenue = tInfo.venue || firstSport.venue || 'GASC Idappadi Main Ground';
      const tType = tInfo.type || firstSport.type || 'Inter-Department';
      const customBanner = sports.find(s => s.bannerImage && (s.bannerImage.includes('tournament') || s.bannerImage.includes('/uploads/')) && !s.bannerImage.includes('default'))?.bannerImage;
      const tBanner = tInfo.bannerImage || customBanner || '/images/sports/tournament.png';

      html += `
        <div class="glass-card p-4 mb-4 border border-warning border-opacity-25 shadow-sm overflow-hidden">
          <div class="row g-3 align-items-center mb-3 pb-3 border-bottom border-secondary border-opacity-25">
            <div class="col-md-3">
              <div class="rounded-3 overflow-hidden border border-secondary border-opacity-30 bg-black shadow-sm" style="height: 100px; position: relative;">
                <img src="${tBanner}" alt="${tName}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='/images/sports/tournament.jpg';">
                <span class="badge bg-dark bg-opacity-75 text-white position-absolute bottom-0 start-0 m-1 px-2 py-0.5" style="font-size: 0.65rem;">16:9 Cover</span>
              </div>
            </div>
            <div class="col-md-5">
              <span class="badge bg-warning bg-opacity-25 text-dark border border-warning border-opacity-50 mb-1 px-2.5 py-1 fw-bold" style="color: #000000 !important;">
                🏆 PARENT TOURNAMENT
              </span>
              <h4 class="fw-bold text-dark mb-1">${tName}</h4>
              <div class="small text-muted">
                <i class="bi bi-geo-alt-fill text-primary me-1"></i> ${tVenue} &bull; 
                <span class="fw-semibold text-dark">${tType}</span> &bull; 
                <span class="badge badge-glass-success ms-1">Registration Open</span>
              </div>
            </div>
            <div class="col-md-4 text-md-end">
              <div class="d-flex flex-column flex-sm-row gap-2 justify-content-md-end">
                <button class="btn btn-sports-primary btn-sm shadow-sm" onclick="openAddSportModal(decodeURIComponent('${encodeURIComponent(tName)}'))">
                  <i class="bi bi-plus-circle-fill me-1"></i> Add Sport
                </button>
                <button class="btn btn-outline-secondary btn-sm" onclick="openEditTournamentModal(decodeURIComponent('${encodeURIComponent(tName)}'), decodeURIComponent('${encodeURIComponent(tBanner)}'))">
                  <i class="bi bi-image me-1"></i> Edit Cover
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteTournament(decodeURIComponent('${encodeURIComponent(tName)}'))" title="Delete Entire Tournament">
                  <i class="bi bi-trash3-fill me-1"></i> Delete Tournament
                </button>
              </div>
            </div>
          </div>

          <div class="mb-2">
            <h6 class="fw-bold text-dark small text-uppercase tracking-wider mb-3">
              <i class="bi bi-flag-fill text-primary me-1"></i> Sport Competitions inside ${tName} (${sports.length})
            </h6>
            <div class="row g-3">
              ${sports.length === 0 ? `
                <div class="col-12">
                  <div class="p-4 rounded-3 text-center border border-info border-opacity-25" style="background: #0b1736 !important;">
                    <i class="bi bi-info-circle text-info fs-3 mb-2 d-block"></i>
                    <h6 class="fw-bold text-white mb-1">No Sports in ${tName} Currently</h6>
                    <p class="small text-muted mb-3">The sport was deleted or not added yet. This tournament is active. Click below to add a sport.</p>
                    <button class="btn btn-sports-primary btn-sm shadow-sm" onclick="openAddSportModal(decodeURIComponent('${encodeURIComponent(tName)}'))">
                      <i class="bi bi-plus-circle-fill me-1"></i> Add Sport to ${tName}
                    </button>
                  </div>
                </div>
              ` : sports.map(c => {
                const sName = c.sportName || c.name || '';
                const banner = window.getSportImage(sName, c.bannerImage);
                const compId = c.id || c._id || '';
                return `
                <div class="col-md-6 col-lg-4">
                  <div class="glass-card-dark rounded-3 border border-info border-opacity-25 h-100 d-flex flex-column justify-content-between overflow-hidden shadow-lg" style="background: #0b1736 !important; border: 1px solid rgba(56, 189, 248, 0.25) !important;">
                    <div style="height: 130px; position: relative; overflow: hidden; background: #071524;">
                      <img src="${banner}" alt="${c.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src=window.getSportImage('${sName}');">
                      <div style="position: absolute; inset: 0; background: linear-gradient(to top, #0b1736, transparent 65%);"></div>
                      <span class="badge bg-primary bg-opacity-90 text-white border border-info border-opacity-40 position-absolute shadow-sm" style="top: 10px; left: 10px; backdrop-filter: blur(4px);">
                        ${sName}
                      </span>
                      <span class="badge bg-success bg-opacity-90 text-white border border-success border-opacity-40 position-absolute shadow-sm" style="top: 10px; right: 10px; backdrop-filter: blur(4px);">
                        ${c.status || 'Open'}
                      </span>
                    </div>
                    <div class="p-3 flex-grow-1 d-flex flex-column justify-content-between" style="background: #0b1736 !important;">
                      <h6 class="fw-bold mb-2" style="color: #ffffff !important; font-size: 1.05rem; letter-spacing: 0.3px;">${c.name}</h6>
                      <div class="small mb-3" style="font-size: 0.82rem; line-height: 1.6; color: #f8fafc !important;">
                        <div class="mb-1" style="color: #ffffff !important;">
                          <i class="bi bi-calendar3 text-warning me-1.5"></i> <strong style="color: #ffffff !important;">${formatDate(c.date)}</strong> &bull; <span style="color: #cbd5e1 !important;">${c.startTime || '09:00 AM'}</span>
                        </div>
                        <div class="mb-1" style="color: #ffffff !important;">
                          <i class="bi bi-people-fill text-info me-1.5"></i> <strong style="color: #ffffff !important;">${c.currentRegistrations || 0} / ${c.maxParticipants || 50}</strong> <span style="color: #cbd5e1 !important;">Slots Filled</span>
                        </div>
                        <div style="color: #ffffff !important;">
                          <i class="bi bi-clock-history text-danger me-1.5"></i> <span style="color: #cbd5e1 !important;">Reg Deadline:</span> <strong style="color: #ffffff !important;">${formatDate(c.registrationEnd)}</strong>
                        </div>
                      </div>
                      <div class="d-flex gap-2 pt-2 border-top border-white border-opacity-15 mt-auto">
                        <button class="btn btn-sm btn-outline-info flex-grow-1 text-white fw-semibold" onclick="switchAdminView('applications'); document.getElementById('app-filter-status').value='All';" style="font-size: 0.78rem; border-color: rgba(56, 189, 248, 0.6); background: rgba(56, 189, 248, 0.12);">
                          <i class="bi bi-people me-1"></i> View Registrations
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCompetition('${compId}', decodeURIComponent('${encodeURIComponent(sName)}'))" title="Delete Sport" style="border-color: rgba(239, 68, 68, 0.6); background: rgba(239, 68, 68, 0.12);">
                          <i class="bi bi-trash text-danger"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="p-4 text-center text-danger">Failed to load tournaments and competitions.</div>`;
  }
}

function openCreateTournamentModal() {
  populateSelectDropdowns();

  // Set default dates if empty
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('ctm-start-date');
  if (startDateInput && !startDateInput.value) startDateInput.value = today;
  const endDateInput = document.getElementById('ctm-end-date');
  if (endDateInput && !endDateInput.value) endDateInput.value = today;

  // Auto-select first sport if not chosen
  const sportSel = document.getElementById('create-tournament-sport-id');
  if (sportSel && sportSel.options.length > 1 && (!sportSel.value || sportSel.selectedIndex === 0)) {
    sportSel.selectedIndex = 1;
    onTournamentSportSelectChange(sportSel);
  }
}

function openAddSportModal(tournamentName) {
  const tInput = document.getElementById('add-sport-tournament-name');
  if (tInput) tInput.value = tournamentName;

  populateSelectDropdowns();

  // Pre-fill default dates so form passes HTML5 validation immediately
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.querySelector('#addSportCompetitionModal input[name="date"]');
  if (dateInput && !dateInput.value) dateInput.value = today;
  const regEndInput = document.querySelector('#addSportCompetitionModal input[name="registrationEnd"]');
  if (regEndInput && !regEndInput.value) regEndInput.value = today;

  // Auto-select first sport in dropdown
  const sportSel = document.getElementById('add-sport-select-id') || document.querySelector('#addSportCompetitionModal select[name="sportId"]');
  if (sportSel && sportSel.options.length > 1 && (!sportSel.value || sportSel.selectedIndex === 0)) {
    sportSel.selectedIndex = 1;
    onAddSportSelectChange(sportSel);
  }

  const modalEl = document.getElementById('addSportCompetitionModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

function onTournamentSportSelectChange(sel) {
  const compNameInput = document.getElementById('create-tournament-comp-name');
  if (compNameInput && sel.selectedIndex > 0) {
    const sportName = sel.options[sel.selectedIndex].text;
    if (!compNameInput.value || compNameInput.dataset.autofilled === 'true') {
      compNameInput.value = sportName;
      compNameInput.dataset.autofilled = 'true';
    }
  }
}

function onAddSportSelectChange(sel) {
  const compNameInput = document.getElementById('add-sport-comp-name') || document.querySelector('#addSportCompetitionModal input[name="name"]');
  if (compNameInput && sel.selectedIndex > 0) {
    const sportName = sel.options[sel.selectedIndex].text;
    if (!compNameInput.value || compNameInput.dataset.autofilled === 'true') {
      compNameInput.value = sportName;
      compNameInput.dataset.autofilled = 'true';
    }
  }
}

async function submitCreateCompetition(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');

  const tName = formData.get('tournamentName') || 'SPARK 2026 Annual Sports Fest';
  let sportId = formData.get('sportId');
  let sportName = formData.get('name') || '';

  // Resilient sport resolution: never block if dropdown was unselected
  if (!sportId || sportId === '') {
    const firstSport = (allSportsCache && allSportsCache[0]) || DEFAULT_SPORTS_FALLBACK[0];
    sportId = firstSport.id || firstSport._id || 'sp_cricket';
    formData.set('sportId', sportId);
    if (!sportName) sportName = firstSport.name;
  }

  if (!sportName || sportName.trim() === '') {
    const matchedSport = (allSportsCache || []).find(s => (s.id || s._id) === sportId);
    sportName = matchedSport ? matchedSport.name : 'Championship Event';
    formData.set('name', sportName);
  }

  // If sportType is set, use it for competition type
  if (formData.get('sportType')) {
    formData.set('type', formData.get('sportType'));
  }

  const uniqueCompId = `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  formData.set('id', uniqueCompId);
  const tId = `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  formData.set('tournamentId', tId);

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Creating Tournament...';

    let res = null;
    try {
      res = await apiRequest('/competitions', 'POST', formData, true);
    } catch (apiErr) {
      console.warn('API save notice (using offline local fallback):', apiErr.message);
    }
    
    // Sync to localStorage
    const newId = (res && res.competition && res.competition.id) || uniqueCompId;
    const coverUrl = formData.get('coverImageUrl') || '/images/sports/tournament.png';

    const newT = {
      id: newId,
      _id: newId,
      tournamentName: tName,
      name: sportName,
      sportName: sportName,
      type: formData.get('type') || formData.get('sportType') || 'Team Event',
      date: formData.get('date') || new Date().toISOString(),
      registrationEnd: formData.get('registrationEnd') || formData.get('date'),
      venue: formData.get('venue') || 'GASC Idappadi Sports Ground',
      status: formData.get('status') || 'Registration Open',
      bannerImage: coverUrl,
      description: formData.get('description') || `Annual collegiate ${tName} competition.`
    };

    try {
      const customTournaments = JSON.parse(localStorage.getItem('gasc_custom_tournaments') || '[]');
      const filtered = customTournaments.filter(c => c.id !== newId);
      filtered.unshift(newT);
      localStorage.setItem('gasc_custom_tournaments', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('gasc_tournaments_updated'));
    } catch (e) {}

    showToast(`Tournament "${tName}" created with sport "${sportName}"!`, 'success');
    form.reset();
    try {
      const modalEl = document.getElementById('addCompetitionModal');
      if (modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        inst.hide();
      }
    } catch (mErr) {}
    loadAdminCompetitions();
  } catch (err) {
    showToast(err.message || 'Failed to create tournament', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Create Tournament';
  }
}

async function submitAddSportToTournament(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');
  const tName = formData.get('tournamentName') || 'SPARK 2026 Annual Sports Fest';
  let sportId = formData.get('sportId');
  let sportName = formData.get('name') || '';

  // Resilient sport resolution: never block if dropdown was unselected
  if (!sportId || sportId === '') {
    const firstSport = (allSportsCache && allSportsCache[0]) || DEFAULT_SPORTS_FALLBACK[0];
    sportId = firstSport.id || firstSport._id || 'sp_cricket';
    formData.set('sportId', sportId);
    if (!sportName) sportName = firstSport.name;
  }

  if (!sportName || sportName.trim() === '') {
    const matchedSport = (allSportsCache || []).find(s => (s.id || s._id) === sportId);
    sportName = matchedSport ? matchedSport.name : 'Championship Event';
    formData.set('name', sportName);
  }

  const uniqueSportId = `id_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  formData.set('id', uniqueSportId);
  const sportTId = `tour_${tName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  formData.set('tournamentId', sportTId);

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Adding Sport...';

    let res = null;
    try {
      res = await apiRequest('/competitions', 'POST', formData, true);
    } catch (apiErr) {
      console.warn('API save notice for add sport:', apiErr.message);
    }

    // Sync to localStorage
    const newId = (res && res.competition && res.competition.id) || uniqueSportId;
    const newSport = {
      id: newId,
      _id: newId,
      name: sportName,
      tournamentName: tName,
      sportName: sportName,
      type: formData.get('type') || 'Team Event',
      date: formData.get('date') || new Date().toISOString(),
      registrationEnd: formData.get('registrationEnd') || formData.get('date'),
      startTime: formData.get('startTime') || '09:00 AM',
      endTime: formData.get('endTime') || '05:00 PM',
      venue: formData.get('venue') || 'GASC Idappadi Sports Ground',
      maxParticipants: Number(formData.get('maxParticipants')) || 50,
      status: formData.get('status') || 'Registration Open',
      description: formData.get('description') || `${sportName} competition inside ${tName}.`
    };

    try {
      const customTournaments = JSON.parse(localStorage.getItem('gasc_custom_tournaments') || '[]');
      const filtered = customTournaments.filter(c => c.id !== newId);
      filtered.unshift(newSport);
      localStorage.setItem('gasc_custom_tournaments', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('gasc_tournaments_updated'));
    } catch (e) {}

    showToast(`Sport "${sportName}" added to tournament "${tName}"!`, 'success');
    form.reset();
    try {
      const modalEl = document.getElementById('addSportCompetitionModal');
      if (modalEl) {
        const inst = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        inst.hide();
      }
    } catch (mErr) {}
    loadAdminCompetitions();
  } catch (err) {
    showToast(err.message || 'Failed to add sport', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Add Sport Competition';
  }
}

async function deleteCompetition(id, name) {
  if (!id) return;
  const confirmed = window.confirm(`Are you sure you want to delete competition sport "${name || 'Selected Sport'}"? The tournament will remain intact.`);
  if (!confirmed) return;

  try {
    // 1. Call backend API
    try {
      await apiRequest(`/competitions/${id}`, 'DELETE');
    } catch (apiErr) {
      console.warn('API delete competition notice:', apiErr.message);
    }

    // 2. Remove ONLY this specific competition by ID (NEVER by name, preserving tournament!)
    try {
      const custom = JSON.parse(localStorage.getItem('gasc_custom_tournaments') || '[]');
      const filtered = custom.filter(c => String(c.id || c._id) !== String(id));
      localStorage.setItem('gasc_custom_tournaments', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('gasc_tournaments_updated'));
    } catch (e) {}

    showToast(`Sport "${name || 'Sport'}" deleted. Tournament remains active!`, 'info', 'Sport Deleted');
    await loadAdminCompetitions();
  } catch (err) {
    showToast(err.message || 'Failed to delete sport competition', 'error');
  }
}

async function deleteTournament(tName) {
  if (!tName) return;
  const confirmed = window.confirm(`⚠️ Are you sure you want to delete tournament "${tName}" and all its sports disciplines? This will update the student portal immediately.`);
  if (!confirmed) return;

  try {
    // 1. Call backend DELETE API
    try {
      await apiRequest(`/competitions/tournament?name=${encodeURIComponent(tName)}`, 'DELETE');
    } catch (apiErr) {
      console.warn('API delete tournament notice:', apiErr.message);
    }

    // 2. Thoroughly purge from local custom tournaments in localStorage
    try {
      const targetTName = tName.trim().toLowerCase();
      const custom = JSON.parse(localStorage.getItem('gasc_custom_tournaments') || '[]');
      const filtered = custom.filter(c => {
        const cTName = (c.tournamentName || c.tournament_name || '').trim().toLowerCase();
        const cName = (c.name || '').trim().toLowerCase();
        const cPrefix = cName.includes('-') ? cName.split('-')[0].trim().toLowerCase() : cName;
        return cTName !== targetTName && 
               !cTName.includes(targetTName) && 
               !targetTName.includes(cTName) &&
               cName !== targetTName &&
               cPrefix !== targetTName;
      });
      localStorage.setItem('gasc_custom_tournaments', JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('gasc_tournaments_updated'));
    } catch (e) {}

    showToast(`Tournament "${tName}" deleted successfully!`, 'success', 'Tournament Deleted');
    await loadAdminCompetitions();
  } catch (err) {
    showToast(err.message || 'Failed to delete tournament', 'error');
  }
}

// 7. Applications Management
async function loadAdminApplications() {
  const table = document.getElementById('admin-applications-table');
  const status = document.getElementById('app-filter-status') ? document.getElementById('app-filter-status').value : 'All';

  try {
    const res = await apiRequest(`/competitions/registrations/all?status=${status}`);
    if (!res.registrations || res.registrations.length === 0) {
      const emptyMsg = status === 'Pending' 
        ? 'No pending applications to review. (Select "All Applications" or "Approved" to view reviewed entries).'
        : `No student applications found for status: ${status}.`;
      table.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-inbox me-2 fs-5"></i>${emptyMsg}</td></tr>`;
      return;
    }

    table.innerHTML = res.registrations.map((r, idx) => {
      const regId = r.id || r._id;
      const studentName = (r.studentId && r.studentId.name) ? r.studentId.name : (r.studentName || 'Student Athlete');
      const regNo = (r.studentId && r.studentId.registerNumber) ? r.studentId.registerNumber : (r.registerNumber || '');
      const dept = (r.studentId && r.studentId.department) ? r.studentId.department : (r.department || '');
      const compName = (r.competitionId && r.competitionId.name) ? r.competitionId.name : (r.tournamentName || 'Competition');
      const sportName = (r.competitionId && r.competitionId.sportName) ? r.competitionId.sportName : (r.sportName || 'General');

      let statusBadge = `<span class="badge badge-glass-warning text-dark"><i class="bi bi-clock-history me-1"></i>${r.status || 'Registered'}</span>`;
      if (r.status === 'Approved') {
        statusBadge = `<span class="badge badge-glass-success"><i class="bi bi-check-circle-fill me-1"></i>Approved</span>`;
      } else if (r.status === 'Rejected') {
        statusBadge = `<span class="badge badge-glass-danger"><i class="bi bi-x-circle-fill me-1"></i>Rejected</span>`;
      }

      let actionButtons = '';
      if (r.status === 'Approved') {
        actionButtons = `
          <div class="d-flex align-items-center gap-1">
            <span class="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30 px-2 py-1 small">
              <i class="bi bi-check2-all me-1"></i>Approved
            </span>
            <button class="btn btn-outline-danger btn-sm py-0.5 px-2" onclick="updateAppStatus('${regId}', 'Rejected')" title="Change to Rejected">
              <i class="bi bi-x-lg"></i> Reject
            </button>
          </div>
        `;
      } else if (r.status === 'Rejected') {
        actionButtons = `
          <div class="d-flex align-items-center gap-1">
            <span class="badge bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30 px-2 py-1 small">
              <i class="bi bi-slash-circle me-1"></i>Rejected
            </span>
            <button class="btn btn-outline-success btn-sm py-0.5 px-2" onclick="updateAppStatus('${regId}', 'Approved')" title="Re-approve">
              <i class="bi bi-check-lg"></i> Approve
            </button>
          </div>
        `;
      } else {
        actionButtons = `
          <div class="btn-group btn-group-sm" role="group">
            <button type="button" class="btn btn-success fw-bold px-2.5" onclick="updateAppStatus('${regId}', 'Approved')" title="Approve Registration">
              <i class="bi bi-check-circle me-1"></i> Approve
            </button>
            <button type="button" class="btn btn-outline-danger fw-bold px-2.5 ms-1" onclick="updateAppStatus('${regId}', 'Rejected')" title="Reject Registration">
              <i class="bi bi-x-circle me-1"></i> Reject
            </button>
          </div>
        `;
      }

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong class="d-block text-dark">${studentName}</strong>
            <small class="text-muted">${regNo} &bull; ${dept}</small>
          </td>
          <td>
            <strong class="d-block text-dark">${compName}</strong>
            <small class="text-primary fw-medium">${sportName}</small>
          </td>
          <td><span class="badge bg-light text-dark border">${r.preferredPosition || 'Player'}</span></td>
          <td>${formatDate(r.registrationDate || r.createdAt)}</td>
          <td>${statusBadge}</td>
          <td>${actionButtons}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load applications.</td></tr>`;
  }
}

async function updateAppStatus(id, newStatus, customRemarks = null) {
  if (!id) {
    showToast('Invalid registration ID.', 'error');
    return;
  }

  // Use robust defaults instead of blocking window.prompt (which is unsupported in Electron)
  let remarks = customRemarks;
  if (!remarks) {
    remarks = newStatus === 'Approved'
      ? 'Selected for team trials & tournament squad.'
      : 'Application reviewed. Exceeded tournament squad capacity.';
  }

  try {
    showToast(`Processing ${newStatus.toLowerCase()}...`, 'info');
    const res = await apiRequest(`/competitions/registrations/${id}/status`, 'PATCH', {
      status: newStatus,
      adminRemarks: remarks
    });
    showToast(res.message || `Registration marked as ${newStatus} successfully!`, 'success');
    await loadAdminApplications();
    if (typeof loadAdminDashboardStats === 'function') {
      loadAdminDashboardStats();
    }
  } catch (err) {
    console.error('Error updating registration status:', err);
    showToast(err.message || 'Failed to update application status.', 'error');
  }
}

// 8. TEAM MANAGEMENT & TEAM FORMATION MODULE (Sections 11-23 of User Prompt)
let teamFormationFiltersInitialized = false;
window.allFormedTeamsCache = [];
window.latestFormedTeamPdfData = null;
window.currentExistingTeam = null;

function switchTeamMgmtTab(tab) {
  const formContent = document.getElementById('team-tab-formation-content');
  const dirContent = document.getElementById('team-tab-directory-content');
  const btnForm = document.getElementById('tab-btn-formation');
  const btnDir = document.getElementById('tab-btn-formed-list');

  if (tab === 'formation') {
    if (formContent) formContent.classList.remove('d-none');
    if (dirContent) dirContent.classList.add('d-none');
    if (btnForm) { btnForm.className = 'btn btn-sm btn-primary rounded-pill px-3 fw-bold'; }
    if (btnDir) { btnDir.className = 'btn btn-sm btn-light rounded-pill px-3 fw-bold text-dark'; }
  } else {
    if (formContent) formContent.classList.add('d-none');
    if (dirContent) dirContent.classList.remove('d-none');
    if (btnForm) { btnForm.className = 'btn btn-sm btn-light rounded-pill px-3 fw-bold text-dark'; }
    if (btnDir) { btnDir.className = 'btn btn-sm btn-primary rounded-pill px-3 fw-bold'; }
    loadFormedTeamsList();
  }
}

async function loadAdminTeams() {
  await loadTeamFormationInitialData();
  await loadFormedTeamsList();
}

async function loadTeamFormationInitialData() {
  const tournSelect = document.getElementById('team-form-tournament');
  const sportSelect = document.getElementById('team-form-sport');
  const deptSelect = document.getElementById('team-form-dept');

  try {
    // 1. Fetch Tournaments and Team Sports
    const [compsRes, sportsRes] = await Promise.all([
      apiRequest('/competitions'),
      apiRequest('/sports')
    ]);

    const competitions = compsRes.competitions || [];
    const sports = sportsRes.sports || [];

    // Distinct Tournaments
    const tournaments = Array.from(new Set(competitions.map(c => 
      c.tournamentName || (c.name ? c.name.split('-')[0].trim() : 'SPARK 2026 Annual Sports Fest')
    ))).filter(Boolean);

    if (tournaments.length === 0) tournaments.push('SPARK 2026 Annual Sports Fest');

    if (tournSelect && (!teamFormationFiltersInitialized || tournSelect.options.length <= 1)) {
      tournSelect.innerHTML = tournaments.map(t => `<option value="${t}">${t}</option>`).join('');
    }

    // Team Sports (Cricket, Football, Kabaddi, Volleyball, Basketball, etc.)
    const teamSports = [
      'Cricket', 'Football', 'Kabaddi', 'Volleyball', 'Basketball', 'Handball', 'Kho Kho', 'Throwball', 'Hockey'
    ];

    if (sportSelect && (!teamFormationFiltersInitialized || sportSelect.options.length <= 1)) {
      sportSelect.innerHTML = teamSports.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // Standard GASC Idappadi Academic Departments
    const collegeDepartments = [
      'B.Sc CS', 'B.Sc Maths', 'BCA', 'B.Com', 'BBA', 'Tamil', 'English', 'Physics', 'Chemistry', 'Botany'
    ];

    if (deptSelect && (!teamFormationFiltersInitialized || deptSelect.options.length <= 1)) {
      deptSelect.innerHTML = collegeDepartments.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    teamFormationFiltersInitialized = true;
    await onTeamFormationFilterChange();
  } catch (err) {
    console.error('Error loading team formation initial data:', err);
  }
}

async function onTeamFormationFilterChange() {
  const tourn = document.getElementById('team-form-tournament')?.value || 'SPARK 2026 Annual Sports Fest';
  const sport = document.getElementById('team-form-sport')?.value || 'Cricket';
  const gender = document.getElementById('team-form-gender')?.value || 'Boys';
  const dept = document.getElementById('team-form-dept')?.value || 'B.Sc CS';

  const container = document.getElementById('team-players-checkbox-container');
  const duplicateBanner = document.getElementById('team-duplicate-banner');
  const successCard = document.getElementById('team-created-success-card');
  if (successCard) successCard.classList.add('d-none');

  if (container) {
    container.innerHTML = '<div class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading registered players...</div>';
  }

  try {
    const url = `/teams/eligible-players?tournamentName=${encodeURIComponent(tourn)}&sportName=${encodeURIComponent(sport)}&gender=${encodeURIComponent(gender)}&department=${encodeURIComponent(dept)}`;
    const res = await apiRequest(url);

    // Update Counter / Rules Badges
    const regCount = res.registeredCount || 0;
    const reqCount = res.requiredPlayers || 11;
    const subCount = res.substitutes || 0;

    const statReg = document.getElementById('stat-registered-players');
    const statReq = document.getElementById('stat-required-players');
    const statSub = document.getElementById('stat-substitutes');

    if (statReg) statReg.innerText = regCount;
    if (statReq) statReq.innerText = reqCount;
    if (statSub) statSub.innerText = subCount;

    // Check Duplicate Team Prevention (Section 19)
    if (res.teamAlreadyExists && res.existingTeam) {
      window.currentExistingTeam = res.existingTeam;
      if (duplicateBanner) {
        duplicateBanner.classList.remove('d-none');
        const dupTitle = document.getElementById('duplicate-team-title');
        const dupDesc = document.getElementById('duplicate-team-desc');
        if (dupTitle) dupTitle.innerText = `Team already created for ${dept} ${gender} ${sport}.`;
        if (dupDesc) dupDesc.innerText = `Official team "${res.existingTeam.name}" has already been formed. Duplicate teams are prevented.`;
      }
    } else {
      window.currentExistingTeam = null;
      if (duplicateBanner) duplicateBanner.classList.add('d-none');
    }

    // Render Registered Players Checkboxes (Section 12)
    const players = res.players || [];
    if (!container) return;

    if (players.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-person-x fs-2 text-secondary d-block mb-2"></i>
          <div>No registered ${gender.toLowerCase()} students found for <strong>${dept}</strong> in <strong>${sport}</strong>.</div>
          <small class="text-muted">Students must register individually in Student Portal before they can be selected into a team.</small>
        </div>
      `;
      onPlayerSelectionChange();
      return;
    }

    container.innerHTML = players.map(p => {
      const isAssigned = p.alreadyInTeam;
      return `
        <div class="player-select-item ${isAssigned ? 'already-assigned' : ''}" id="player-item-${p.id}">
          <div class="d-flex align-items-center gap-3">
            <input type="checkbox" class="form-check-input player-form-checkbox fs-5 mt-0" 
              value="${p.id}" 
              data-name="${p.name.replace(/"/g, '&quot;')}"
              data-reg="${p.registerNumber}"
              data-dept="${p.department}"
              data-gender="${p.gender}"
              ${isAssigned ? 'disabled' : ''}
              onchange="onPlayerSelectionChange()">
            <div>
              <div class="fw-bold text-dark d-flex align-items-center gap-2">
                <span>${p.name}</span>
                <span class="badge bg-light text-dark font-monospace border">${p.registerNumber}</span>
                ${isAssigned ? `<span class="badge bg-warning text-dark"><i class="bi bi-shield-check me-1"></i>Already in Team: ${p.assignedTeamName || 'Assigned'}</span>` : ''}
              </div>
              <small class="text-muted">
                ${p.department} &bull; ${p.gender} &bull; Registered: ${formatDate(p.registrationDate)}
              </small>
            </div>
          </div>
          <div>
            ${!isAssigned ? '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">Eligible</span>' : '<span class="badge bg-secondary">Selected in Squad</span>'}
          </div>
        </div>
      `;
    }).join('');

    onPlayerSelectionChange();
  } catch (err) {
    console.error('Error fetching eligible players:', err);
    if (container) {
      container.innerHTML = `<div class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load registered players: ${err.message}</div>`;
    }
  }
}

// Live Selection Counter & Validation (Sections 13 & 14)
function onPlayerSelectionChange() {
  const checkboxes = document.querySelectorAll('.player-form-checkbox:checked');
  const selectedCount = checkboxes.length;
  const reqCount = parseInt(document.getElementById('stat-required-players')?.innerText || '11', 10);

  const counterEl = document.getElementById('team-live-counter');
  const createBtn = document.getElementById('btn-create-team');
  const statusMsg = document.getElementById('team-validation-status');

  // Enforce Max Team Size (Section 14: Do not allow selection beyond required)
  if (selectedCount > reqCount) {
    showToast(`You can only select up to ${reqCount} players for this sport.`, 'warning', 'Limit Reached');
    // Uncheck latest
    const allChecked = Array.from(checkboxes);
    allChecked[allChecked.length - 1].checked = false;
    onPlayerSelectionChange();
    return;
  }

  // Update Item Styles
  document.querySelectorAll('.player-select-item').forEach(el => {
    const cb = el.querySelector('.player-form-checkbox');
    if (cb && cb.checked) {
      el.classList.add('selected');
    } else {
      el.classList.remove('selected');
    }
  });

  // Update Live Counter text (Section 13)
  if (counterEl) {
    counterEl.innerText = `${selectedCount} / ${reqCount} Players Selected`;
    if (selectedCount === reqCount) {
      counterEl.className = 'badge bg-success fs-6 px-3 py-2 rounded-pill counter-pill-active text-white';
    } else if (selectedCount > 0) {
      counterEl.className = 'badge bg-warning text-dark fs-6 px-3 py-2 rounded-pill';
    } else {
      counterEl.className = 'badge bg-secondary fs-6 px-3 py-2 rounded-pill text-white';
    }
  }

  // Validation State (Section 14: Enable CREATE TEAM only when required number selected)
  if (selectedCount === reqCount) {
    if (createBtn) createBtn.disabled = false;
    if (statusMsg) {
      statusMsg.className = 'small fw-bold text-success';
      statusMsg.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> Required ${reqCount} players selected. Ready to form official team squad!`;
    }
  } else {
    if (createBtn) createBtn.disabled = true;
    if (statusMsg) {
      statusMsg.className = 'small fw-semibold text-danger';
      const remaining = reqCount - selectedCount;
      statusMsg.innerHTML = `<i class="bi bi-info-circle me-1"></i> Please select the required number of players (${remaining} more needed).`;
    }
  }
}

// Create Official Team from Selected Registered Players (Section 15, 16, 20)
async function submitCreateFormedTeam() {
  const tourn = document.getElementById('team-form-tournament')?.value || '';
  const sport = document.getElementById('team-form-sport')?.value || '';
  const gender = document.getElementById('team-form-gender')?.value || '';
  const dept = document.getElementById('team-form-dept')?.value || '';

  const checkedBoxes = Array.from(document.querySelectorAll('.player-form-checkbox:checked'));
  const selectedStudentIds = checkedBoxes.map(cb => cb.value);

  const btn = document.getElementById('btn-create-team');

  if (!tourn || !sport || !gender || !dept) {
    showToast('Please select all filters.', 'warning');
    return;
  }

  const teamName = `${dept} - ${gender} - ${sport} Team`;

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Creating Team...';
    }

    const res = await apiRequest('/teams/form-team', 'POST', {
      tournamentName: tourn,
      sportName: sport,
      department: dept,
      gender: gender,
      teamName: teamName,
      selectedStudentIds: selectedStudentIds
    });

    showToast(`Team "${teamName}" created successfully!`, 'success', 'Team Created ✓');

    // Section 20: Display Team View
    const successCard = document.getElementById('team-created-success-card');
    if (successCard) {
      successCard.classList.remove('d-none');
      document.getElementById('success-team-name').innerText = res.team.name;
      document.getElementById('success-team-tourn').innerText = res.team.tournamentName || tourn;
      document.getElementById('success-team-sport').innerText = res.team.sportName || sport;
      document.getElementById('success-team-dept').innerText = res.team.department || dept;
      document.getElementById('success-team-gender').innerText = res.team.gender || gender;
      document.getElementById('success-team-size').innerText = res.members.length;
      document.getElementById('success-team-date').innerText = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

      // Populate Members table
      const tbody = document.getElementById('success-team-members-tbody');
      if (tbody) {
        tbody.innerHTML = (res.members || []).map((m, idx) => `
          <tr>
            <td class="text-muted small">${idx + 1}</td>
            <td><strong>${m.name}</strong></td>
            <td><span class="badge bg-light text-dark font-monospace border">${m.registerNumber}</span></td>
            <td>${m.department}</td>
            <td>
              <span class="badge ${idx === 0 ? 'bg-warning text-dark' : 'bg-primary-subtle text-primary'}">
                ${m.role || (idx === 0 ? 'Captain' : 'Player')}
              </span>
            </td>
          </tr>
        `).join('');
      }

      // Store created team for instant PDF download
      window.latestFormedTeamPdfData = {
        collegeName: 'Government Arts and Science College, Idappadi',
        departmentName: 'Department of Physical Education & Sports',
        sportsInchargeName: 'Dr. R. ANITHA (Sports Mam)',
        sportsInchargeRole: 'Physical Directress & Sports Incharge',
        tournament: tourn,
        sport: sport,
        department: dept,
        gender: gender,
        teamName: res.team.name,
        totalPlayers: res.members.length,
        createdDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        createdBy: 'Sports Mam',
        members: res.members.map((m, idx) => ({
          sNo: idx + 1,
          studentName: m.name,
          registerNumber: m.registerNumber,
          department: m.department,
          gender: m.gender,
          role: m.role || 'Player'
        }))
      };

      successCard.scrollIntoView({ behavior: 'smooth' });
    }

    // Refresh eligible players and formed teams
    await onTeamFormationFilterChange();
    await loadFormedTeamsList();

  } catch (err) {
    if (err.code === 'DUPLICATE_TEAM') {
      showToast(err.message, 'warning', 'Duplicate Team');
      const duplicateBanner = document.getElementById('team-duplicate-banner');
      if (duplicateBanner) {
        duplicateBanner.classList.remove('d-none');
        document.getElementById('duplicate-team-title').innerText = err.message;
        window.currentExistingTeam = err.existingTeam;
      }
    } else {
      showToast(err.message || 'Failed to create team.', 'error');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> CREATE TEAM';
    }
  }
}

// Section 19: View Existing Team From Duplicate Alert
function viewExistingTeamFromAlert() {
  if (window.currentExistingTeam && window.currentExistingTeam.id) {
    viewFormedTeam(window.currentExistingTeam.id);
  } else {
    switchTeamMgmtTab('directory');
  }
}

// Section 22: Formed Teams Directory Listing
async function loadFormedTeamsList() {
  const tbody = document.getElementById('formed-teams-table-tbody');
  const countBadge = document.getElementById('formed-teams-badge-count');

  if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading college teams...</td></tr>';

  try {
    const res = await apiRequest('/teams/formed');
    const teams = res.teams || [];
    window.allFormedTeamsCache = teams;

    if (countBadge) countBadge.innerText = teams.length;

    // Populate filter dropdowns in Tab 2
    const sportFilter = document.getElementById('formed-filter-sport');
    const deptFilter = document.getElementById('formed-filter-dept');

    if (sportFilter && sportFilter.options.length <= 1) {
      const distinctSports = Array.from(new Set(teams.map(t => t.sportName))).filter(Boolean);
      distinctSports.forEach(s => {
        sportFilter.innerHTML += `<option value="${s}">${s}</option>`;
      });
    }

    if (deptFilter && deptFilter.options.length <= 1) {
      const distinctDepts = Array.from(new Set(teams.map(t => t.department))).filter(Boolean);
      distinctDepts.forEach(d => {
        deptFilter.innerHTML += `<option value="${d}">${d}</option>`;
      });
    }

    renderFormedTeamsTable(teams);
  } catch (err) {
    console.error('Error loading formed teams:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load formed teams: ${err.message}</td></tr>`;
  }
}

function filterFormedTeamsList() {
  const q = (document.getElementById('formed-teams-search')?.value || '').toLowerCase().trim();
  const s = document.getElementById('formed-filter-sport')?.value || 'All';
  const d = document.getElementById('formed-filter-dept')?.value || 'All';

  let filtered = [...window.allFormedTeamsCache];

  if (s && s !== 'All') {
    filtered = filtered.filter(t => (t.sportName || '').toLowerCase() === s.toLowerCase());
  }
  if (d && d !== 'All') {
    filtered = filtered.filter(t => (t.department || '').toLowerCase() === d.toLowerCase());
  }
  if (q) {
    filtered = filtered.filter(t => 
      (t.name || '').toLowerCase().includes(q) ||
      (t.department || '').toLowerCase().includes(q) ||
      (t.sportName || '').toLowerCase().includes(q) ||
      (t.captainName || '').toLowerCase().includes(q)
    );
  }

  renderFormedTeamsTable(filtered);
}

function renderFormedTeamsTable(teams) {
  const tbody = document.getElementById('formed-teams-table-tbody');
  if (!tbody) return;

  if (teams.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <div class="stat-icon bg-primary bg-opacity-10 text-primary mx-auto mb-2" style="width: 48px; height: 48px; font-size: 1.5rem;">
            <i class="bi bi-shield-shaded"></i>
          </div>
          <div class="fw-bold text-dark">No Formed College Teams Found</div>
          <small class="text-muted">Use "Team Formation" tab to select registered players and create an official department team.</small>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = teams.map((t, idx) => `
    <tr>
      <td class="text-muted small">${idx + 1}</td>
      <td>
        <div class="fw-bold text-dark">${t.name}</div>
        <small class="text-muted" style="font-size: 0.75rem;">${t.tournamentName || 'SPARK 2026'}</small>
      </td>
      <td>
        <span class="badge bg-primary bg-opacity-10 text-primary border">${t.sportName}</span>
      </td>
      <td>
        <span class="badge bg-secondary bg-opacity-15 text-dark">${t.department}</span>
      </td>
      <td>
        <span class="badge ${t.gender === 'Girls' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-info bg-opacity-10 text-info'}">
          ${t.gender || 'Boys'}
        </span>
      </td>
      <td class="text-center">
        <strong class="badge bg-success bg-opacity-15 text-success fs-6">${t.totalMembers || t.requiredPlayers || 11} Players</strong>
      </td>
      <td>
        <small class="text-muted">${formatDate(t.createdAt)}</small>
      </td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="viewFormedTeam('${t.id || t._id}')" title="View Team Squad">
            <i class="bi bi-eye-fill me-1"></i> VIEW
          </button>
          <button class="btn btn-outline-danger" onclick="downloadTeamPdf('${t.id || t._id}')" title="Download Official Team PDF">
            <i class="bi bi-file-earmark-pdf-fill me-1"></i> PDF
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Section 20 & 22: View Team Squad Modal
async function viewFormedTeam(teamId) {
  try {
    const res = await apiRequest(`/teams/${teamId}/pdf-data`);
    const { pdfData } = res;
    if (!pdfData) return;

    document.getElementById('view-team-modal-name').innerText = pdfData.teamName;
    document.getElementById('view-team-modal-tourn').innerText = pdfData.tournament;
    document.getElementById('view-team-modal-sport').innerText = pdfData.sport;
    document.getElementById('view-team-modal-dept').innerText = pdfData.department;
    document.getElementById('view-team-modal-gender').innerText = pdfData.gender;
    document.getElementById('view-team-modal-size').innerText = pdfData.totalPlayers;
    document.getElementById('view-team-modal-date').innerText = pdfData.createdDate;

    const tbody = document.getElementById('view-team-modal-members-tbody');
    if (tbody) {
      tbody.innerHTML = (pdfData.members || []).map(m => `
        <tr>
          <td class="text-muted small">${m.sNo}</td>
          <td><strong>${m.studentName}</strong></td>
          <td><span class="badge bg-light text-dark font-monospace border">${m.registerNumber}</span></td>
          <td>${m.department}</td>
          <td>${m.gender}</td>
          <td>
            <span class="badge ${m.role === 'Captain' ? 'bg-warning text-dark' : 'bg-primary-subtle text-primary'}">
              ${m.role}
            </span>
          </td>
        </tr>
      `).join('');
    }

    const printBtn = document.getElementById('btn-modal-print-team-pdf');
    if (printBtn) {
      printBtn.onclick = () => generateOfficialTeamSheetPdf(pdfData);
    }

    const modalEl = document.getElementById('viewTeamSquadModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  } catch (err) {
    showToast('Failed to view team: ' + err.message, 'error');
  }
}

// Section 21 & 22: PDF Download Logic
function downloadCurrentCreatedTeamPdf() {
  if (window.latestFormedTeamPdfData) {
    generateOfficialTeamSheetPdf(window.latestFormedTeamPdfData);
  } else {
    showToast('Team PDF data not available.', 'warning');
  }
}

async function downloadTeamPdf(teamId) {
  try {
    const res = await apiRequest(`/teams/${teamId}/pdf-data`);
    if (res.success && res.pdfData) {
      generateOfficialTeamSheetPdf(res.pdfData);
    } else {
      showToast('Could not load team PDF data.', 'error');
    }
  } catch (err) {
    showToast('Error downloading team PDF: ' + err.message, 'error');
  }
}

// Section 21: High-Quality Professional Official Team Sheet PDF Generation
function generateOfficialTeamSheetPdf(pdfData) {
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    showToast('Please allow popups to download/print the official team PDF.', 'warning');
    return;
  }

  const memberRows = (pdfData.members || []).map(m => `
    <tr>
      <td style="text-align: center; font-weight: bold; width: 45px;">${m.sNo}</td>
      <td style="font-weight: 600;">${m.studentName}</td>
      <td style="font-family: monospace; font-size: 13px; text-align: center;">${m.registerNumber}</td>
      <td>${m.department}</td>
      <td style="text-align: center;">${m.gender}</td>
      <td style="text-align: center; font-weight: bold; color: ${m.role === 'Captain' ? '#b45309' : '#0369a1'};">${m.role}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Official Team Sheet — ${pdfData.teamName}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 20mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; line-height: 1.5; }
        .official-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
        .college-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; margin: 0; text-transform: uppercase; }
        .dept-title { font-size: 14px; font-weight: 700; color: #0284c7; margin: 4px 0 0; text-transform: uppercase; }
        .college-sub { font-size: 11px; color: #64748b; margin: 2px 0 0; }
        .sheet-badge { display: inline-block; background: #0f172a; color: #ffffff; padding: 4px 16px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 10px; }
        .team-meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
        .team-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
        .team-meta-item strong { color: #475569; font-size: 12px; text-transform: uppercase; }
        .team-name-banner { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12.5px; }
        th { background: #0f172a; color: #ffffff; padding: 8px 10px; text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background-color: #f8fafc; }
        .footer-signatures { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 45px; padding-top: 20px; }
        .sig-block { text-align: center; min-width: 200px; }
        .sig-line { border-bottom: 1px solid #0f172a; width: 180px; margin: 0 auto 8px; }
        .no-print { margin-bottom: 20px; text-align: right; }
        .btn-print { background: #0284c7; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>

      <div class="official-header">
        <h1 class="college-title">${pdfData.collegeName || 'GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI'}</h1>
        <div class="dept-title">${pdfData.departmentName || 'DEPARTMENT OF PHYSICAL EDUCATION & SPORTS'}</div>
        <div class="college-sub">Government of Tamil Nadu &bull; Idappadi, Salem District – 637101</div>
        <div class="sheet-badge">OFFICIAL TEAM SQUAD SHEET</div>
      </div>

      <div class="team-meta-box">
        <div class="team-meta-grid">
          <div class="team-meta-item">
            <strong>Tournament:</strong> <span>${pdfData.tournament}</span>
          </div>
          <div class="team-meta-item">
            <strong>Sport Discipline:</strong> <span>${pdfData.sport}</span>
          </div>
          <div class="team-meta-item">
            <strong>Academic Department:</strong> <span>${pdfData.department}</span>
          </div>
          <div class="team-meta-item">
            <strong>Gender Category:</strong> <span>${pdfData.gender}</span>
          </div>
          <div class="team-meta-item">
            <strong>Total Squad Size:</strong> <span><strong>${pdfData.totalPlayers} Players</strong></span>
          </div>
          <div class="team-meta-item">
            <strong>Created Date:</strong> <span>${pdfData.createdDate}</span>
          </div>
        </div>
        <div class="team-name-banner">
          TEAM: ${pdfData.teamName}
        </div>
      </div>

      <h3 style="font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; letter-spacing: 0.03em;">
        Official Squad Roster
      </h3>

      <table>
        <thead>
          <tr>
            <th style="text-align: center;">S.No</th>
            <th>Student Name</th>
            <th style="text-align: center;">Register Number</th>
            <th>Department</th>
            <th style="text-align: center;">Gender</th>
            <th style="text-align: center;">Role</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows}
        </tbody>
      </table>

      <div class="footer-signatures">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-size: 11px; font-weight: bold; color: #475569;">Team Captain Signature</div>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${pdfData.sportsInchargeName || 'Dr. R. ANITHA, M.P.Ed., M.Phil., Ph.D.'}</div>
          <div style="font-size: 10.5px; color: #64748b;">Physical Directress & Sports Mam</div>
          <div style="font-size: 10px; color: #94a3b8;">GASC Idappadi Official Seal</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 400);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

async function deleteTeam(id, captainName, sportName) {
  if (!confirm(`Are you sure you want to delete the ${sportName} team with Captain "${captainName}"?`)) return;
  try {
    const res = await apiRequest(`/teams/${id}`, 'DELETE');
    showToast(res.message, 'info', 'Team Removed');
    await loadAdminTeams();
  } catch (err) {
    showToast(err.message, 'error', 'Delete Failed');
  }
}

// 11. Achievements
async function loadAdminAchievements() {
  const table = document.getElementById('admin-achievements-table');
  try {
    const res = await apiRequest('/achievements');
    table.innerHTML = res.achievements.map((a, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>
          <strong>${a.title}</strong>
          <div class="small text-muted">${a.sportName || 'Athletics'} &bull; ${a.year}</div>
        </td>
        <td><strong>${a.studentName}</strong> (${a.department || 'GASC'})</td>
        <td><span class="badge ${a.medal === 'Gold' ? 'badge-gold' : (a.medal === 'Silver' ? 'badge-silver' : 'badge-bronze')}">${a.medal}</span></td>
        <td>${a.position}</td>
        <td>${formatDate(a.date)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteAchievement('${a.id || a._id}')" title="Delete"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    table.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load achievements.</td></tr>`;
  }
}

async function submitCreateAchievement(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Awarding...';

    const res = await apiRequest('/achievements', 'POST', formData, true);
    showToast(res.message, 'success');
    form.reset();
    bootstrap.Modal.getInstance(document.getElementById('addAchievementModal')).hide();
    loadAdminAchievements();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Add to Wall of Fame';
  }
}

async function deleteAchievement(id) {
  if (!confirm('Delete achievement record?')) return;
  try {
    await apiRequest(`/achievements/${id}`, 'DELETE');
    showToast('Achievement deleted.', 'info');
    loadAdminAchievements();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 12. Notifications Broadcast
async function loadAdminNotifications() {
  const container = document.getElementById('admin-notifications-list');
  try {
    const res = await apiRequest('/notifications/all');
    container.innerHTML = res.notifications.map(n => `
      <div class="glass-card p-3 mb-2 d-flex align-items-center justify-content-between">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <span class="badge ${n.priority === 'Urgent' ? 'bg-danger' : 'badge-glass-primary'}">${n.category}</span>
            <span class="small text-muted">${formatDate(n.createdAt)} &bull; Target: ${n.targetType}</span>
          </div>
          <h6 class="fw-bold mb-1">${n.title}</h6>
          <div class="small text-secondary">${n.message}</div>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteNotification('${n.id || n._id}')"><i class="bi bi-trash"></i></button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-center text-danger">Failed to load notifications.</div>`;
  }
}

async function submitCreateNotification(event) {
  event.preventDefault();
  const title = document.getElementById('notify-title').value;
  const message = document.getElementById('notify-message').value;
  const category = document.getElementById('notify-category').value;
  const targetType = document.getElementById('notify-target').value;
  const priority = document.getElementById('notify-priority').value;

  const btn = event.target.querySelector('button[type="submit"]');
  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Broadcasting...';

    const res = await apiRequest('/notifications', 'POST', {
      title,
      message,
      category,
      targetType,
      priority
    });

    showToast(res.message, 'success');
    event.target.reset();
    bootstrap.Modal.getInstance(document.getElementById('addNotificationModal')).hide();
    loadAdminNotifications();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Broadcast Alert';
  }
}

async function deleteNotification(id) {
  try {
    await apiRequest(`/notifications/${id}`, 'DELETE');
    showToast('Notification deleted.', 'info');
    loadAdminNotifications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 13. Gallery
async function loadAdminGallery() {
  const container = document.getElementById('admin-gallery-grid');
  try {
    const res = await apiRequest('/gallery');
    if (!res || !res.gallery || res.gallery.length === 0) {
      container.innerHTML = `<div class="col-12 text-center text-muted py-5"><i class="bi bi-images fs-1 text-secondary mb-2 d-block"></i>No gallery moments uploaded yet. Click "+ Add Photo" to upload.</div>`;
      return;
    }
    container.innerHTML = res.gallery.map(g => `
      <div class="col-md-4 mb-3">
        <div class="glass-card overflow-hidden h-100">
          <img src="${g.image || '/images/sports/tournament.jpg'}" class="w-100" style="height: 180px; object-fit: cover;" onerror="this.onerror=null;this.src='/images/sports/tournament.jpg';">
          <div class="p-3 d-flex flex-column">
            <span class="badge badge-glass-primary mb-1 align-self-start">${g.category || 'Sports'}</span>
            <h6 class="fw-bold mb-1">${g.title}</h6>
            <div class="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
              <small class="text-muted">${formatDate(g.date)}</small>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteGalleryItem('${g.id || g._id}')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-muted py-4"><i class="bi bi-info-circle me-1"></i> No gallery photos found. Click "+ Add Photo" to upload photos.</div>`;
  }
}

async function submitCreateGallery(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Uploading...';

    const res = await apiRequest('/gallery', 'POST', formData, true);
    showToast(res.message, 'success');
    form.reset();
    bootstrap.Modal.getInstance(document.getElementById('addGalleryModal')).hide();
    loadAdminGallery();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Upload Photo';
  }
}

async function deleteGalleryItem(id) {
  if (!confirm('Remove photo from sports gallery?')) return;
  try {
    await apiRequest(`/gallery/${id}`, 'DELETE');
    showToast('Photo removed.', 'info');
    loadAdminGallery();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 14. Registration Analytics (Sections 1-7 of User Prompt)
let analyticsFiltersInitialized = false;
window.analyticsStudentsData = [];
window.currentModalFilteredStudents = [];

async function loadAdminAnalytics() {
  await loadRegistrationAnalytics();
  try {
    if (typeof initAdminCharts === 'function') {
      await initAdminCharts();
    }
  } catch (e) {
    console.warn('initAdminCharts error:', e);
  }
}

async function loadRegistrationAnalytics() {
  const tournSelect = document.getElementById('analytics-filter-tournament');
  const sportSelect = document.getElementById('analytics-filter-sport');
  const genderSelect = document.getElementById('analytics-filter-gender');
  const deptSelect = document.getElementById('analytics-filter-dept');
  const statusSelect = document.getElementById('analytics-filter-status');
  const startInput = document.getElementById('analytics-filter-start');

  const tournament = tournSelect?.value || 'All';
  const sport = sportSelect?.value || 'All';
  const gender = genderSelect?.value || 'All';
  const department = deptSelect?.value || 'All';
  const status = statusSelect?.value || 'All';
  const startDate = startInput?.value || '';

  const queryParams = new URLSearchParams();
  if (tournament && tournament !== 'All') queryParams.append('tournament', tournament);
  if (sport && sport !== 'All') queryParams.append('sport', sport);
  if (gender && gender !== 'All') queryParams.append('gender', gender);
  if (department && department !== 'All') queryParams.append('department', department);
  if (status && status !== 'All') queryParams.append('status', status);
  if (startDate) queryParams.append('startDate', startDate);

  const deptTbody = document.getElementById('analytics-dept-tbody');
  const sportTbody = document.getElementById('analytics-sport-tbody');
  const matrixContainer = document.getElementById('analytics-matrix-container');

  if (deptTbody) deptTbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading department registrations...</td></tr>';
  if (sportTbody) sportTbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading sport registrations...</td></tr>';
  if (matrixContainer) matrixContainer.innerHTML = '<div class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Generating matrix cross-tabulation...</div>';

  try {
    const res = await apiRequest(`/analytics/registrations?${queryParams.toString()}`);
    const { analytics } = res;
    if (!analytics) return;

    window.analyticsStudentsData = analytics.students || [];

    // 1. Populate Filter Dropdowns dynamically once (or maintain selection)
    if (!analyticsFiltersInitialized && analytics.filterOptions) {
      if (tournSelect) {
        const curVal = tournSelect.value;
        tournSelect.innerHTML = '<option value="All">All Tournaments</option>' + 
          analytics.filterOptions.tournaments.map(t => `<option value="${t}">${t}</option>`).join('');
        if (curVal) tournSelect.value = curVal;
      }
      if (sportSelect) {
        const curVal = sportSelect.value;
        sportSelect.innerHTML = '<option value="All">All Sports</option>' + 
          analytics.filterOptions.sports.map(s => `<option value="${s}">${s}</option>`).join('');
        if (curVal) sportSelect.value = curVal;
      }
      if (deptSelect) {
        const curVal = deptSelect.value;
        deptSelect.innerHTML = '<option value="All">All Departments</option>' + 
          analytics.filterOptions.departments.map(d => `<option value="${d}">${d}</option>`).join('');
        if (curVal) deptSelect.value = curVal;
      }
      analyticsFiltersInitialized = true;
    }

    // 2. Summary KPI Cards (Section 3)
    const cards = analytics.summaryCards || {};
    const setCard = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = Number(val || 0).toLocaleString();
    };

    setCard('card-reg-total', cards.totalRegistered);
    setCard('card-reg-boys', cards.boys);
    setCard('card-reg-girls', cards.girls);
    setCard('card-reg-sports', cards.totalSports);
    setCard('card-reg-depts', cards.totalDepartments);
    setCard('card-reg-team-sports', cards.teamSportsRegistrations);
    setCard('card-reg-indiv-sports', cards.individualSportsRegistrations);

    // 3. Department-wise Table (Section 4)
    if (deptTbody) {
      const depts = analytics.departmentWise || [];
      if (depts.length === 0) {
        deptTbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No department registrations found for selected filters.</td></tr>';
      } else {
        deptTbody.innerHTML = depts.map(d => `
          <tr style="cursor: pointer;" onclick="openStudentsModal('department', '${d.department.replace(/'/g, "\\'")}')" title="Click to view students">
            <td>
              <strong class="text-dark">${d.department}</strong>
            </td>
            <td class="text-center">
              <span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1">${d.boys}</span>
            </td>
            <td class="text-center">
              <span class="badge bg-danger bg-opacity-10 text-danger px-2 py-1">${d.girls}</span>
            </td>
            <td class="text-center">
              <strong class="text-dark fs-6">${d.total}</strong>
            </td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1" onclick="event.stopPropagation(); openStudentsModal('department', '${d.department.replace(/'/g, "\\'")}')">
                <i class="bi bi-eye me-1"></i> View Students
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // 4. Sport-wise Table (Section 5)
    if (sportTbody) {
      const sports = analytics.sportWise || [];
      if (sports.length === 0) {
        sportTbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No sport registrations found for selected filters.</td></tr>';
      } else {
        sportTbody.innerHTML = sports.map(s => `
          <tr style="cursor: pointer;" onclick="openStudentsModal('sport', '${s.sport.replace(/'/g, "\\'")}')" title="Click to view students">
            <td>
              <div class="fw-bold text-dark">${s.sport}</div>
            </td>
            <td class="text-center">
              <span class="badge ${s.competitionType === 'TEAM' ? 'bg-success bg-opacity-15 text-success' : 'bg-info bg-opacity-15 text-info'} px-2 py-1 border">
                ${s.competitionType || 'TEAM'}
              </span>
            </td>
            <td class="text-center">
              <span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1">${s.boys}</span>
            </td>
            <td class="text-center">
              <span class="badge bg-danger bg-opacity-10 text-danger px-2 py-1">${s.girls}</span>
            </td>
            <td class="text-center">
              <strong class="text-dark fs-6">${s.total}</strong>
            </td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-success rounded-pill px-3 py-1" onclick="event.stopPropagation(); openStudentsModal('sport', '${s.sport.replace(/'/g, "\\'")}')">
                <i class="bi bi-eye me-1"></i> View Students
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // 5. Department × Sport Matrix Table (Section 6)
    if (matrixContainer && analytics.matrix) {
      const { columns: mSports, rows: mRows, totals: colTotals } = analytics.matrix;

      if (!mSports || mSports.length === 0 || !mRows || mRows.length === 0) {
        matrixContainer.innerHTML = '<div class="text-center py-4 text-muted">No matrix data available for current filter selection.</div>';
      } else {
        let theadHtml = '<tr><th style="min-width: 140px;">Department</th>';
        mSports.forEach(s => {
          theadHtml += `<th style="min-width: 90px;" class="text-center">${s}</th>`;
        });
        theadHtml += '<th style="min-width: 80px;" class="text-center">Total</th></tr>';

        let tbodyHtml = mRows.map(row => {
          let tr = `<tr><td><strong class="text-dark">${row.department}</strong></td>`;
          mSports.forEach(s => {
            const count = (row.counts && row.counts[s]) || 0;
            if (count > 0) {
              tr += `<td class="text-center">
                <a href="javascript:void(0)" class="matrix-badge-cell has-data" onclick="openStudentsModal('matrix', '${row.department.replace(/'/g, "\\'")}', '${s.replace(/'/g, "\\'")}')" title="Click to view ${count} students in ${row.department} - ${s}">
                  ${count}
                </a>
              </td>`;
            } else {
              tr += `<td class="text-center"><span class="matrix-badge-cell zero-data">0</span></td>`;
            }
          });
          tr += `<td class="text-center"><strong class="badge bg-dark fs-6">${row.total}</strong></td></tr>`;
          return tr;
        }).join('');

        // Bottom Totals Row
        let tfootHtml = `<tr class="table-secondary fw-bold"><td><strong>Total Across Sports</strong></td>`;
        let grandTotal = 0;
        mSports.forEach(s => {
          const tot = (colTotals && colTotals[s]) || 0;
          grandTotal += tot;
          tfootHtml += `<td class="text-center"><span class="badge bg-primary fs-6">${tot}</span></td>`;
        });
        tfootHtml += `<td class="text-center"><span class="badge bg-success fs-6">${grandTotal}</span></td></tr>`;

        matrixContainer.innerHTML = `
          <table class="table matrix-table table-bordered align-middle mb-0">
            <thead>${theadHtml}</thead>
            <tbody>${tbodyHtml}</tbody>
            <tfoot>${tfootHtml}</tfoot>
          </table>
        `;
      }
    }

    // 6. Gender Breakdown (Section 7)
    const ga = analytics.genderAnalytics || {};
    const boysCount = ga.boys || 0;
    const girlsCount = ga.girls || 0;
    const boysPct = ga.boyPercentage || 0;
    const girlsPct = ga.girlPercentage || 0;

    const bCountEl = document.getElementById('gender-ratio-boys-count');
    const gCountEl = document.getElementById('gender-ratio-girls-count');
    const bProgEl = document.getElementById('gender-progress-boys');
    const gProgEl = document.getElementById('gender-progress-girls');

    if (bCountEl) bCountEl.innerText = boysCount;
    if (gCountEl) gCountEl.innerText = girlsCount;
    if (bProgEl) {
      bProgEl.style.width = `${boysPct}%`;
      bProgEl.innerText = `${boysPct}% (${boysCount})`;
    }
    if (gProgEl) {
      gProgEl.style.width = `${girlsPct}%`;
      gProgEl.innerText = `${girlsPct}% (${girlsCount})`;
    }

    const genderSportList = document.getElementById('analytics-gender-sport-list');
    if (genderSportList) {
      const sportBreakdown = ga.sportBreakdown || [];
      if (sportBreakdown.length === 0) {
        genderSportList.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">No gender breakdown available.</td></tr>';
      } else {
        genderSportList.innerHTML = sportBreakdown.map(sb => {
          const bRatio = sb.total > 0 ? Math.round((sb.boys / sb.total) * 100) : 0;
          const gRatio = sb.total > 0 ? Math.round((sb.girls / sb.total) * 100) : 0;
          return `
            <tr>
              <td><strong>${sb.sport}</strong></td>
              <td class="text-center fw-semibold text-primary">${sb.boys}</td>
              <td class="text-center fw-semibold text-danger">${sb.girls}</td>
              <td class="text-center fw-bold">${sb.total}</td>
              <td class="text-center">
                <small class="badge bg-light text-dark border">
                  ${bRatio}% Boys &bull; ${gRatio}% Girls
                </small>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.error('Error loading registration analytics:', err);
    showToast('Failed to load registration analytics: ' + err.message, 'error');
  }
}

function resetAnalyticsFilters() {
  const t = document.getElementById('analytics-filter-tournament');
  const s = document.getElementById('analytics-filter-sport');
  const g = document.getElementById('analytics-filter-gender');
  const d = document.getElementById('analytics-filter-dept');
  const st = document.getElementById('analytics-filter-status');
  const dt = document.getElementById('analytics-filter-start');

  if (t) t.value = 'All';
  if (s) s.value = 'All';
  if (g) g.value = 'All';
  if (d) d.value = 'All';
  if (st) st.value = 'All';
  if (dt) dt.value = '';

  loadRegistrationAnalytics();
}

// Open Drill-Down Modal to Inspect Exact Registered Students (Sections 4, 5, 6)
function openStudentsModal(type, p1, p2) {
  let filtered = [...window.analyticsStudentsData];
  let title = 'Registered Students';
  let subtitle = '';

  if (type === 'department') {
    filtered = filtered.filter(s => s.department === p1);
    title = `${p1} — Registered Students`;
    subtitle = `All students registered from ${p1} across sports competitions`;
  } else if (type === 'sport') {
    filtered = filtered.filter(s => s.sportName.toLowerCase() === p1.toLowerCase());
    title = `${p1} — Registered Athletes`;
    subtitle = `All students registered for ${p1} competition`;
  } else if (type === 'matrix') {
    filtered = filtered.filter(s => s.department === p1 && s.sportName.toLowerCase() === p2.toLowerCase());
    title = `${p1} × ${p2} Registrations`;
    subtitle = `Individual student registration records for ${p1} in ${p2}`;
  }

  window.currentModalFilteredStudents = filtered;

  const titleEl = document.getElementById('registered-modal-title');
  const subEl = document.getElementById('registered-modal-subtitle');
  const countBadge = document.getElementById('modal-students-count-badge');
  const searchInput = document.getElementById('modal-students-search');

  if (titleEl) titleEl.innerText = title;
  if (subEl) subEl.innerText = subtitle;
  if (countBadge) countBadge.innerText = `${filtered.length} Students`;
  if (searchInput) searchInput.value = '';

  renderModalStudentsTable(filtered);

  const modalEl = document.getElementById('registeredStudentsModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}

function renderModalStudentsTable(students) {
  const tbody = document.getElementById('modal-students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5 text-muted">No students matching the criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = students.map((s, idx) => `
    <tr>
      <td class="text-muted small">${idx + 1}</td>
      <td>
        <div class="fw-bold text-dark">${s.studentName}</div>
        <small class="text-muted" style="font-size: 0.75rem;">${s.registrationCode}</small>
      </td>
      <td>
        <span class="badge bg-light text-dark font-monospace border">${s.registerNumber}</span>
      </td>
      <td>
        <span class="badge ${s.gender === 'Boys' ? 'bg-primary-subtle text-primary border' : 'bg-danger-subtle text-danger border'}">
          ${s.gender}
        </span>
      </td>
      <td>
        <span class="badge bg-secondary bg-opacity-10 text-dark">${s.department}</span>
      </td>
      <td>
        <strong class="text-primary">${s.sportName}</strong>
      </td>
      <td>
        <small class="text-dark">${s.tournamentName}</small>
      </td>
      <td>
        <small class="text-muted">${formatDate(s.registrationDate)}</small>
      </td>
      <td>
        <span class="badge ${s.registrationType === 'TEAM' ? 'bg-success bg-opacity-15 text-success' : 'bg-info bg-opacity-15 text-info'} border">
          ${s.registrationType}
        </span>
      </td>
      <td>
        <span class="badge bg-success bg-opacity-15 text-success">
          <i class="bi bi-check-circle-fill me-1"></i>${s.status}
        </span>
      </td>
    </tr>
  `).join('');
}

function filterModalStudentsList() {
  const q = (document.getElementById('modal-students-search')?.value || '').toLowerCase().trim();
  if (!q) {
    renderModalStudentsTable(window.currentModalFilteredStudents);
    return;
  }

  const results = window.currentModalFilteredStudents.filter(s => 
    s.studentName.toLowerCase().includes(q) ||
    s.registerNumber.toLowerCase().includes(q) ||
    s.department.toLowerCase().includes(q) ||
    s.sportName.toLowerCase().includes(q)
  );

  renderModalStudentsTable(results);
}


// 15. Reports Center
async function generateMasterReport(type) {
  const container = document.getElementById('report-output-container');
  try {
    container.innerHTML = `<div class="p-5 text-center"><div class="spinner-border text-primary"></div><div class="mt-2 text-muted">Compiling official sports department report...</div></div>`;

    const res = await apiRequest(`/reports/${type}`);
    const { reportTitle, college, department, incharge, generatedAt, count, data } = res;

    let tableHeaders = '';
    let tableRows = '';

    if (type === 'players') {
      tableHeaders = '<th>#</th><th>Register No</th><th>Player Name</th><th>Department</th><th>Year</th><th>Section</th><th>Gender</th><th>Mobile</th><th>Status</th>';
      tableRows = data.map((d, i) => `
        <tr>
          <td>${i + 1}</td><td><strong>${d.registerNumber}</strong></td><td>${d.name}</td><td>${d.department}</td>
          <td>${d.year}</td><td>${d.section}</td><td>${d.gender}</td><td>${d.mobile}</td><td>${d.status}</td>
        </tr>
      `).join('');
    } else if (type === 'equipment-stock') {
      tableHeaders = '<th>#</th><th>Code</th><th>Equipment Name</th><th>Discipline</th><th>Total</th><th>Available</th><th>Issued</th><th>Damaged</th><th>Status</th>';
      tableRows = data.map((d, i) => `
        <tr>
          <td>${i + 1}</td><td><strong>${d.code}</strong></td><td>${d.name}</td><td>${d.sportName}</td>
          <td>${d.totalQuantity}</td><td><strong class="${d.availableQuantity <= d.minimumStock ? 'text-danger' : 'text-success'}">${d.availableQuantity}</strong></td>
          <td>${d.issuedQuantity}</td><td>${d.damagedQuantity}</td><td>${d.status}</td>
        </tr>
      `).join('');
    } else if (type === 'equipment-transactions') {
      tableHeaders = '<th>#</th><th>Student</th><th>Register No</th><th>Equipment</th><th>Qty</th><th>Issue Date</th><th>Due Date</th><th>Return Date</th><th>Status</th>';
      tableRows = data.map((d, i) => `
        <tr>
          <td>${i + 1}</td><td>${d.studentName}</td><td>${d.registerNumber}</td><td>${d.equipmentName}</td>
          <td>${d.quantity}</td><td>${formatDate(d.issueDate)}</td><td>${formatDate(d.expectedReturnDate)}</td>
          <td>${d.returnDate ? formatDate(d.returnDate) : '-'}</td><td>${d.status}</td>
        </tr>
      `).join('');
    } else if (type === 'competitions') {
      tableHeaders = '<th>#</th><th>Tournament Name</th><th>Sport</th><th>Level</th><th>Venue</th><th>Date</th><th>Registrations</th><th>Status</th>';
      tableRows = data.map((d, i) => `
        <tr>
          <td>${i + 1}</td><td><strong>${d.name}</strong></td><td>${d.sportName}</td><td>${d.level}</td>
          <td>${d.venue}</td><td>${formatDate(d.date)}</td><td>${d.currentRegistrations || 0}</td><td>${d.status}</td>
        </tr>
      `).join('');
    } else if (type === 'achievements') {
      tableHeaders = '<th>#</th><th>Medal</th><th>Achievement Title</th><th>Student Athlete</th><th>Department</th><th>Sport</th><th>Year</th>';
      tableRows = data.map((d, i) => `
        <tr>
          <td>${i + 1}</td><td><strong>${d.medal}</strong></td><td>${d.title}</td><td>${d.studentName}</td>
          <td>${d.department}</td><td>${d.sportName}</td><td>${d.year}</td>
        </tr>
      `).join('');
    } else {
      tableHeaders = '<th>#</th><th>Record Details</th><th>Status</th>';
      tableRows = data.map((d, i) => `<tr><td>${i + 1}</td><td>${JSON.stringify(d).slice(0, 100)}</td><td>Active</td></tr>`).join('');
    }

    container.innerHTML = `
      <!-- Action buttons (no-print) -->
      <div class="d-flex gap-2 mb-3 no-print" id="master-report-actions">
        <button class="btn btn-outline-primary fw-semibold" onclick="printMasterReport()">
          <i class="bi bi-printer me-1"></i> Print Report
        </button>
        <button class="btn btn-outline-danger fw-semibold" onclick="downloadMasterReportPDF('${(reportTitle||type).replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">
          <i class="bi bi-file-earmark-pdf-fill me-1"></i> Download PDF
        </button>
      </div>

      <!-- Printable area (only this gets printed) -->
      <div id="report-printable-area" class="glass-card p-4">
        <!-- Official College Header -->
        <div class="text-center border-bottom pb-3 mb-4">
          <h4 class="fw-bold mb-1 text-primary">${college.toUpperCase()}</h4>
          <h6 class="fw-bold text-dark mb-1">${department}</h6>
          <div class="text-secondary small">IDAPPADI, SALEM DISTRICT – 637101, TAMIL NADU</div>
          <hr class="my-2">
          <h5 class="fw-bold text-success mb-1">${reportTitle}</h5>
          <div class="small text-muted">Generated on: ${new Date(generatedAt).toLocaleString('en-IN')} &bull; Total Records: <strong>${count}</strong></div>
        </div>

        <div class="table-responsive">
          <table class="table table-bordered table-sm table-striped">
            <thead>
              <tr class="table-primary">${tableHeaders}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>

        <!-- Official Signatures for Print -->
        <div class="row mt-5 pt-4 border-top report-signature-block">
          <div class="col-4 text-center">
            <div class="small text-muted mb-4">Prepared By</div>
            <strong>Office Assistant</strong>
          </div>
          <div class="col-4 text-center">
            <div class="small text-muted mb-4">Verified By</div>
            <strong>${incharge}</strong><br>
            <small class="text-muted">Physical Directress & Sports Incharge</small>
          </div>
          <div class="col-4 text-center">
            <div class="small text-muted mb-4">Approved By</div>
            <strong>Principal</strong><br>
            <small class="text-muted">GASC, Idappadi</small>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="text-center text-danger py-4">Failed to generate report: ${err.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT PRINT / PDF HELPERS — Electron IPC + Browser Fallback
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a fully self-contained HTML string for printing.
 * Embeds base print CSS inline so the hidden BrowserWindow renders correctly.
 */
function buildReportHTML(contentElement, pageTitle) {
  if (!contentElement) return null;
  const PRINT_CSS = `
    @page { size: A4 portrait; margin: 15mm 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #000; background: #fff; margin: 0; padding: 12px; }
    h3, h4, h5, h6 { font-family: 'Segoe UI', Arial, sans-serif; margin: 0 0 4px 0; }
    .text-center { text-align: center; }
    .text-primary { color: #0d6efd; }
    .text-success { color: #198754; }
    .text-danger { color: #dc3545; }
    .text-muted, .text-secondary { color: #555; }
    .fw-bold { font-weight: 700; }
    .fw-semibold { font-weight: 600; }
    .small { font-size: 0.85em; }
    .border-bottom { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
    .border-top { border-top: 2px solid #333; }
    .mb-1 { margin-bottom: 4px; } .mb-4 { margin-bottom: 16px; } .mt-5 { margin-top: 24px; } .pt-4 { padding-top: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 8px; }
    th { background: #e8e8e8 !important; font-weight: 700; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.03em; }
    th, td { border: 1px solid #aaa; padding: 4pt 6pt; text-align: left; }
    tr:nth-child(even) td { background: #f7f7f7; }
    .table-responsive { overflow: visible; }
    .row { display: flex; flex-wrap: wrap; }
    .col-4 { flex: 0 0 33.33%; max-width: 33.33%; padding: 0 8px; }
    .col-12 { flex: 0 0 100%; }
    hr { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
    /* Department groups */
    .department-report-group { break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px; }
    .dept-header { background: #1a3a5c !important; color: #fff !important; padding: 6px 10px; font-weight: 700; font-size: 11pt; border-radius: 4px; margin-bottom: 8px; }
    .dept-header .badge { background: rgba(255,255,255,0.25); color: #fff; padding: 2px 8px; border-radius: 20px; font-size: 9pt; margin-left: 8px; }
    .trr-signature-block, .report-signature-block { break-inside: avoid; page-break-inside: avoid; margin-top: 30pt; }
    /* Hide screen-only elements */
    .no-print, .btn, button { display: none !important; }
    .glass-card { background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9pt; }
    .bg-primary { background: #0d6efd !important; color: #fff !important; }
    .bg-success { background: #198754 !important; color: #fff !important; }
    .bg-danger { background: #dc3545 !important; color: #fff !important; }
    .bg-warning { background: #ffc107 !important; color: #000 !important; }
    .bg-info { background: #0dcaf0 !important; }
    .bg-secondary { background: #6c757d !important; color: #fff !important; }
  `;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle || 'Official Report — GASC Idappadi'}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  ${contentElement.innerHTML}
</body>
</html>`;
  return html;
}

/**
 * Trigger print via Electron IPC (reliable in packaged app with disabled GPU)
 * Falls back to window.print() in browser context.
 */
async function electronPrint(html, filename) {
  if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
    showToast('Sending to printer... please wait.', 'info', 'Printing');
    try {
      const result = await window.electronAPI.invoke('report:print', { html, filename });
      if (result && result.success) {
        showToast('Report sent to printer successfully!', 'success', 'Print Complete');
      } else if (result && result.failureReason === 'cancelled') {
        // User cancelled — no toast needed
      } else {
        showToast('Print cancelled or no printer found. Try Download PDF instead.', 'warning', 'Print');
      }
    } catch(e) {
      showToast('Print failed: ' + e.message, 'error', 'Print Error');
    }
  } else {
    // Browser fallback
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); win.close(); }
  }
}

/**
 * Trigger PDF save via Electron IPC (uses printToPDF — 100% reliable)
 * Falls back to window.print() with "Save as PDF" instruction.
 */
async function electronSavePDF(html, filename) {
  if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
    showToast('Generating PDF... please wait.', 'info', 'Generating PDF');
    try {
      const result = await window.electronAPI.invoke('report:savePDF', { html, filename });
      if (result && result.success) {
        showToast('PDF saved successfully! File opened automatically.', 'success', 'PDF Saved');
      } else if (result && result.failureReason === 'cancelled') {
        // User cancelled
      } else {
        showToast('PDF generation failed: ' + (result && result.failureReason || 'unknown error'), 'error', 'PDF Error');
      }
    } catch(e) {
      showToast('PDF error: ' + e.message, 'error', 'PDF Error');
    }
  } else {
    // Browser fallback
    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html); win.document.close(); win.focus();
      showToast('In the print dialog, choose "Save as PDF" as destination.', 'info', 'Save as PDF');
      setTimeout(() => { win.print(); }, 400);
    }
  }
}

// ── Print Master Report ──
async function printMasterReport() {
  const printArea = document.getElementById('report-printable-area');
  if (!printArea) { showToast('Please generate a report first before printing.', 'warning', 'No Report'); return; }
  const title = printArea.querySelector('h5')?.textContent?.trim() || 'Official Report — GASC Idappadi';
  const html = buildReportHTML(printArea, title);
  if (html) await electronPrint(html, title);
}

// ── Download Master Report as PDF ──
async function downloadMasterReportPDF(title) {
  const printArea = document.getElementById('report-printable-area');
  if (!printArea) { showToast('Please generate a report first before downloading PDF.', 'warning', 'No Report'); return; }
  const safeTitle = (title || 'Official_Report').replace(/[\s\W]+/g, '_') + '_GASC_Idappadi';
  const html = buildReportHTML(printArea, safeTitle);
  if (html) await electronSavePDF(html, safeTitle);
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// TOURNAMENT REGISTRATION REPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

let trrCompetitionsCache = [];
let currentTrrData = null;

// Show/toggle the tournament registration filter panel and load tournaments
async function showTournamentRegistrationPanel() {
  // Hide generic report output, show TRR panel
  const genericOut = document.getElementById('report-output-container');
  if (genericOut) genericOut.innerHTML = `<div class="p-5 text-center text-muted">Select any report button above to preview and print.</div>`;

  const panel = document.getElementById('tournament-reg-report-panel');
  if (!panel) return;
  panel.classList.remove('d-none');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Highlight active button
  document.querySelectorAll('.glass-card .btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-tournament-reg-report');
  if (btn) btn.classList.add('active');

  // Load tournament list from competitions
  const sel = document.getElementById('trr-tournament');
  if (sel && sel.options.length <= 1) {
    try {
      const res = await apiRequest('/competitions');
      trrCompetitionsCache = res.competitions || [];
      // Collect unique tournament names
      const tournamentNames = new Set();
      trrCompetitionsCache.forEach(c => {
        const tName = c.tournamentName || c.tournament_name || (c.name || '').split('-')[0].trim();
        if (tName) tournamentNames.add(tName);
      });
      sel.innerHTML = '<option value="">-- Select Tournament --</option>';
      [...tournamentNames].sort().forEach(t => {
        sel.innerHTML += `<option value="${t}">${t}</option>`;
      });
    } catch (e) {
      showToast('Could not load tournaments: ' + e.message, 'error');
    }
  }

  // Clear output area if not yet generated
  const outArea = document.getElementById('trr-output-area');
  if (outArea && !currentTrrData) outArea.innerHTML = '';
}

// When tournament changes, update sport dropdown immediately with available sports for this tournament
function onTournamentChange() {
  const tSel = document.getElementById('trr-tournament');
  const sportSel = document.getElementById('trr-sport');
  const selectedTournament = (tSel ? tSel.value : '').trim().toLowerCase();

  if (sportSel) {
    sportSel.innerHTML = '<option value="All">All Sports</option>';
    if (selectedTournament && trrCompetitionsCache.length > 0) {
      const sportsForTourn = new Set();
      trrCompetitionsCache.forEach(c => {
        const tName = (c.tournamentName || c.tournament_name || (c.name || '').split('-')[0].trim() || '').toLowerCase();
        if (tName === selectedTournament || tName.includes(selectedTournament) || selectedTournament.includes(tName)) {
          const sName = c.sportName || c.sport_name;
          if (sName) sportsForTourn.add(sName);
        }
      });
      [...sportsForTourn].sort().forEach(s => {
        sportSel.innerHTML += `<option value="${s}">${s}</option>`;
      });
    }
  }
}

let trrCurrentViewMode = 'sport';

// Generate the tournament registration report (options: { defaultView?: 'sport' | 'department' })
async function generateTournamentRegistrationReport(options = {}) {
  const tournamentName = document.getElementById('trr-tournament')?.value?.trim();
  const sport = document.getElementById('trr-sport')?.value || 'All';
  const gender = document.getElementById('trr-gender')?.value || 'All';
  const department = document.getElementById('trr-department')?.value || 'All';

  if (!tournamentName) {
    showToast('Please select a tournament first.', 'warning', 'No Tournament Selected');
    const tSel = document.getElementById('trr-tournament');
    if (tSel) tSel.focus();
    return;
  }

  if (options.defaultView) {
    trrCurrentViewMode = options.defaultView;
  }

  const outArea = document.getElementById('trr-output-area');
  const genBtn = document.getElementById('btn-trr-generate');
  if (genBtn) { genBtn.disabled = true; genBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generating...'; }
  if (outArea) outArea.innerHTML = `<div class="p-5 text-center"><div class="spinner-border text-primary"></div><div class="mt-2 text-muted">Fetching real database registration data...</div></div>`;

  try {
    const params = new URLSearchParams({ tournamentName, sport, gender, department });
    const res = await apiRequest(`/reports/tournament-registrations?${params}`);

    if (!res.success) throw new Error(res.message);

    currentTrrData = res;

    // Update sport dropdown with sports in this tournament
    const sportSel = document.getElementById('trr-sport');
    if (sportSel && res.sportsInReport && res.sportsInReport.length > 0) {
      const currentVal = sportSel.value;
      sportSel.innerHTML = '<option value="All">All Sports</option>';
      res.sportsInReport.sort().forEach(s => {
        sportSel.innerHTML += `<option value="${s}">${s}</option>`;
      });
      if (res.sportsInReport.includes(currentVal)) sportSel.value = currentVal;
    }

    renderTournamentReportHTML(trrCurrentViewMode);

  } catch (err) {
    if (outArea) outArea.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Failed to generate report: ${err.message}</div>`;
  } finally {
    if (genBtn) { genBtn.disabled = false; genBtn.innerHTML = '<i class="bi bi-search me-1"></i> Generate Report'; }
  }
}

// 1-Click action to generate and download Total Department Report across all departments
async function generateTotalDepartmentReport() {
  const tSel = document.getElementById('trr-tournament');
  if (!tSel || !tSel.value) {
    showToast('Please select a tournament first from the dropdown.', 'warning', 'No Tournament Selected');
    if (tSel) tSel.focus();
    return;
  }

  // Set department filter to All Departments
  const deptSel = document.getElementById('trr-department');
  if (deptSel) deptSel.value = 'All';

  // Generate directly into department order view
  await generateTournamentRegistrationReport({ defaultView: 'department' });

  // Scroll smoothly to the generated report
  const outArea = document.getElementById('trr-output-area');
  if (outArea) outArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Switch between Category View and Department Order View
function switchTrrView(mode) {
  trrCurrentViewMode = mode;
  if (!currentTrrData) {
    generateTournamentRegistrationReport({ defaultView: mode });
  } else {
    renderTournamentReportHTML(mode);
  }
}

// Render the report HTML based on selected view mode ('sport' or 'department')
function renderTournamentReportHTML(viewMode = 'sport') {
  const outArea = document.getElementById('trr-output-area');
  if (!outArea || !currentTrrData) return;

  const res = currentTrrData;
  const { college, department: deptName, incharge, generatedAt, summary, individualRows, teamRows, departmentRows, groupedByDepartment, departmentSummary, tournamentName, filters } = res;

  const genDateStr = new Date(generatedAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const filterLabels = [
    `Tournament: <strong>${tournamentName}</strong>`,
    `Sport: <strong>${filters.sport || 'All'}</strong>`,
    `Gender: <strong>${filters.gender || 'All'}</strong>`,
    `Department: <strong>${filters.department || 'All'}</strong>`
  ].join(' &nbsp;|&nbsp; ');

  // View Switcher Bar (Tabs)
  const viewSwitcherHtml = `
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 pb-2 border-bottom no-print">
      <div class="btn-group btn-group-sm" role="group">
        <button type="button" class="btn ${viewMode === 'sport' ? 'btn-primary' : 'btn-outline-primary'}" onclick="switchTrrView('sport')">
          <i class="bi bi-grid-fill me-1"></i> By Sport Category
        </button>
        <button type="button" class="btn ${viewMode === 'department' ? 'btn-success' : 'btn-outline-success'}" onclick="switchTrrView('department')">
          <i class="bi bi-diagram-3-fill me-1"></i> By Department Order
        </button>
      </div>
      <div class="small text-muted">
        Viewing mode: <strong>${viewMode === 'department' ? 'Department-Wise Order (All Departments)' : 'Individual & Team Sports'}</strong>
      </div>
    </div>`;

  // Summary counts bar
  const summaryHtml = `
    <div class="row g-2 mb-4">
      <div class="col-6 col-md-2">
        <div class="text-center p-2 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-20">
          <div class="fw-bold fs-4 text-primary">${summary.totalRegistrations}</div>
          <div class="small text-muted">Total Registrations</div>
        </div>
      </div>
      <div class="col-6 col-md-2">
        <div class="text-center p-2 rounded-3 bg-success bg-opacity-10 border border-success border-opacity-20">
          <div class="fw-bold fs-4 text-success">${summary.individualRegistrations}</div>
          <div class="small text-muted">Individual Registrations</div>
        </div>
      </div>
      <div class="col-6 col-md-2">
        <div class="text-center p-2 rounded-3 bg-info bg-opacity-10 border border-info border-opacity-20">
          <div class="fw-bold fs-4 text-info">${summary.teamRegistrations}</div>
          <div class="small text-muted">Team Registrations</div>
        </div>
      </div>
      <div class="col-6 col-md-2">
        <div class="text-center p-2 rounded-3 bg-warning bg-opacity-10 border border-warning border-opacity-20">
          <div class="fw-bold fs-4 text-warning">${summary.totalTeams}</div>
          <div class="small text-muted">Total Teams</div>
        </div>
      </div>
      <div class="col-6 col-md-2">
        <div class="text-center p-2 rounded-3 bg-danger bg-opacity-10 border border-danger border-opacity-20">
          <div class="fw-bold fs-4 text-danger">${summary.totalTeamPlayers}</div>
          <div class="small text-muted">Total Players (Selected)</div>
        </div>
      </div>
      <div class="col-6 col-md-2">
        <div class="text-center p-2 rounded-3 bg-secondary bg-opacity-10 border border-secondary border-opacity-20">
          <div class="fw-bold fs-4 text-secondary">${summary.totalDepartments || 0}</div>
          <div class="small text-muted">Departments</div>
        </div>
      </div>
    </div>`;

  let mainContentHtml = '';

  if (viewMode === 'department') {
    // ═══════════════════════════════════════════════════════════════════════
    // DEPARTMENT-WISE ORDER VIEW
    // ═══════════════════════════════════════════════════════════════════════

    // Department summary badges bar
    let deptBadgesHtml = '';
    if (departmentSummary && departmentSummary.length > 0) {
      deptBadgesHtml = `
        <div class="mb-4 p-3 rounded-3 bg-light border">
          <div class="small fw-bold text-uppercase text-secondary mb-2">
            <i class="bi bi-buildings me-1"></i> Department Breakdown (${departmentSummary.length} Departments)
          </div>
          <div class="d-flex flex-wrap gap-2">
            ${departmentSummary.map(d => `
              <span class="badge bg-white text-dark border p-2 shadow-sm">
                <strong class="text-primary">${d.department}</strong>:
                <span class="badge bg-primary rounded-pill ms-1">${d.count}</span>
                <span class="text-muted ms-1 small">(${d.boysCount} Boys, ${d.girlsCount} Girls)</span>
              </span>
            `).join('')}
          </div>
        </div>`;
    }

    // Render grouped tables by department
    const deptKeys = Object.keys(groupedByDepartment || {}).sort();
    let deptTablesHtml = '';

    if (deptKeys.length > 0) {
      deptTablesHtml = deptKeys.map(deptNameKey => {
        const rows = groupedByDepartment[deptNameKey];
        return `
          <div class="department-report-group mb-4">
            <div class="p-2 px-3 rounded-2 bg-primary bg-opacity-10 border border-primary border-opacity-25 d-flex justify-content-between align-items-center mb-2">
              <span class="fw-bold text-dark fs-6">
                <i class="bi bi-building text-primary me-2"></i>DEPARTMENT: ${deptNameKey.toUpperCase()}
              </span>
              <span class="badge bg-primary rounded-pill px-3 py-1">
                ${rows.length} ${rows.length === 1 ? 'Student' : 'Students'}
              </span>
            </div>
            <div class="table-responsive">
              <table class="table table-bordered table-sm table-striped align-middle mb-1">
                <thead class="table-light">
                  <tr>
                    <th style="width:40px">S.No</th>
                    <th>Register Number</th>
                    <th>Player / Student Name</th>
                    <th>Year</th>
                    <th>Gender</th>
                    <th>Sport Name</th>
                    <th>Category</th>
                    <th>Team Name / Status</th>
                    <th>Reg. Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(r => `
                    <tr>
                      <td class="text-center">${r.deptSNo}</td>
                      <td><code>${r.registerNumber}</code></td>
                      <td><strong>${r.playerName}</strong></td>
                      <td>${r.year}</td>
                      <td><span class="badge ${r.gender === 'Boys' || r.gender === 'Male' ? 'bg-info' : 'bg-danger'} bg-opacity-75">${r.gender}</span></td>
                      <td><strong>${r.sportName}</strong></td>
                      <td><span class="badge ${r.sportType === 'Team' ? 'bg-success' : 'bg-primary'} bg-opacity-75">${r.sportType}</span></td>
                      <td>
                        ${r.sportType === 'Team'
                          ? (r.teamName !== '-' && r.teamName !== 'Not Assigned'
                              ? `<span class="fw-semibold text-success">${r.teamName}</span>`
                              : '<span class="text-muted fst-italic">Not Assigned</span>')
                          : '<span class="text-muted">-</span>'}
                      </td>
                      <td>
                        <span class="badge ${r.registrationStatus === 'Approved' ? 'bg-success' : r.registrationStatus === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}">
                          ${r.registrationStatus}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      }).join('');
    } else {
      deptTablesHtml = `
        <div class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          <strong>No registrations found</strong> for this tournament in any department.
        </div>`;
    }

    mainContentHtml = deptBadgesHtml + deptTablesHtml;

  } else {
    // ═══════════════════════════════════════════════════════════════════════
    // STANDARD VIEW (BY SPORT CATEGORY)
    // ═══════════════════════════════════════════════════════════════════════
    let individualSection = '';
    if (individualRows && individualRows.length > 0) {
      individualSection = `
        <h6 class="fw-bold text-primary border-bottom pb-2 mb-3 mt-4">
          <i class="bi bi-person-fill me-2"></i>INDIVIDUAL SPORT REGISTRATIONS
          <span class="badge bg-primary rounded-pill ms-2">${individualRows.length}</span>
        </h6>
        <div class="table-responsive mb-4">
          <table class="table table-bordered table-sm table-striped align-middle" id="trr-individual-table">
            <thead class="table-primary">
              <tr>
                <th style="width:45px">S.No</th>
                <th>Sport Name</th>
                <th>Register Number</th>
                <th>Player Name</th>
                <th>Year</th>
                <th>Department</th>
                <th>Gender</th>
                <th>Registration Status</th>
              </tr>
            </thead>
            <tbody>
              ${individualRows.map(r => `
                <tr>
                  <td>${r.sNo}</td>
                  <td><strong>${r.sportName}</strong></td>
                  <td><code>${r.registerNumber}</code></td>
                  <td>${r.playerName}</td>
                  <td>${r.year}</td>
                  <td>${r.department}</td>
                  <td><span class="badge ${r.gender === 'Boys' || r.gender === 'Male' ? 'bg-info' : 'bg-danger'} bg-opacity-75">${r.gender}</span></td>
                  <td><span class="badge ${r.registrationStatus === 'Approved' ? 'bg-success' : r.registrationStatus === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}">${r.registrationStatus}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    let teamSection = '';
    if (teamRows && teamRows.length > 0) {
      teamSection = `
        <h6 class="fw-bold text-success border-bottom pb-2 mb-3 mt-4">
          <i class="bi bi-shield-fill me-2"></i>TEAM SPORT REGISTRATIONS
          <span class="badge bg-success rounded-pill ms-2">${teamRows.length}</span>
        </h6>
        <div class="table-responsive mb-4">
          <table class="table table-bordered table-sm table-striped align-middle" id="trr-team-table">
            <thead class="table-success">
              <tr>
                <th style="width:45px">S.No</th>
                <th>Sport Name</th>
                <th>Team Name</th>
                <th>Register Number</th>
                <th>Player Name</th>
                <th>Year</th>
                <th>Department</th>
                <th>Gender</th>
                <th>Team Status</th>
              </tr>
            </thead>
            <tbody>
              ${teamRows.map(r => `
                <tr class="${r.teamStatus === 'Not Assigned' ? 'table-warning' : ''}">
                  <td>${r.sNo}</td>
                  <td><strong>${r.sportName}</strong></td>
                  <td>${r.teamStatus === 'Not Assigned'
                    ? '<span class="text-muted fst-italic">Not Assigned</span>'
                    : `<span class="fw-semibold text-success">${r.teamName}</span>`}</td>
                  <td><code>${r.registerNumber}</code></td>
                  <td>${r.playerName}</td>
                  <td>${r.year}</td>
                  <td>${r.department}</td>
                  <td><span class="badge ${r.gender === 'Boys' || r.gender === 'Male' ? 'bg-info' : 'bg-danger'} bg-opacity-75">${r.gender}</span></td>
                  <td>
                    <span class="badge ${r.teamStatus === 'Selected' ? 'bg-success' : 'bg-warning text-dark'}">
                      ${r.teamStatus}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    const noDataMsg = (!individualRows?.length && !teamRows?.length)
      ? `<div class="text-center py-5 text-muted">
           <i class="bi bi-inbox fs-1 d-block mb-2"></i>
           <strong>No registrations found</strong> for the selected filters.<br>
           <small>Try changing the Sport, Gender, or Department filters.</small>
         </div>`
      : '';

    mainContentHtml = individualSection + teamSection + noDataMsg;
  }

  // Bottom action buttons
  const actionBtns = `
    <div class="d-flex gap-2 flex-wrap mt-4 no-print border-top pt-3">
      <button class="btn btn-primary" onclick="printTournamentReport()">
        <i class="bi bi-printer me-1"></i> Print ${viewMode === 'department' ? 'Department Report' : 'Report'}
      </button>
      <button class="btn btn-danger" onclick="downloadTournamentReportPDF()">
        <i class="bi bi-file-earmark-pdf-fill me-1"></i> Download PDF
      </button>
      ${viewMode === 'sport'
        ? `<button class="btn btn-outline-success" onclick="switchTrrView('department')">
             <i class="bi bi-diagram-3-fill me-1"></i> View in Department Order
           </button>`
        : `<button class="btn btn-outline-primary" onclick="switchTrrView('sport')">
             <i class="bi bi-grid-fill me-1"></i> View by Sport Category
           </button>`
      }
    </div>`;

  outArea.innerHTML = `
    <div class="glass-card p-4" id="trr-printable-area">

      ${viewSwitcherHtml}

      <!-- Official College Header -->
      <div class="text-center border-bottom pb-3 mb-4">
        <h4 class="fw-bold mb-1 text-primary">${college.toUpperCase()}</h4>
        <h6 class="fw-bold text-dark mb-1">${deptName}</h6>
        <div class="text-secondary small">IDAPPADI, SALEM DISTRICT – 637101, TAMIL NADU</div>
        <hr class="my-2">
        <h5 class="fw-bold ${viewMode === 'department' ? 'text-success' : 'text-primary'} mb-1">
          ${viewMode === 'department' ? 'Tournament Registration Report (Total Department-Wise Register)' : 'Tournament Registration Report'}
        </h5>
        <div class="small text-dark fw-semibold mb-1">Tournament: ${tournamentName}</div>
        <div class="small text-muted">${filterLabels}</div>
        <div class="small text-muted mt-1">Generated on: ${genDateStr}</div>
      </div>

      <!-- Summary Counts -->
      ${summaryHtml}

      <!-- Main Tables Content -->
      ${mainContentHtml}

      <!-- Signature Block (for print/PDF) -->
      <div class="row mt-5 pt-4 border-top" id="trr-signature-block">
        <div class="col-4 text-center">
          <div class="small text-muted mb-4">Prepared By</div>
          <strong>Office Assistant</strong>
        </div>
        <div class="col-4 text-center">
          <div class="small text-muted mb-4">Verified By</div>
          <strong>${incharge}</strong><br>
          <small class="text-muted">Physical Directress &amp; Sports Incharge</small>
        </div>
        <div class="col-4 text-center">
          <div class="small text-muted mb-4">Approved By</div>
          <strong>Principal</strong><br>
          <small class="text-muted">GASC, Idappadi</small>
        </div>
      </div>

      ${actionBtns}
    </div>`;
}

// ── Print Tournament Registration Report ──
async function printTournamentReport() {
  const printArea = document.getElementById('trr-printable-area');
  if (!printArea) { showToast('Please generate a report first before printing.', 'warning', 'No Report'); return; }
  const tName = (currentTrrData && currentTrrData.tournamentName) || document.getElementById('trr-tournament')?.value || 'Tournament';
  const isDept = trrCurrentViewMode === 'department';
  const title = `${isDept ? 'Total Department Report' : 'Tournament Registration Report'} — ${tName} — GASC Idappadi`;
  const html = buildReportHTML(printArea, title);
  if (html) await electronPrint(html, title);
}

// ── Download Tournament Report as PDF ──
async function downloadTournamentReportPDF(tournamentName) {
  const printArea = document.getElementById('trr-printable-area');
  if (!printArea) { showToast('Please generate a report first before downloading PDF.', 'warning', 'No Report'); return; }
  const tName = tournamentName || (currentTrrData && currentTrrData.tournamentName) || document.getElementById('trr-tournament')?.value || 'Tournament';
  const isDept = trrCurrentViewMode === 'department';
  const filename = isDept
    ? `Tournament_Total_Department_Report_${tName.replace(/[\s\W]+/g, '_')}_GASC_Idappadi`
    : `Tournament_Registration_Report_${tName.replace(/[\s\W]+/g, '_')}_GASC_Idappadi`;
  const html = buildReportHTML(printArea, filename);
  if (html) await electronSavePDF(html, filename);
}

// 16. Settings
async function loadAdminSettings() {

  try {
    const res = await apiRequest('/settings');
    const s = res.settings;

    document.getElementById('set-college-name').value = s.collegeName || '';
    document.getElementById('set-dept-name').value = s.departmentName || '';
    document.getElementById('set-incharge-name').value = s.sportsInchargeName || '';
    document.getElementById('set-incharge-role').value = s.sportsInchargeRole || '';
    document.getElementById('set-email').value = s.email || '';
    document.getElementById('set-phone').value = s.phone || '';
    document.getElementById('set-address').value = s.address || '';
    document.getElementById('set-office-hours').value = s.officeHours || '';

    // Profile photo preview
    const photo = s.sportsInchargePhoto || s.profilePhoto || currentAdminUser?.profilePhoto || 'images/default-avatar.png';
    const previewEl = document.getElementById('set-preview-photo');
    if (previewEl) previewEl.src = photo;
    const photoUrlInput = document.getElementById('set-photo-url');
    if (photoUrlInput) photoUrlInput.value = photo;
    const badgeEl = document.getElementById('set-photo-badge');
    if (badgeEl) badgeEl.classList.add('d-none');
    selectedAdminPhotoFile = null;
  } catch (err) {
    showToast('Failed to load settings', 'error');
  }
}

function previewAdminPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast('Image file size must be less than 10MB.', 'warning', 'File Too Large');
    event.target.value = '';
    return;
  }

  selectedAdminPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewEl = document.getElementById('set-preview-photo');
    if (previewEl) previewEl.src = e.target.result;
    const badgeEl = document.getElementById('set-photo-badge');
    if (badgeEl) {
      badgeEl.classList.remove('d-none');
      badgeEl.innerHTML = '<i class="bi bi-check-circle me-1"></i>New Image Staged (Click Save Settings)';
    }
  };
  reader.readAsDataURL(file);
}

function promptPhotoUrl() {
  const currentUrl = document.getElementById('set-photo-url')?.value || '';
  const newUrl = prompt('Enter public image URL for Sports Incharge photo:', currentUrl.startsWith('http') ? currentUrl : '');
  if (newUrl && newUrl.trim()) {
    selectedAdminPhotoFile = null;
    const fileInput = document.getElementById('set-photo-file');
    if (fileInput) fileInput.value = '';
    const previewEl = document.getElementById('set-preview-photo');
    if (previewEl) previewEl.src = newUrl.trim();
    const photoUrlInput = document.getElementById('set-photo-url');
    if (photoUrlInput) photoUrlInput.value = newUrl.trim();
    const badgeEl = document.getElementById('set-photo-badge');
    if (badgeEl) {
      badgeEl.classList.remove('d-none');
      badgeEl.innerHTML = '<i class="bi bi-link-45deg me-1"></i>URL Staged (Click Save Settings)';
    }
  }
}

function resetAdminPhoto() {
  selectedAdminPhotoFile = null;
  const fileInput = document.getElementById('set-photo-file');
  if (fileInput) fileInput.value = '';
  const previewEl = document.getElementById('set-preview-photo');
  if (previewEl) previewEl.src = 'images/default-avatar.png';
  const photoUrlInput = document.getElementById('set-photo-url');
  if (photoUrlInput) photoUrlInput.value = 'images/default-avatar.png';
  const badgeEl = document.getElementById('set-photo-badge');
  if (badgeEl) {
    badgeEl.classList.remove('d-none');
    badgeEl.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1"></i>Reset Staged (Click Save Settings)';
  }
}

async function saveAdminSettings(event) {
  event.preventDefault();
  const collegeName = document.getElementById('set-college-name').value;
  const departmentName = document.getElementById('set-dept-name').value;
  const sportsInchargeName = document.getElementById('set-incharge-name').value;
  const sportsInchargeRole = document.getElementById('set-incharge-role').value;
  const email = document.getElementById('set-email').value;
  const phone = document.getElementById('set-phone').value;
  const address = document.getElementById('set-address').value;
  const officeHours = document.getElementById('set-office-hours').value;
  const sportsInchargePhoto = document.getElementById('set-photo-url')?.value || '';

  const btn = event.target.querySelector('button[type="submit"]');

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving Settings & Photo...';
    }

    let res;
    const token = localStorage.getItem('gasc_token');

    if (selectedAdminPhotoFile) {
      // Send multipart FormData with file
      const formData = new FormData();
      formData.append('collegeName', collegeName);
      formData.append('departmentName', departmentName);
      formData.append('sportsInchargeName', sportsInchargeName);
      formData.append('sportsInchargeRole', sportsInchargeRole);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('address', address);
      formData.append('officeHours', officeHours);
      formData.append('profilePhoto', selectedAdminPhotoFile);

      res = await apiRequest('/settings', 'PUT', formData, true);
    } else {
      // Standard JSON update
      res = await apiRequest('/settings', 'PUT', {
        collegeName,
        departmentName,
        sportsInchargeName,
        sportsInchargeRole,
        email,
        phone,
        address,
        officeHours,
        sportsInchargePhoto
      });
    }

    if (res && res.settings) {
      const s = res.settings;
      const updatedPhoto = s.sportsInchargePhoto || s.profilePhoto;

      // Immediately update topbar avatar
      const avatarEl = document.getElementById('admin-header-avatar');
      if (avatarEl && updatedPhoto) avatarEl.src = updatedPhoto;

      // Update preview and clear staging badge
      const previewEl = document.getElementById('set-preview-photo');
      if (previewEl && updatedPhoto) previewEl.src = updatedPhoto;
      const photoUrlInput = document.getElementById('set-photo-url');
      if (photoUrlInput && updatedPhoto) photoUrlInput.value = updatedPhoto;
      const badgeEl = document.getElementById('set-photo-badge');
      if (badgeEl) badgeEl.classList.add('d-none');
      selectedAdminPhotoFile = null;

      // Immediately reflect updated profile name and role in topbar
      const nameEl = document.getElementById('admin-display-name');
      if (nameEl && s.sportsInchargeName) nameEl.innerText = s.sportsInchargeName;

      const roleEl = document.getElementById('admin-display-role');
      if (roleEl && s.sportsInchargeRole) roleEl.innerText = s.sportsInchargeRole;

      const coachInput = document.getElementById('add-sport-coach-input');
      if (coachInput && s.sportsInchargeName) coachInput.value = s.sportsInchargeName;

      // Update current admin user session
      if (currentAdminUser) {
        if (s.sportsInchargeName) currentAdminUser.name = s.sportsInchargeName;
        if (updatedPhoto) currentAdminUser.profilePhoto = updatedPhoto;
        localStorage.setItem('gasc_user', JSON.stringify(currentAdminUser));
      }
    }

    showToast(res.message || 'Sports Department settings and Profile Photo updated successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-save me-1"></i> Save Settings';
    }
  }
}

// 13. College Roster & Excel Import
let allRosterCache = [];

async function loadAdminRoster() {
  const tbody = document.getElementById('admin-roster-table') || document.getElementById('roster-table-body');
  if (!tbody) return;

  const search = (document.getElementById('roster-search-input')?.value || '').trim();
  const dept = document.getElementById('roster-filter-dept')?.value || 'All';
  const year = document.getElementById('roster-filter-year')?.value || 'All';
  const status = document.getElementById('roster-filter-status')?.value || 'All';

  let url = '/roster?';
  const params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (dept && dept !== 'All') params.push(`department=${encodeURIComponent(dept)}`);
  if (year && year !== 'All') params.push(`year=${encodeURIComponent(year)}`);
  if (status && status !== 'All') params.push(`status=${encodeURIComponent(status)}`);
  url += params.join('&');

  try {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-secondary"><span class="spinner-border spinner-border-sm me-2"></span>Loading college roster...</td></tr>';
    const res = await apiRequest(url);
    allRosterCache = res.students || [];

    // Update stats
    const totalEl = document.getElementById('roster-stat-total');
    if (totalEl) totalEl.innerText = res.totalCount || 0;

    const regEl = document.getElementById('roster-stat-registered');
    if (regEl) regEl.innerText = res.registeredCount || 0;

    const pendEl = document.getElementById('roster-stat-pending');
    if (pendEl) pendEl.innerText = res.pendingCount || 0;

    renderRosterTable(allRosterCache);
  } catch (err) {
    console.error('Error loading roster:', err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Failed to load roster: ${err.message}</td></tr>`;
  }
}

function renderRosterTable(students) {
  const tbody = document.getElementById('admin-roster-table') || document.getElementById('roster-table-body');
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-secondary">
          <div class="stat-icon bg-secondary bg-opacity-10 text-secondary mx-auto mb-2" style="width: 48px; height: 48px; font-size: 1.5rem;">
            <i class="bi bi-file-earmark-spreadsheet"></i>
          </div>
          <div class="fw-bold text-dark">No Students Found in College Roster</div>
          <small class="text-muted">Upload an Excel spreadsheet or click "Add Student Manually" above to populate the student list.</small>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students.map((s, idx) => {
    const isInactive = (s.status && s.status.toUpperCase() === 'INACTIVE');
    const rosterStatusBadge = isInactive
      ? '<span class="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50 px-2 py-1 fw-bold"><i class="bi bi-x-circle-fill text-danger me-1"></i> INACTIVE</span>'
      : '<span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-2 py-1 fw-bold"><i class="bi bi-check-circle-fill text-success me-1"></i> ACTIVE</span>';

    const portalBadge = s.isRegistered 
      ? '<span class="badge bg-success bg-opacity-25 text-dark border border-success border-opacity-60 px-2 py-1 fw-bold" style="color: #000000 !important;"><i class="bi bi-check-circle-fill text-success me-1"></i> Registered Athlete</span>'
      : '<span class="badge bg-warning bg-opacity-25 text-dark border border-warning border-opacity-60 px-2 py-1 fw-bold" style="color: #000000 !important;"><i class="bi bi-clock-history text-warning me-1"></i> Not Registered Yet</span>';

    const genderIcon = s.gender === 'Female' 
      ? '<span class="badge bg-danger bg-opacity-15 text-dark border border-danger border-opacity-30 fw-semibold" style="color: #000000 !important;"><i class="bi bi-gender-female text-danger me-1"></i>Female</span>'
      : (s.gender === 'Male' ? '<span class="badge bg-primary bg-opacity-15 text-dark border border-primary border-opacity-30 fw-semibold" style="color: #000000 !important;"><i class="bi bi-gender-male text-primary me-1"></i>Male</span>' : '<span class="badge bg-secondary bg-opacity-15 text-dark" style="color: #000000 !important;">Other</span>');

    const studentId = s.id || s._id;
    const toggleBtn = isInactive
      ? `<button type="button" onclick="toggleRosterStudentStatus('${studentId}', 'Active')" class="btn btn-sm btn-success me-1 px-2 py-1 fw-bold shadow-sm" title="Activate Student for Portal Registration"><i class="bi bi-check-lg me-1"></i>Activate</button>`
      : `<button type="button" onclick="toggleRosterStudentStatus('${studentId}', 'Inactive')" class="btn btn-sm btn-warning me-1 px-2 py-1 fw-bold shadow-sm text-dark" title="Deactivate Student (Block Registration)"><i class="bi bi-slash-circle me-1"></i>Deactivate</button>`;

    return `
      <tr>
        <td class="text-muted small">${idx + 1}</td>
        <td>
          <span class="badge bg-dark bg-opacity-85 font-monospace px-2 py-1 fs-6">${s.registerNumber}</span>
        </td>
        <td>
          <div class="fw-bold text-dark">${s.name}</div>
          <small class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-building me-1"></i>${s.collegeName || 'GASC Idappadi'}</small>
        </td>
        <td>
          <span class="badge badge-glass-primary text-dark fw-bold" style="color: #000000 !important;">${s.department}</span>
        </td>
        <td>
          <div class="fw-semibold text-dark">${s.year}</div>
          <small class="text-muted">Section: ${s.section || 'A'}</small>
        </td>
        <td>${genderIcon}</td>
        <td>${rosterStatusBadge}</td>
        <td>${portalBadge}</td>
        <td class="text-center text-nowrap">
          ${toggleBtn}
          <button type="button" onclick="openEditRosterModal('${studentId}')" class="btn btn-sm btn-primary me-1 px-2 py-1 fw-bold shadow-sm" title="Edit Student">
            <i class="bi bi-pencil-square me-1"></i>Edit
          </button>
          <button type="button" onclick="deleteRosterStudent('${studentId}')" class="btn btn-sm btn-danger px-2 py-1 fw-bold shadow-sm" title="Delete Student from Roster">
            <i class="bi bi-trash3-fill me-1"></i>Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function toggleRosterStudentStatus(id, newStatus) {
  const student = allRosterCache.find(s => (s.id === id || s._id === id));
  const studentName = student ? student.name : 'this student';
  const studentRegNo = student ? student.registerNumber : '';

  try {
    const res = await apiRequest(`/roster/${id}/status`, 'PATCH', { status: newStatus });
    showToast(res.message || `Student ${studentName} (${studentRegNo}) status updated to ${newStatus}.`, 'success', 'Status Changed');
    await loadAdminRoster();
  } catch (err) {
    showToast(err.message || 'Failed to change student status.', 'error', 'Error');
  }
}

async function handleRosterExcelUpload(event) {
  event.preventDefault();
  const fileInput = document.getElementById('roster-excel-file-input') || document.getElementById('roster-file-input');
  const btn = document.getElementById('btn-roster-upload-submit') || document.getElementById('btn-upload-roster');

  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('Please select an Excel (.xlsx, .xls) or CSV file first.', 'warning', 'File Required');
    return;
  }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Importing Spreadsheet Rows...';
    }

    const res = await apiRequest('/roster/upload', 'POST', formData, true);
    showToast(res.message, 'success', 'Excel Roster Uploaded');

    fileInput.value = '';
    await loadAdminRoster();
  } catch (err) {
    showToast(err.message || 'Failed to parse and import Excel file.', 'error', 'Upload Failed');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-upload me-1"></i> Upload & Import to Roster';
    }
  }
}

async function submitManualStudentAdd(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const payload = {
    registerNumber: formData.get('registerNumber'),
    name: formData.get('name'),
    department: formData.get('department'),
    year: formData.get('year'),
    section: formData.get('section'),
    gender: formData.get('gender'),
    status: formData.get('status') || 'Active'
  };

  try {
    const res = await apiRequest('/roster/manual', 'POST', payload);
    showToast(res.message, 'success', 'Student Added to Roster');

    const modalEl = document.getElementById('manualAddStudentModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();
    }
    form.reset();

    await loadAdminRoster();
  } catch (err) {
    showToast(err.message, 'error', 'Failed to Add Student');
  }
}

async function deleteRosterStudent(id, name, regNo) {
  const student = allRosterCache.find(s => (s.id === id || s._id === id));
  const studentName = name || (student ? student.name : 'this student');
  const studentRegNo = regNo || (student ? student.registerNumber : '');

  if (!confirm(`Are you sure you want to remove "${studentName}" (${studentRegNo}) from the official college roster?\n\nNOTE: If removed, this student will NOT be able to register on the sports portal.`)) {
    return;
  }

  try {
    const res = await apiRequest(`/roster/${id}`, 'DELETE');
    showToast(res.message || 'Student removed from roster.', 'info', 'Removed from Roster');
    await loadAdminRoster();
  } catch (err) {
    showToast(err.message, 'error', 'Delete Failed');
  }
}

function openEditRosterModal(id) {
  const student = allRosterCache.find(s => (s.id === id || s._id === id));
  if (!student) {
    showToast('Student record not found in roster cache.', 'warning', 'Roster');
    return;
  }

  document.getElementById('edit-roster-id').value = id;
  document.getElementById('edit-roster-regno').value = student.registerNumber || '';
  document.getElementById('edit-roster-name').value = student.name || '';
  document.getElementById('edit-roster-dept').value = student.department || 'Computer Science';
  document.getElementById('edit-roster-year').value = student.year || 'I Year';
  document.getElementById('edit-roster-section').value = student.section || 'A';
  document.getElementById('edit-roster-gender').value = student.gender || 'Male';
  const statusEl = document.getElementById('edit-roster-status');
  if (statusEl) {
    statusEl.value = (student.status && student.status.toUpperCase() === 'INACTIVE') ? 'Inactive' : 'Active';
  }

  const modalEl = document.getElementById('editRosterStudentModal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

async function submitEditRosterStudent(event) {
  event.preventDefault();
  const id = document.getElementById('edit-roster-id').value;
  const btn = document.getElementById('btn-save-edit-roster');

  const payload = {
    registerNumber: document.getElementById('edit-roster-regno').value.trim().toUpperCase(),
    name: document.getElementById('edit-roster-name').value.trim(),
    department: document.getElementById('edit-roster-dept').value,
    year: document.getElementById('edit-roster-year').value,
    section: document.getElementById('edit-roster-section').value.trim().toUpperCase() || 'A',
    gender: document.getElementById('edit-roster-gender').value,
    status: document.getElementById('edit-roster-status')?.value || 'Active'
  };

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
    }

    const res = await apiRequest(`/roster/${id}`, 'PUT', payload);
    showToast(res.message || 'Student updated successfully!', 'success', 'Roster Updated');

    const modalEl = document.getElementById('editRosterStudentModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    await loadAdminRoster();
  } catch (err) {
    showToast(err.message || 'Failed to update student.', 'error', 'Update Failed');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Save Changes';
    }
  }
}

async function downloadRosterTemplate() {
  const token = localStorage.getItem('gasc_token');
  try {
    showToast('Generating official Excel roster template...', 'info', 'Download');
    const templateUrl = (window.GASC_CONFIG && window.GASC_CONFIG.getApiUrl)
      ? window.GASC_CONFIG.getApiUrl('/roster/template')
      : '/api/roster/template';
    const response = await fetch(templateUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download template.');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'gasc_idappadi_students_roster_template.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);

    showToast('Template downloaded! Fill in student rows and upload anytime.', 'success', 'Downloaded');
  } catch (err) {
    console.error('Download error:', err);
    showToast('Failed to download Excel template: ' + err.message, 'error', 'Download Error');
  }
}

// ============================================================
// MODULE 17: EXTERNAL SPORTS COMPETITIONS (Admin)
// ============================================================

const EC_DEADLINE_COLORS = {
  'Registration Open':         { badge: 'bg-success',        icon: '🟢' },
  'Registration Closing Soon': { badge: 'bg-warning text-dark', icon: '🟠' },
  'Registration Closed':       { badge: 'bg-danger',         icon: '🔴' },
  'Completed':                 { badge: 'bg-secondary',      icon: '⚫' }
};

function getDeadlineStatusBadge(ds) {
  const info = EC_DEADLINE_COLORS[ds] || { badge: 'bg-info', icon: '🔵' };
  return `<span class="badge ${info.badge}">${info.icon} ${ds || 'Unknown'}</span>`;
}

async function loadAdminExternalCompetitions() {
  const tbody = document.getElementById('ec-admin-table');
  if (!tbody) return;

  const search = (document.getElementById('ec-search')?.value || '').trim();
  const level  = document.getElementById('ec-filter-level')?.value || 'All';
  const status = document.getElementById('ec-filter-status')?.value || 'All';

  let url = '/external-competitions?';
  if (search)          url += `search=${encodeURIComponent(search)}&`;
  if (level  !== 'All') url += `level=${encodeURIComponent(level)}&`;
  if (status !== 'All') url += `status=${encodeURIComponent(status)}&`;

  tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading competitions...</td></tr>';

  try {
    const res   = await apiRequest(url);
    const comps = res.competitions || [];

    const el = id => document.getElementById(id);
    if (el('ec-stat-total'))     el('ec-stat-total').textContent     = comps.length;
    if (el('ec-stat-open'))      el('ec-stat-open').textContent      = comps.filter(c => c.deadlineStatus === 'Registration Open').length;
    if (el('ec-stat-closing'))   el('ec-stat-closing').textContent   = comps.filter(c => c.deadlineStatus === 'Registration Closing Soon').length;
    if (el('ec-stat-completed')) el('ec-stat-completed').textContent = comps.filter(c => c.status === 'Completed').length;

    if (!comps.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">
        <i class="bi bi-globe2 fs-2 d-block mb-2 text-primary opacity-50"></i>
        No external competitions found.<br><small>Click "Add Competition" to create the first one.</small>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = comps.map((c, i) => {
      const deadline    = c.registrationDeadline ? new Date(c.registrationDeadline).toLocaleDateString('en-IN') : '—';
      const isPublished = ['Published','Registration Open'].includes(c.status);
      const statusCls   = isPublished ? 'bg-success' : c.status === 'Draft' ? 'bg-secondary' : c.status === 'Registration Closed' ? 'bg-danger' : 'bg-warning text-dark';
      return `<tr>
        <td class="text-muted small">${i + 1}</td>
        <td>
          <div class="fw-semibold text-dark">${c.title}</div>
          <small class="text-muted">${c.organizer || '—'}${c.venue ? ' · ' + c.venue : ''}</small>
        </td>
        <td>
          <span class="badge bg-primary bg-opacity-10 text-primary me-1">${c.sport || 'General'}</span>
          <small class="text-secondary d-block mt-1">${c.level || '—'}</small>
        </td>
        <td>
          <small class="fw-semibold d-block">${deadline}</small>
          ${getDeadlineStatusBadge(c.deadlineStatus)}
        </td>
        <td><span class="badge ${statusCls}">${c.status}</span></td>
        <td class="text-center">${c.featured ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-star text-muted"></i>'}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" onclick="toggleECPublish('${c.id || c._id}')" title="${isPublished ? 'Unpublish' : 'Publish'}">
              <i class="bi bi-${isPublished ? 'eye-slash' : 'eye'}"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="deleteExternalComp('${c.id || c._id}','${c.title.replace(/'/g,"\\'")}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>${err.message}</td></tr>`;
  }
}

async function submitAddExternalComp(event) {
  event.preventDefault();
  const btn = document.getElementById('ec-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...'; }

  const payload = {
    title:                (document.getElementById('ec-title')?.value || '').trim(),
    sport:                (document.getElementById('ec-sport')?.value || 'General').trim(),
    level:                document.getElementById('ec-level')?.value || 'Inter-College',
    type:                 document.getElementById('ec-type')?.value || 'Individual',
    gender:               document.getElementById('ec-gender')?.value || 'All',
    organizer:            (document.getElementById('ec-organizer')?.value || '').trim(),
    venue:                (document.getElementById('ec-venue')?.value || '').trim(),
    startDate:            document.getElementById('ec-start-date')?.value || null,
    endDate:              document.getElementById('ec-end-date')?.value || null,
    registrationDeadline: document.getElementById('ec-reg-deadline')?.value,
    eligibility:          (document.getElementById('ec-eligibility')?.value || '').trim(),
    description:          (document.getElementById('ec-description')?.value || '').trim(),
    announcementSummary:  (document.getElementById('ec-summary')?.value || '').trim(),
    sourceName:           (document.getElementById('ec-source-name')?.value || '').trim(),
    sourceUrl:            (document.getElementById('ec-source-url')?.value || '').trim(),
    registrationUrl:      (document.getElementById('ec-reg-url')?.value || '').trim(),
    image:                (document.getElementById('ec-image')?.value || '').trim(),
    status:               document.getElementById('ec-status')?.value || 'Draft',
    featured:             document.getElementById('ec-featured')?.checked || false
  };

  try {
    const res = await apiRequest('/external-competitions', 'POST', payload);
    showToast(res.message || 'Competition added successfully!', 'success', '🌐 Competition Created');
    const modalEl = document.getElementById('addExternalCompModal');
    if (modalEl) { const m = bootstrap.Modal.getInstance(modalEl); if (m) m.hide(); }
    event.target.reset();
    await loadAdminExternalCompetitions();
  } catch (err) {
    showToast(err.message, 'error', 'Failed to Save');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-save me-1"></i> Save Competition'; }
  }
}

async function toggleECPublish(id) {
  try {
    const res = await apiRequest(`/external-competitions/${id}/publish`, 'PATCH', {});
    showToast(res.message, 'success', 'Status Updated');
    await loadAdminExternalCompetitions();
  } catch (err) {
    showToast(err.message, 'error', 'Update Failed');
  }
}

async function deleteExternalComp(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    const res = await apiRequest(`/external-competitions/${id}`, 'DELETE');
    showToast(res.message, 'info', '🗑️ Deleted');
    await loadAdminExternalCompetitions();
  } catch (err) {
    showToast(err.message, 'error', 'Delete Failed');
  }
}

// ============================================================
// MODULE 18: SPORTS NEWS & ANNOUNCEMENTS (Admin)
// ============================================================

async function loadAdminSportsNews() {
  const tbody = document.getElementById('sn-admin-table');
  if (!tbody) return;

  const search   = (document.getElementById('sn-search')?.value || '').trim();
  const category = document.getElementById('sn-filter-category')?.value || 'All';
  const status   = document.getElementById('sn-filter-status')?.value || 'All';

  let url = '/sports-news?';
  if (search)            url += `search=${encodeURIComponent(search)}&`;
  if (category !== 'All') url += `category=${encodeURIComponent(category)}&`;
  if (status   !== 'All') url += `status=${encodeURIComponent(status)}&`;

  tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading news...</td></tr>';

  try {
    const res  = await apiRequest(url);
    const news = res.news || [];

    const el = id => document.getElementById(id);
    if (el('sn-stat-total'))     el('sn-stat-total').textContent     = news.length;
    if (el('sn-stat-published')) el('sn-stat-published').textContent = news.filter(n => n.status === 'Published').length;
    if (el('sn-stat-featured'))  el('sn-stat-featured').textContent  = news.filter(n => n.featured).length;
    if (el('sn-stat-draft'))     el('sn-stat-draft').textContent     = news.filter(n => n.status === 'Draft').length;

    if (!news.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">
        <i class="bi bi-newspaper fs-2 d-block mb-2 text-primary opacity-50"></i>
        No sports news found.<br><small>Click "Add News" to create the first announcement.</small>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = news.map((n, i) => {
      const pubDate    = n.publishedDate ? new Date(n.publishedDate).toLocaleDateString('en-IN') : '—';
      const statusCls  = n.status === 'Published' ? 'bg-success' : n.status === 'Archived' ? 'bg-secondary' : 'bg-warning text-dark';
      return `<tr>
        <td class="text-muted small">${i + 1}</td>
        <td>
          <div class="fw-semibold text-dark" style="max-width:280px;">${n.title}</div>
          <small class="text-muted text-truncate d-block" style="max-width:280px;">${n.shortSummary || ''}</small>
        </td>
        <td>
          <span class="badge bg-info bg-opacity-15 text-info border border-info border-opacity-25 small">${n.category || 'General'}</span>
          <small class="text-muted d-block mt-1">${n.sport || 'General'}</small>
        </td>
        <td><small class="fw-semibold">${pubDate}</small></td>
        <td><span class="badge ${statusCls}">${n.status}</span></td>
        <td class="text-center">${n.featured ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-star text-muted"></i>'}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" onclick="toggleSNPublish('${n.id || n._id}')" title="${n.status === 'Published' ? 'Unpublish' : 'Publish'}">
              <i class="bi bi-${n.status === 'Published' ? 'eye-slash' : 'eye'}"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="deleteSportsNews('${n.id || n._id}','${n.title.replace(/'/g,"\\'")}')">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>${err.message}</td></tr>`;
  }
}

async function submitAddSportsNews(event) {
  event.preventDefault();
  const btn = document.getElementById('sn-submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...'; }

  const today = new Date().toISOString().split('T')[0];
  const payload = {
    title:           (document.getElementById('sn-title')?.value || '').trim(),
    shortSummary:    (document.getElementById('sn-summary')?.value || '').trim(),
    fullDescription: (document.getElementById('sn-description')?.value || '').trim(),
    sport:           (document.getElementById('sn-sport')?.value || 'General').trim(),
    category:        document.getElementById('sn-category')?.value || 'General Sports News',
    sourceName:      (document.getElementById('sn-source-name')?.value || '').trim(),
    sourceUrl:       (document.getElementById('sn-source-url')?.value || '').trim(),
    publishedDate:   document.getElementById('sn-published-date')?.value || today,
    image:           (document.getElementById('sn-image')?.value || '').trim(),
    status:          document.getElementById('sn-status')?.value || 'Draft',
    featured:        document.getElementById('sn-featured')?.checked || false
  };

  try {
    const res = await apiRequest('/sports-news', 'POST', payload);
    showToast(res.message || 'News published!', 'success', '📰 News Created');
    const modalEl = document.getElementById('addSportsNewsModal');
    if (modalEl) { const m = bootstrap.Modal.getInstance(modalEl); if (m) m.hide(); }
    event.target.reset();
    await loadAdminSportsNews();
  } catch (err) {
    showToast(err.message, 'error', 'Failed to Save');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-save me-1"></i> Save News'; }
  }
}

async function toggleSNPublish(id) {
  try {
    const res = await apiRequest(`/sports-news/${id}/publish`, 'PATCH', {});
    showToast(res.message, 'success', 'Status Updated');
    await loadAdminSportsNews();
  } catch (err) {
    showToast(err.message, 'error', 'Update Failed');
  }
}

async function deleteSportsNews(id, title) {
  if (!confirm(`Delete news "${title}"? This cannot be undone.`)) return;
  try {
    const res = await apiRequest(`/sports-news/${id}`, 'DELETE');
    showToast(res.message, 'info', '🗑️ Deleted');
    await loadAdminSportsNews();
  } catch (err) {
    showToast(err.message, 'error', 'Delete Failed');
  }
}

// Global window mappings for Roster actions
window.openEditRosterModal = openEditRosterModal;
window.deleteRosterStudent = deleteRosterStudent;
window.submitEditRosterStudent = submitEditRosterStudent;
window.loadAdminRoster = loadAdminRoster;

