/**
 * Student / Player Portal Management Script
 */

let currentStudentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check Authentication
  currentStudentUser = getCurrentUser();
  const token = localStorage.getItem('gasc_token');

  if (!token || !currentStudentUser || currentStudentUser.role !== 'student') {
    showToast('Please log in as a student to access the player portal.', 'warning', 'Access Restricted');
    setTimeout(() => {
      const loginUrl = (window.location.protocol === 'file:' || (window.GASC_CONFIG && window.GASC_CONFIG.IS_PACKAGED_APP && !window.location.protocol.startsWith('http')))
        ? 'student-login.html'
        : '/student/login';
      window.location.href = loginUrl;
    }, 500);
    return;
  }

  // Set Topbar Info
  const nameEl = document.getElementById('student-display-name');
  const regEl = document.getElementById('student-display-regno');
  const avatarEl = document.getElementById('student-display-avatar');

  if (nameEl) nameEl.innerText = currentStudentUser.name;
  if (regEl) regEl.innerText = `${currentStudentUser.registerNumber} (${currentStudentUser.department})`;
  if (avatarEl && currentStudentUser.profilePhoto) avatarEl.src = currentStudentUser.profilePhoto;

  // Initialize navigation
  initStudentTabs();

  // Load Initial View from path (or default to dashboard)
  const path = window.location.pathname.replace(/^\/student\/?/, '') || 'dashboard';
  const validViews = ['dashboard', 'profile', 'sports', 'competitions', 'applications', 'team', 'equipment', 'achievements', 'notifications', 'external-competitions', 'news'];
  const initialView = validViews.includes(path) ? path : 'dashboard';
  switchStudentView(initialView, false);
});

// Browser Back/Forward navigation listener
window.addEventListener('popstate', (e) => {
  const path = window.location.pathname.replace(/^\/student\/?/, '') || 'dashboard';
  const validViews = ['dashboard', 'profile', 'sports', 'competitions', 'applications', 'team', 'equipment', 'achievements', 'notifications', 'external-competitions', 'news'];
  const viewId = (e.state && e.state.viewId) || (validViews.includes(path) ? path : 'dashboard');
  switchStudentView(viewId, false);
});

// Tab Switcher
function initStudentTabs() {
  const navItems = document.querySelectorAll('.student-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      switchStudentView(targetView);
    });
  });
}

function switchStudentView(viewId, updateHistory = true) {
  // Update sidebar active class
  document.querySelectorAll('.student-nav-item').forEach(el => el.classList.remove('active'));
  const activeBtn = document.querySelector(`.student-nav-item[data-view="${viewId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Update mobile bottom nav active class
  document.querySelectorAll('.mob-nav-item').forEach(el => el.classList.remove('active'));
  const activeMobBtn = document.querySelector(`.mob-nav-item[data-view="${viewId}"]`);
  if (activeMobBtn) activeMobBtn.classList.add('active');

  // Update mobile drawer active class
  document.querySelectorAll('.mob-drawer-item').forEach(el => el.classList.remove('active'));
  const activeDrawerBtn = document.querySelector(`.mob-drawer-item[data-view="${viewId}"]`);
  if (activeDrawerBtn) activeDrawerBtn.classList.add('active');

  // Hide all views, show target view
  document.querySelectorAll('.student-view-section').forEach(sec => sec.classList.add('d-none'));
  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) targetSec.classList.remove('d-none');

  // Close mobile sidebar if open
  const sidebar = document.querySelector('.portal-sidebar');
  if (sidebar && sidebar.classList.contains('show')) {
    sidebar.classList.remove('show');
  }

  // Update browser URL on website without page refresh (deep linking support)
  if (updateHistory && window.location.protocol.startsWith('http') && window.history && window.history.pushState) {
    const newPath = viewId === 'dashboard' ? '/student/dashboard' : `/student/${viewId}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({ viewId }, '', newPath);
    }
  }

  // Trigger data loader for view
  if (viewId === 'dashboard') loadStudentDashboard();
  else if (viewId === 'profile') loadStudentProfile();
  else if (viewId === 'sports') loadStudentSports();
  else if (viewId === 'competitions') loadStudentCompetitions();
  else if (viewId === 'applications') loadStudentApplications();
  else if (viewId === 'team') loadStudentTeam();
  else if (viewId === 'equipment') loadStudentEquipment();
  else if (viewId === 'achievements') loadStudentAchievements();
  else if (viewId === 'notifications') loadStudentNotifications();
  else if (viewId === 'external-competitions') loadStudentExternalCompetitions();
  else if (viewId === 'news') loadStudentSportsNews();
}

// 1. Dashboard
async function loadStudentDashboard() {
  try {
    const res = await apiRequest('/analytics/student-dashboard');
    const { stats, upcomingCompetitions, myRecentApplications } = res;

    const elSport = document.getElementById('stat-primary-sport');
    if (elSport) elSport.innerText = stats.primarySport || 'Sports';

    const elPos = document.getElementById('stat-position');
    if (elPos) elPos.innerText = stats.position || 'Student Athlete';

    const elTeam = document.getElementById('stat-primary-team');
    if (elTeam) elTeam.innerText = stats.primaryTeam || 'GASC Team';

    const elGear = document.getElementById('stat-issued-gear');
    if (elGear) elGear.innerText = stats.issuedEquipmentCount || 0;

    const elAch = document.getElementById('stat-achievements-count');
    if (elAch) elAch.innerText = stats.achievementsCount || 0;

    // Overdue alert banner
    const alertBox = document.getElementById('student-overdue-alert');
    if (alertBox) {
      if (stats.overdueCount > 0) {
        alertBox.classList.remove('d-none');
        alertBox.innerHTML = `
          <div class="alert alert-danger glass-card d-flex align-items-center mb-4">
            <i class="bi bi-exclamation-octagon-fill fs-2 me-3 text-danger"></i>
            <div>
              <strong>⚠️ Overdue Equipment Alert:</strong> You have ${stats.overdueCount} item(s) past expected return date. Please return them to Sports Incharge immediately.
            </div>
          </div>
        `;
      } else {
        alertBox.classList.add('d-none');
      }
    }

    // Recent Applications Preview
    const appsPreview = document.getElementById('student-recent-apps-preview');
    if (appsPreview) {
      try {
        const appRes = await apiRequest('/competitions/my-applications');
        const apps = appRes.registrations || [];
        if (apps.length === 0) {
          appsPreview.innerHTML = `<div class="p-3 text-center text-muted small">You haven't submitted any competition applications yet.</div>`;
        } else {
          appsPreview.innerHTML = apps.slice(0, 3).map(a => {
            let badgeClass = 'badge-glass-warning';
            if (a.status === 'Approved') badgeClass = 'badge-glass-success';
            if (a.status === 'Rejected') badgeClass = 'badge-glass-danger';
            return `
              <div class="glass-card p-3 mb-2 d-flex align-items-center justify-content-between">
                <div>
                  <h6 class="fw-bold mb-1">${a.competitionId ? a.competitionId.name : 'Competition'}</h6>
                  <div class="small text-secondary">
                    <span class="badge badge-glass-primary me-1">${a.competitionId ? a.competitionId.sportName : 'Sports'}</span>
                    Applied: ${formatDate(a.registrationDate)}
                  </div>
                </div>
                <span class="${badgeClass}">${a.status}</span>
              </div>
            `;
          }).join('');
        }
      } catch (e) {
        appsPreview.innerHTML = `<div class="p-3 text-center text-muted small">No recent applications found.</div>`;
      }
    }

    // Open Competitions
    const compList = document.getElementById('student-open-comp-list');
    if (compList) {
      if (!upcomingCompetitions || upcomingCompetitions.length === 0) {
        compList.innerHTML = `<div class="p-3 text-center text-muted small">No new tournaments accepting registration.</div>`;
      } else {
        compList.innerHTML = upcomingCompetitions.map(c => `
          <div class="glass-card p-3 mb-2 d-flex align-items-center justify-content-between">
            <div>
              <span class="badge badge-glass-success mb-1">${c.sportName}</span>
              <h6 class="fw-bold mb-1">${c.name}</h6>
              <div class="small text-secondary">
                <i class="bi bi-geo-alt me-1"></i> ${c.venue} &bull; Deadline: <strong class="text-danger">${formatDate(c.registrationEnd)}</strong>
              </div>
            </div>
            <button class="btn btn-sm btn-sports-primary" onclick="openRegisterModal('${c._id}', '${c.name.replace(/'/g, "\\'")}')">
              Register <i class="bi bi-arrow-right"></i>
            </button>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading student dashboard:', err);
  }
}

// 2. Profile
async function loadStudentProfile() {
  try {
    const res = await apiRequest('/auth/me');
    const { user, profile } = res;

    document.getElementById('prof-name').value = user.name || '';
    document.getElementById('prof-regno').value = user.registerNumber || '';
    document.getElementById('prof-email').value = user.email || '';
    document.getElementById('prof-dept').value = user.department || '';
    document.getElementById('prof-year').value = user.year || '';
    document.getElementById('prof-section').value = user.section || '';
    document.getElementById('prof-gender').value = user.gender || 'Male';
    document.getElementById('prof-mobile').value = user.mobile || '';

    if (profile) {
      document.getElementById('prof-position').value = profile.position || 'All Rounder';
      document.getElementById('prof-jersey').value = profile.jerseyNumber || 7;
      document.getElementById('prof-exp').value = profile.experience || '1 Year';
      document.getElementById('prof-bio').value = profile.bio || '';
    }
  } catch (err) {
    showToast('Failed to load profile data', 'error');
  }
}

async function saveStudentProfile(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button[type="submit"]');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';

    const res = await apiRequest('/auth/profile', 'PUT', formData, true);
    showToast('Profile updated successfully!', 'success');
    setCurrentUser(res.user);

    document.getElementById('student-display-name').innerText = res.user.name;
    if (res.user.profilePhoto) {
      document.getElementById('student-display-avatar').src = res.user.profilePhoto;
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-save me-1"></i> Save Changes';
  }
}

// 3. Sports
async function loadStudentSports() {
  const container = document.getElementById('student-sports-list');
  try {
    const res = await apiRequest('/sports');
    container.innerHTML = res.sports.map(s => `
      <div class="col-md-6 col-lg-4">
        <div class="glass-card h-100 p-3">
          <div class="d-flex align-items-center gap-3 mb-2">
            <div class="stat-icon bg-white text-primary">
              <i class="bi ${s.icon || 'bi-trophy'} text-success"></i>
            </div>
            <div>
              <h5 class="fw-bold mb-0">${s.name}</h5>
              <span class="badge badge-glass-primary">${s.category} &bull; ${s.indoorOutdoor}</span>
            </div>
          </div>
          <p class="text-secondary small mb-2">${s.description}</p>
          <div class="small text-muted border-top pt-2 mt-auto">
            <strong>Coach / Incharge:</strong> ${s.coach || 'Sports Incharge'}<br>
            <strong>Players:</strong> ${s.playerCount} Per Side
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger">Failed to load sports.</div>`;
  }
}

// 4. Competitions & Registration
let currentRegisterCompId = null;

async function loadStudentCompetitions() {
  const container = document.getElementById('student-all-competitions-list');
  try {
    const res = await apiRequest('/competitions');
    if (!res.competitions || res.competitions.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="bi bi-trophy empty-state-icon"></i><h5>No competitions scheduled.</h5></div>`;
      return;
    }

    container.innerHTML = res.competitions.map(c => `
      <div class="glass-card mb-3 p-4">
        <div class="row align-items-center">
          <div class="col-md-8">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge badge-glass-primary">${c.sportName}</span>
              <span class="badge badge-glass-success">${c.type}</span>
              <span class="badge bg-secondary">${c.level}</span>
            </div>
            <h5 class="fw-bold mb-1">${c.name}</h5>
            <div class="small text-secondary mb-2">
              <i class="bi bi-geo-alt-fill text-danger me-1"></i> ${c.venue} &bull; 
              <i class="bi bi-calendar3 text-primary me-1"></i> ${formatDate(c.date)} &bull; 
              <i class="bi bi-clock text-warning me-1"></i> ${c.startTime} - ${c.endTime}
            </div>
            <div class="small text-muted">${c.description || 'Open for college students.'}</div>
          </div>
          <div class="col-md-4 text-md-end mt-3 mt-md-0">
            <div class="small mb-2">Deadline: <strong class="text-danger">${formatDate(c.registrationEnd)}</strong></div>
            <button class="btn btn-sports-accent" onclick="openRegisterModal('${c._id}', '${c.name.replace(/'/g, "\\'")}')">
              <i class="bi bi-pencil-square me-1"></i> Register Now
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-center text-danger py-4">Failed to load competitions.</div>`;
  }
}

function openRegisterModal(id, title) {
  currentRegisterCompId = id;
  document.getElementById('modal-comp-title').innerText = title;
  document.getElementById('comp-position').value = '';
  document.getElementById('comp-remarks').value = '';
  const modal = new bootstrap.Modal(document.getElementById('competitionRegisterModal'));
  modal.show();
}

async function submitCompetitionRegistration() {
  if (!currentRegisterCompId) return;
  const position = document.getElementById('comp-position').value;
  const remarks = document.getElementById('comp-remarks').value;
  const btn = document.getElementById('btn-submit-registration');

  try {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Submitting...';

    const res = await apiRequest(`/competitions/${currentRegisterCompId}/register`, 'POST', {
      preferredPosition: position,
      remarks
    });

    showToast(res.message, 'success', 'Registration Submitted');
    bootstrap.Modal.getInstance(document.getElementById('competitionRegisterModal')).hide();
    switchStudentView('applications');
  } catch (err) {
    showToast(err.message, 'error', 'Registration Error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Confirm Registration';
  }
}

// 5. My Applications
async function loadStudentApplications() {
  const container = document.getElementById('student-applications-table');
  try {
    const res = await apiRequest('/competitions/my-applications');
    if (!res.registrations || res.registrations.length === 0) {
      container.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">You haven't submitted any competition applications yet.</td></tr>`;
      return;
    }

    container.innerHTML = res.registrations.map((reg, idx) => {
      let badgeClass = 'badge-glass-warning';
      if (reg.status === 'Approved') badgeClass = 'badge-glass-success';
      if (reg.status === 'Rejected') badgeClass = 'badge-glass-danger';

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${reg.competitionId ? reg.competitionId.name : 'Tournament'}</strong>
            <div class="small text-muted">${reg.competitionId ? reg.competitionId.sportName : ''}</div>
          </td>
          <td>${formatDate(reg.registrationDate)}</td>
          <td>${reg.preferredPosition || 'General'}</td>
          <td><span class="${badgeClass}">${reg.status}</span></td>
          <td class="small text-secondary">${reg.adminRemarks || 'Under review by Sports Incharge'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load applications.</td></tr>`;
  }
}

// 6. My Team
async function loadStudentTeam() {
  const container = document.getElementById('student-team-container');
  try {
    const res = await apiRequest('/teams/my-teams');
    if (!res.teams || res.teams.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="bi bi-shield-shaded empty-state-icon"></i><h5>No teams found for your department or sport.</h5><p class="text-muted">Teams formed by Sports Incharge will be listed here with captain contact details.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="row g-4">
        ${res.teams.map(t => `
          <div class="col-md-6 col-lg-4">
            <div class="glass-card h-100 p-4 d-flex flex-column justify-content-between">
              <div>
                <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <span class="badge badge-glass-primary fs-6">${t.sportName}</span>
                  <span class="badge badge-glass-success">${t.status || 'Active'}</span>
                </div>
                <h5 class="fw-bold text-dark mb-3">${t.name}</h5>
                
                <div class="bg-light bg-opacity-75 p-3 rounded-3 mb-3">
                  <div class="small text-muted mb-1">TEAM CAPTAIN</div>
                  <div class="fw-bold fs-6 text-primary"><i class="bi bi-person-badge-fill me-1"></i> ${t.captainName}</div>
                </div>

                <div class="small text-secondary mb-2">
                  <div class="mb-1"><i class="bi bi-building me-2 text-primary"></i><strong>Department:</strong> ${t.department}</div>
                  <div class="mb-1"><i class="bi bi-mortarboard me-2 text-warning"></i><strong>Year:</strong> ${t.year}</div>
                  <div class="mb-1">
                    <i class="bi bi-telephone-fill me-2 text-success"></i><strong>Phone:</strong> 
                    ${t.phone ? `<a href="tel:${t.phone}" class="text-decoration-none text-success fw-bold">${t.phone}</a>` : '<span class="text-muted">Not provided</span>'}
                  </div>
                </div>
              </div>

              <div class="border-top pt-2 mt-3 small text-muted d-flex justify-content-between">
                <span>Formed: ${formatDate(t.createdAt)}</span>
                <span class="text-success"><i class="bi bi-shield-check"></i> Official Squad</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="text-center text-danger py-4">Failed to load team data.</div>`;
  }
}

// 7. Equipment (Sections 11, 12, 13, 22, 24)
let studentEquipmentCache = { activeIssued: [], history: [], stats: {} };

async function loadStudentEquipment() {
  const cardsContainer = document.getElementById('student-active-equipment-cards');
  const historyTable = document.getElementById('student-history-equipment-table');

  try {
    const res = await apiRequest('/equipment/my-equipment');
    studentEquipmentCache = res || { activeIssued: [], history: [], stats: {} };
    const { activeIssued = [], history = [], stats = {} } = studentEquipmentCache;

    // Section 12: Update Dashboard Stats Cards
    const elActive = document.getElementById('student-stat-currently-issued');
    const elRet = document.getElementById('student-stat-returned');
    const elOverdue = document.getElementById('student-stat-overdue');
    const elOverdueSub = document.getElementById('student-stat-overdue-sub');
    const elBadge = document.getElementById('student-active-count-badge');

    if (elActive) elActive.innerText = stats.currentlyIssued || activeIssued.length;
    if (elRet) elRet.innerText = stats.returned || history.length;
    if (elOverdue) elOverdue.innerText = stats.overdue || 0;
    if (elOverdueSub) elOverdueSub.innerText = (stats.overdue || 0) > 0 ? `${stats.overdue} item(s) overdue!` : 'All items on schedule';
    if (elBadge) elBadge.innerText = `${activeIssued.length} Item(s)`;

    // Section 22: Student Overdue Return Reminder Banner
    const overdueBanner = document.getElementById('student-eq-overdue-banner');
    const overdueMsg = document.getElementById('student-eq-overdue-msg');
    const overdueItems = activeIssued.filter(t => t.isOverdue);
    if (overdueBanner && overdueMsg) {
      if (overdueItems.length > 0) {
        overdueBanner.classList.remove('d-none');
        const eqNames = overdueItems.map(o => o.equipmentName).join(', ');
        overdueMsg.innerText = `Your return date for ${eqNames} has passed. Please return the equipment to the Sports Office / Sports Mam immediately.`;
      } else {
        overdueBanner.classList.add('d-none');
      }
    }

    // Section 11: Render Currently Issued Cards
    if (cardsContainer) {
      if (activeIssued.length === 0) {
        cardsContainer.innerHTML = `
          <div class="col-12">
            <div class="glass-card p-5 text-center text-muted">
              <i class="bi bi-box-seam display-4 d-block mb-3 text-primary opacity-50"></i>
              <h5 class="fw-bold text-dark mb-1">No Sports Gear Currently Issued</h5>
              <p class="small text-secondary mb-0">When sports equipment is issued to you by the Sports Incharge, it will appear here automatically.</p>
            </div>
          </div>
        `;
      } else {
        cardsContainer.innerHTML = activeIssued.map(t => {
          const emojiBadge = window.getEquipmentEmojiBadge ? window.getEquipmentEmojiBadge(t.equipmentName, t.category, t.sportName, 52, 28) : '📦';
          return `
            <div class="col-md-6 col-lg-4">
              <div class="glass-card p-3 h-100 border ${t.isOverdue ? 'border-danger border-opacity-50' : 'border-primary border-opacity-20'} shadow-sm position-relative">
                ${t.isOverdue ? `
                  <div class="position-absolute top-0 end-0 m-2">
                    <span class="badge bg-danger pulse-low-stock">⚠️ OVERDUE (${t.daysOverdue}d)</span>
                  </div>
                ` : ''}
                <div class="d-flex align-items-center gap-3 mb-3">
                  ${emojiBadge}
                  <div>
                    <h5 class="fw-bold text-dark mb-0">${t.equipmentName}</h5>
                    <small class="text-secondary">Quantity: <strong class="text-dark">${t.quantity} unit(s)</strong></small>
                  </div>
                </div>

                <div class="p-2.5 rounded-3 bg-dark bg-opacity-10 border border-secondary border-opacity-20 small mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Issued:</span>
                    <span class="fw-semibold text-dark">${formatDate(t.issueDate)} &bull; ${t.issueTime || 'IST'}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Expected Return:</span>
                    <span class="fw-bold ${t.isOverdue ? 'text-danger' : 'text-primary'}">${formatDate(t.expectedReturnDate)}</span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <span class="text-muted">Issued By:</span>
                    <span class="text-dark">${t.issuedBy || 'Sports Incharge'}</span>
                  </div>
                </div>

                <div class="d-flex align-items-center justify-content-between pt-1">
                  <span class="badge ${t.isOverdue ? 'badge-glass-danger' : 'badge-glass-primary'}">
                    &bull; ${t.isOverdue ? 'OVERDUE' : t.status}
                  </span>
                  <button class="btn btn-sm btn-outline-primary" onclick="openStudentEquipmentModal('${t.id || t._id}')">
                    <i class="bi bi-eye me-1"></i> View Details
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Section 24: Previous History Table
    if (historyTable) {
      if (history.length === 0) {
        historyTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No previous return history found.</td></tr>`;
      } else {
        historyTable.innerHTML = history.map((t, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                ${window.getEquipmentEmojiBadge ? window.getEquipmentEmojiBadge(t.equipmentName, t.category, t.sportName, 28, 15) : '📦'}
                <strong>${t.equipmentName}</strong>
              </div>
            </td>
            <td>${t.quantity}</td>
            <td>${formatDate(t.issueDate)} <small class="text-muted">${t.issueTime || ''}</small></td>
            <td>${formatDate(t.returnDate)} <small class="text-muted">${t.returnTime || ''}</small></td>
            <td><span class="badge badge-glass-success">${t.returnCondition || 'Good'}</span></td>
            <td><span class="badge badge-glass-success">✓ RETURNED</span></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    if (cardsContainer) cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Failed to load equipment.</div></div>`;
  }
}

// Section 13: Student View Equipment Modal
function openStudentEquipmentModal(txId) {
  const all = [...(studentEquipmentCache.activeIssued || []), ...(studentEquipmentCache.history || [])];
  const tx = all.find(t => (t.id || t._id) === txId);
  if (!tx) return;

  const badgeEl = document.getElementById('stud-modal-eq-badge');
  const imgEl = document.getElementById('stud-modal-eq-img');
  const nameEl = document.getElementById('stud-modal-eq-name');
  const statusEl = document.getElementById('stud-modal-eq-status');
  const qtyEl = document.getElementById('stud-modal-eq-qty');
  const issueDateEl = document.getElementById('stud-modal-eq-issue-date');
  const issueTimeEl = document.getElementById('stud-modal-eq-issue-time');
  const expDateEl = document.getElementById('stud-modal-eq-expected-date');
  const retDateEl = document.getElementById('stud-modal-eq-return-date');
  const retTimeEl = document.getElementById('stud-modal-eq-return-time');
  const issuedByEl = document.getElementById('stud-modal-eq-issued-by');
  const remarksEl = document.getElementById('stud-modal-eq-remarks');

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
  if (issueDateEl) issueDateEl.innerText = formatDate(tx.issueDate);
  if (issueTimeEl) issueTimeEl.innerText = tx.issueTime || 'IST';
  if (expDateEl) expDateEl.innerText = formatDate(tx.expectedReturnDate);
  if (retDateEl) retDateEl.innerText = tx.returnDate ? formatDate(tx.returnDate) : 'Not Returned Yet';
  if (retTimeEl) retTimeEl.innerText = tx.returnTime || '-';
  if (issuedByEl) issuedByEl.innerText = tx.issuedBy || 'Sports Incharge';
  if (remarksEl) remarksEl.innerText = tx.remarks || tx.purpose || 'College Practice';

  const modal = new bootstrap.Modal(document.getElementById('studentViewEquipmentModal'));
  modal.show();
}

// 10. Achievements
async function loadStudentAchievements() {
  const container = document.getElementById('student-achievements-list');
  try {
    const res = await apiRequest('/achievements/my-achievements');
    if (!res.achievements || res.achievements.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="bi bi-award empty-state-icon"></i><h5>No achievements awarded yet.</h5><p class="text-muted">Participate in collegiate competitions to win medals and honours!</p></div>`;
      return;
    }

    container.innerHTML = res.achievements.map(a => {
      let medalBadge = 'badge-gold';
      let medalIcon = '🥇';
      if (a.medal === 'Silver') { medalBadge = 'badge-silver'; medalIcon = '🥈'; }
      if (a.medal === 'Bronze') { medalBadge = 'badge-bronze'; medalIcon = '🥉'; }

      return `
        <div class="col-md-6 mb-3">
          <div class="glass-card p-4 h-100">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="${medalBadge}">${medalIcon} ${a.medal} Medal</span>
              <span class="text-muted small">${a.year}</span>
            </div>
            <h5 class="fw-bold mb-1">${a.title}</h5>
            <div class="small text-secondary mb-2">
              <strong>Position:</strong> ${a.position}<br>
              <strong>Sport:</strong> ${a.sportName || 'Athletics'}<br>
              <strong>Event:</strong> ${a.competitionName || 'Tournament'}
            </div>
            <p class="text-muted small mb-0">${a.description || ''}</p>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-center text-danger py-4">Failed to load achievements.</div>`;
  }
}

// 11. Notifications
async function loadStudentNotifications() {
  const container = document.getElementById('student-notifications-list');
  try {
    const res = await apiRequest('/notifications');
    const badge = document.getElementById('student-nav-unread-badge');
    if (badge) {
      badge.innerText = res.unreadCount;
      badge.style.display = res.unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (!res.notifications || res.notifications.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="bi bi-bell-slash empty-state-icon"></i><h5>No notifications currently.</h5></div>`;
      return;
    }

    container.innerHTML = res.notifications.map(n => `
      <div class="glass-card p-3 mb-3 ${!n.isRead ? 'border-primary border-2' : ''}">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="d-flex align-items-center gap-2">
            <span class="badge ${n.priority === 'Urgent' ? 'bg-danger pulse-low-stock' : 'badge-glass-primary'}">${n.category}</span>
            ${!n.isRead ? '<span class="badge bg-primary">New</span>' : ''}
          </div>
          <span class="text-muted small">${formatDate(n.createdAt)}</span>
        </div>
        <h6 class="fw-bold mb-1">${n.title}</h6>
        <p class="text-secondary small mb-2">${n.message}</p>
        <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
          <span class="text-muted small">From: <strong>${n.sender || 'Sports Incharge'}</strong></span>
          ${!n.isRead ? `<button class="btn btn-sm btn-outline-primary" onclick="markNotificationRead('${n._id}')">Mark as Read</button>` : '<span class="text-success small"><i class="bi bi-check2-all"></i> Read</span>'}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="text-center text-danger py-4">Failed to load notifications.</div>`;
  }
}

async function markNotificationRead(id) {
  try {
    await apiRequest(`/notifications/${id}/read`, 'PATCH');
    loadStudentNotifications();
  } catch (err) {
    console.error(err);
  }
}

// ============================================================
// STUDENT: EXTERNAL SPORTS COMPETITIONS
// ============================================================

async function loadStudentExternalCompetitions() {
  const container = document.getElementById('student-ec-cards');
  if (!container) return;

  const search = (document.getElementById('student-ec-search')?.value || '').trim();
  const level  = document.getElementById('student-ec-filter-level')?.value || 'All';

  let url = '/external-competitions?';
  if (search)           url += `search=${encodeURIComponent(search)}&`;
  if (level !== 'All')  url += `level=${encodeURIComponent(level)}&`;

  container.innerHTML = '<div class="col-12 text-center text-muted py-5"><span class="spinner-border spinner-border-sm me-2"></span>Loading competitions...</div>';

  try {
    const res   = await apiRequest(url);
    const comps = res.competitions || [];

    if (!comps.length) {
      container.innerHTML = `<div class="col-12 text-center text-muted py-5">
        <i class="bi bi-globe2 fs-1 text-primary opacity-40 d-block mb-3"></i>
        <h5 class="fw-semibold">No Competitions Available</h5>
        <p class="small">Check back later for new external competition announcements.</p>
      </div>`;
      return;
    }

    container.innerHTML = comps.map(c => {
      const now = new Date();
      const deadline = c.registrationDeadline ? new Date(c.registrationDeadline) : null;
      const deadlineFmt = deadline ? deadline.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'Not specified';
      const startFmt  = c.startDate ? new Date(c.startDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
      const ds = c.deadlineStatus || 'Unknown';

      const deadlineClass = ds === 'Registration Open' ? 'success' : ds === 'Registration Closing Soon' ? 'warning' : ds === 'Registration Closed' ? 'danger' : 'secondary';
      const deadlineIcon  = ds === 'Registration Open' ? '🟢' : ds === 'Registration Closing Soon' ? '🟠' : ds === 'Registration Closed' ? '🔴' : '⚫';
      const canRegister   = ds !== 'Registration Closed' && ds !== 'Completed' && c.registrationUrl;

      const regBtn = c.registrationUrl
        ? canRegister
          ? `<a href="${c.registrationUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-success btn-sm fw-bold ms-1">
               <i class="bi bi-box-arrow-up-right me-1"></i> Register Now →
             </a>`
          : `<span class="btn btn-secondary btn-sm disabled ms-1"><i class="bi bi-x-circle me-1"></i> Registration Closed</span>`
        : '';

      const featuredBadge = c.featured ? `<span class="badge bg-warning text-dark me-1"><i class="bi bi-star-fill me-1"></i>Featured</span>` : '';
      const levelBadge    = `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">${c.level || 'External'}</span>`;

      const bannerHtml = c.image
        ? `<img src="${c.image}" alt="${c.title}" class="card-img-top" style="height:160px;object-fit:cover;" onerror="this.style.display='none'">`
        : `<div class="text-center py-4" style="background:linear-gradient(135deg,#e3f0ff 0%,#f0e7ff 100%);">
             <i class="bi bi-globe2 text-primary" style="font-size:2.5rem;"></i>
           </div>`;

      return `<div class="col-md-6 col-xl-4">
        <div class="card border-0 shadow-sm h-100" style="border-radius:16px;overflow:hidden;">
          ${bannerHtml}
          <div class="card-body d-flex flex-column p-3">
            <div class="d-flex gap-2 mb-2 flex-wrap">
              ${featuredBadge}${levelBadge}
              <span class="badge bg-${deadlineClass} bg-opacity-15 text-${deadlineClass} border border-${deadlineClass} border-opacity-25">${deadlineIcon} ${ds}</span>
            </div>
            <h6 class="fw-bold text-dark mb-1">${c.title}</h6>
            <div class="text-muted small mb-2">
              ${c.sport ? `<span><i class="bi bi-trophy-fill text-primary me-1"></i>${c.sport}</span> · ` : ''}
              ${c.organizer ? `<span>${c.organizer}</span>` : ''}
            </div>
            ${c.venue ? `<p class="text-muted small mb-1"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${c.venue}</p>` : ''}
            <p class="text-muted small mb-1"><i class="bi bi-calendar-event-fill text-info me-1"></i> Event: ${startFmt}</p>
            <p class="text-muted small mb-2"><i class="bi bi-clock-fill text-warning me-1"></i> Deadline: ${deadlineFmt}</p>
            ${c.eligibility ? `<p class="text-muted small mb-2"><i class="bi bi-person-check-fill me-1"></i>${c.eligibility}</p>` : ''}
            ${c.announcementSummary || c.description
              ? `<p class="small text-secondary flex-grow-1 mb-2" style="line-height:1.5;">${(c.announcementSummary || c.description || '').substring(0,120)}${(c.announcementSummary || c.description || '').length > 120 ? '...' : ''}</p>`
              : '<div class="flex-grow-1"></div>'}
            <div class="d-flex gap-2 flex-wrap mt-2">
              ${c.sourceUrl
                ? `<a href="${c.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm"><i class="bi bi-link-45deg me-1"></i>Source</a>`
                : ''}
              ${regBtn}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>${err.message}</div>`;
  }
}

// ============================================================
// STUDENT: SPORTS NEWS & ANNOUNCEMENTS
// ============================================================

async function loadStudentSportsNews() {
  const container = document.getElementById('student-sn-cards');
  if (!container) return;

  const search   = (document.getElementById('student-sn-search')?.value || '').trim();
  const category = document.getElementById('student-sn-filter-category')?.value || 'All';

  let url = '/sports-news?';
  if (search)             url += `search=${encodeURIComponent(search)}&`;
  if (category !== 'All') url += `category=${encodeURIComponent(category)}&`;

  container.innerHTML = '<div class="col-12 text-center text-muted py-5"><span class="spinner-border spinner-border-sm me-2"></span>Loading news...</div>';

  try {
    const res  = await apiRequest(url);
    const news = res.news || [];

    if (!news.length) {
      container.innerHTML = `<div class="col-12 text-center text-muted py-5">
        <i class="bi bi-newspaper fs-1 text-primary opacity-40 d-block mb-3"></i>
        <h5 class="fw-semibold">No Sports News Available</h5>
        <p class="small">Check back later for latest sports announcements.</p>
      </div>`;
      return;
    }

    const CATEGORY_COLORS = {
      'Tournament':         'primary',
      'Competition':        'success',
      'Selection Trial':    'warning',
      'Sports Announcement':'info',
      'Achievement':        'success',
      'Team News':          'secondary',
      'Training':           'info',
      'General Sports News':'secondary'
    };

    container.innerHTML = news.map(n => {
      const pubDate   = n.publishedDate ? new Date(n.publishedDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
      const catColor  = CATEGORY_COLORS[n.category] || 'secondary';
      const featBadge = n.featured ? `<span class="badge bg-warning text-dark me-1"><i class="bi bi-star-fill me-1"></i>Featured</span>` : '';

      const imgHtml = n.image
        ? `<img src="${n.image}" alt="${n.title}" class="card-img-top" style="height:150px;object-fit:cover;" onerror="this.style.display='none'">`
        : `<div class="text-center py-4" style="background:linear-gradient(135deg,#fff9e6 0%,#e6f0ff 100%);">
             <i class="bi bi-newspaper text-warning" style="font-size:2.5rem;"></i>
           </div>`;

      return `<div class="col-md-6 col-xl-4">
        <div class="card border-0 shadow-sm h-100" style="border-radius:16px;overflow:hidden;">
          ${imgHtml}
          <div class="card-body d-flex flex-column p-3">
            <div class="d-flex gap-2 mb-2 flex-wrap">
              ${featBadge}
              <span class="badge bg-${catColor} bg-opacity-10 text-${catColor} border border-${catColor} border-opacity-25 small">${n.category || 'General'}</span>
            </div>
            <h6 class="fw-bold text-dark mb-1">${n.title}</h6>
            <div class="text-muted small mb-2">
              ${n.sport ? `<i class="bi bi-trophy-fill text-primary me-1"></i>${n.sport} · ` : ''}
              <i class="bi bi-calendar3 me-1"></i>${pubDate}
              ${n.sourceName ? ` · <span class="text-info">${n.sourceName}</span>` : ''}
            </div>
            <p class="small text-secondary flex-grow-1 mb-3" style="line-height:1.5;">${(n.shortSummary || '').substring(0,150)}${(n.shortSummary || '').length > 150 ? '...' : ''}</p>
            <div class="d-flex gap-2 flex-wrap mt-auto">
              ${n.sourceUrl
                ? `<a href="${n.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm">
                     <i class="bi bi-box-arrow-up-right me-1"></i> Read Original Article →
                   </a>`
                : ''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div class="col-12 text-center text-danger py-4"><i class="bi bi-exclamation-triangle me-2"></i>${err.message}</div>`;
  }
}
