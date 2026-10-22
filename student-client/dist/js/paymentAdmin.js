/**
 * 🏆 GASC IDAPPADI SMART SPORTS MANAGEMENT SYSTEM
 * 💳 PAYMENT MANAGEMENT MODULE (ADMIN EXE)
 * Transactions Ledger, Razorpay Gateway Health, Dynamic Receiving Accounts, and Reconciliation
 */

let paymentTransactionsCache = [];
let paymentMetricsCache = null;
let paymentSettingsCache = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // If user opens direct or hash
  const navItem = document.querySelector('.admin-nav-item[data-view="payments"]');
  if (navItem) {
    navItem.addEventListener('click', () => {
      loadAdminPayments();
    });
  }
});

/**
 * 1. LOAD ADMIN PAYMENTS & TRANSACTIONS LEDGER
 */
async function loadAdminPayments() {
  const tableBody = document.getElementById('payments-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <div class="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
          <span>Loading verified payment records from ledger...</span>
        </td>
      </tr>
    `;
  }

  try {
    // 1. Fetch gateway status and settings
    await fetchGatewaySettings();

    // 2. Fetch filtered transactions
    const tournamentId = document.getElementById('pay-filter-tournament')?.value || 'ALL';
    const competitionId = document.getElementById('pay-filter-competition')?.value || 'ALL';
    const status = document.getElementById('pay-filter-status')?.value || 'ALL';
    const search = document.getElementById('pay-search-input')?.value || '';
    const startDate = document.getElementById('pay-filter-date-from')?.value || '';
    const endDate = document.getElementById('pay-filter-date-to')?.value || '';

    const queryParams = new URLSearchParams({
      tournamentId,
      competitionId,
      status,
      search,
      startDate,
      endDate
    });

    let data = null;
    try {
      const res = await apiRequest(`/payments/admin/transactions?${queryParams.toString()}`);
      if (res && res.success) data = res;
    } catch (e) {
      console.warn('API request fallback for payments transactions:', e.message);
    }

    if (!data) {
      // Local fallback
      try {
        const res = await fetch(`/api/payments/admin/transactions?${queryParams.toString()}`);
        data = await res.json();
      } catch (e2) {}
    }

    if (data && data.success) {
      paymentTransactionsCache = data.transactions || [];
      paymentMetricsCache = data.metrics || null;
      renderPaymentMetrics(paymentMetricsCache);
      renderPaymentTransactionsTable(paymentTransactionsCache);
      populatePaymentFilterDropdowns();
    } else {
      renderEmptyPaymentsTable('No payment records found matching current filters.');
    }
  } catch (err) {
    console.error('loadAdminPayments error:', err);
    renderEmptyPaymentsTable('Failed to load payments: ' + err.message);
  }
}

/**
 * 2. RENDER KPI SUMMARY CARDS
 */
function renderPaymentMetrics(m) {
  if (!m) return;
  const setEl = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  };

  const formattedCollections = '₹' + Number(m.totalSuccessfulCollections || 0).toLocaleString('en-IN');
  const formattedRefunds = '₹' + Number(m.totalRefundedAmount || 0).toLocaleString('en-IN');

  setEl('kpi-pay-total-collections', formattedCollections);
  setEl('kpi-pay-success-count', `${m.totalSuccessfulCount || 0} Successful`);
  setEl('kpi-pay-pending-count', String(m.totalPendingCount || 0));
  setEl('kpi-pay-failed-count', String(m.totalFailedCount || 0));
  setEl('kpi-pay-refund-count', `${m.totalRefundedCount || 0} (${formattedRefunds})`);
}

/**
 * 3. RENDER TRANSACTIONS TABLE
 */
function renderPaymentTransactionsTable(list) {
  const tableBody = document.getElementById('payments-table-body');
  if (!tableBody) return;

  if (!list || list.length === 0) {
    renderEmptyPaymentsTable('No transactions recorded yet.');
    return;
  }

  let html = '';
  list.forEach((p, idx) => {
    const pStatus = (p.status || 'CREATED').toUpperCase();
    let statusBadge = '';

    if (pStatus === 'SUCCESS') {
      statusBadge = '<span class="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30"><i class="bi bi-check-circle-fill me-1"></i>SUCCESS</span>';
    } else if (pStatus === 'FAILED') {
      statusBadge = '<span class="badge bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30"><i class="bi bi-x-circle-fill me-1"></i>FAILED</span>';
    } else if (pStatus === 'REFUNDED') {
      statusBadge = '<span class="badge bg-info bg-opacity-20 text-info border border-info border-opacity-30"><i class="bi bi-arrow-counterclockwise me-1"></i>REFUNDED</span>';
    } else {
      statusBadge = '<span class="badge bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30"><i class="bi bi-clock me-1"></i>PENDING</span>';
    }

    const dateStr = p.verified_at || p.created_at || '';
    const formattedDate = dateStr ? new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '-';

    const regCode = p.registration_code || p.registration_id || 'N/A';
    const paymentId = p.provider_payment_id || '-';
    const orderId = p.provider_order_id || '-';

    html += `
      <tr>
        <td class="text-muted small">${idx + 1}</td>
        <td>
          <div class="fw-bold font-monospace text-primary">${regCode}</div>
          <div class="text-muted small" style="font-size:0.75rem;">${formattedDate}</div>
        </td>
        <td>
          <div class="fw-bold text-white">${p.payer_name || 'Participant'}</div>
          <div class="text-white-50 small truncate" style="max-width:180px;">${p.college_name || 'External College'}</div>
        </td>
        <td>
          <div class="fw-semibold text-warning">${p.competition_name || 'Competition'}</div>
          <div class="text-white-50 small">${p.registration_type || 'INDIVIDUAL'}</div>
        </td>
        <td>
          <div class="fw-black fs-6 text-white">₹${Number(p.amount || 0).toLocaleString('en-IN')}</div>
          <div class="text-muted small uppercase" style="font-size:0.7rem;">${p.payment_method || 'Online'}</div>
        </td>
        <td>
          <div class="d-flex align-items-center gap-1">
            <span class="font-monospace small text-white">${paymentId}</span>
            ${paymentId !== '-' ? `
              <button class="btn btn-link btn-sm p-0 text-muted" onclick="copyTextToClipboard('${paymentId}', 'Payment ID')" title="Copy Payment ID">
                <i class="bi bi-copy"></i>
              </button>
            ` : ''}
          </div>
          <div class="text-muted font-monospace small" style="font-size:0.7rem;">Order: ${orderId}</div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div class="btn-group btn-group-sm">
            ${p.payment_screenshot ? `
              <button class="btn btn-outline-info btn-sm" onclick="showPaymentProofModal('${p.id}')" title="View Uploaded Payment Screenshot">
                <i class="bi bi-image"></i>
              </button>
            ` : ''}
            ${pStatus !== 'SUCCESS' ? `
              <button class="btn btn-success btn-sm fw-bold px-2 text-white" onclick="quickVerifyAndApprovePayment('${p.id}')" title="Confirm Payment Received & Approve Player">
                <i class="bi bi-check-lg"></i> Approve
              </button>
            ` : ''}
            <button class="btn btn-outline-light btn-sm" onclick="openPaymentReceiptModal('${p.id || p.provider_payment_id}')" title="View Printable Receipt">
              <i class="bi bi-receipt"></i>
            </button>
            ${pStatus === 'SUCCESS' ? `
              <button class="btn btn-outline-danger btn-sm" onclick="openRefundModal('${p.id || p.provider_payment_id}', '${regCode}', ${p.amount})" title="Initiate Refund">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

function renderEmptyPaymentsTable(message) {
  const tableBody = document.getElementById('payments-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-3 d-block mb-2 text-secondary"></i>
          <div>${message}</div>
        </td>
      </tr>
    `;
  }
}

/**
 * 4. GATEWAY CONNECTION STATUS & RECEIVING ACCOUNT SETTINGS
 */
async function fetchGatewaySettings() {
  try {
    let data = null;
    try {
      const res = await apiRequest('/payments/admin/settings');
      if (res && res.success) data = res;
    } catch (e) {}

    if (!data) {
      try {
        const res = await fetch('/api/payments/admin/settings');
        data = await res.json();
      } catch (e2) {}
    }

    if (data && data.success) {
      paymentSettingsCache = data;
      renderGatewayHealthPill(data.gateway, data.settings);
    }
  } catch (err) {
    console.warn('fetchGatewaySettings error:', err.message);
  }
}

function renderGatewayHealthPill(gw, st) {
  const badgeEl = document.getElementById('pay-gateway-status-pill');
  const sidebarBadge = document.getElementById('nav-payment-mode-badge');

  if (!gw) return;

  let text = 'RAZORPAY';
  let badgeClass = 'bg-success';

  if (gw.mode === 'LIVE') {
    text = 'LIVE MODE';
    badgeClass = 'bg-success';
  } else if (gw.mode === 'TEST') {
    text = 'TEST MODE';
    badgeClass = 'bg-warning text-dark';
  } else {
    text = 'SIMULATOR MODE';
    badgeClass = 'bg-info text-dark';
  }

  if (badgeEl) {
    badgeEl.className = `badge ${badgeClass} px-3 py-1.5 fw-bold shadow-sm`;
    badgeEl.innerHTML = `<i class="bi bi-shield-check me-1"></i> ${gw.provider} ${text}`;
  }

  if (sidebarBadge) {
    sidebarBadge.className = `badge ${badgeClass} ms-auto`;
    sidebarBadge.innerText = text;
  }
}

/**
 * 5. POPULATE FILTER DROPDOWNS
 */
function populatePaymentFilterDropdowns() {
  const tSel = document.getElementById('pay-filter-tournament');
  const cSel = document.getElementById('pay-filter-competition');

  if (tSel && window.extCompetitionsCache) {
    const tournaments = new Set();
    window.extCompetitionsCache.forEach(c => {
      const name = c.tournament_name || c.tournamentName;
      if (name) tournaments.add(name);
    });

    if (tSel.options.length <= 1) {
      tournaments.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t;
        tSel.appendChild(opt);
      });
    }
  }

  if (cSel && window.extCompetitionsCache) {
    if (cSel.options.length <= 1) {
      window.extCompetitionsCache.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = c.name || c.sport_name || 'Competition';
        cSel.appendChild(opt);
      });
    }
  }
}

function resetPaymentFilters() {
  if (document.getElementById('pay-filter-tournament')) document.getElementById('pay-filter-tournament').value = 'ALL';
  if (document.getElementById('pay-filter-competition')) document.getElementById('pay-filter-competition').value = 'ALL';
  if (document.getElementById('pay-filter-status')) document.getElementById('pay-filter-status').value = 'ALL';
  if (document.getElementById('pay-search-input')) document.getElementById('pay-search-input').value = '';
  if (document.getElementById('pay-filter-date-from')) document.getElementById('pay-filter-date-from').value = '';
  if (document.getElementById('pay-filter-date-to')) document.getElementById('pay-filter-date-to').value = '';
  loadAdminPayments();
}

/**
 * 6. VIEW OFFICIAL PAYMENT RECEIPT MODAL
 */
async function openPaymentReceiptModal(paymentId) {
  const modalEl = document.getElementById('modal-payment-receipt');
  if (!modalEl) return;

  const contentBox = document.getElementById('receipt-modal-content');
  if (contentBox) {
    contentBox.innerHTML = '<div class="text-center py-5"><span class="spinner-border spinner-border-sm me-2"></span>Loading official receipt details...</div>';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  try {
    let data = null;
    try {
      const res = await apiRequest(`/payments/receipt/${paymentId}`);
      if (res && res.success) data = res;
    } catch (e) {}

    if (!data) {
      const res = await fetch(`/api/payments/receipt/${paymentId}`);
      data = await res.json();
    }

    if (data && data.success && data.receipt) {
      const r = data.receipt;
      const dateStr = r.date ? new Date(r.date).toLocaleString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '-';

      if (contentBox) {
        contentBox.innerHTML = `
          <div class="p-4 bg-white text-dark rounded-3 shadow-sm border border-secondary border-opacity-25" id="printable-receipt-card">
            <!-- Header -->
            <div class="text-center pb-3 border-bottom border-2 border-success">
              <div class="d-flex align-items-center justify-content-center gap-2 mb-1">
                <img src="images/college-logo.png" alt="GASC" width="48" height="48" class="object-contain" onerror="this.onerror=null;this.src='images/college-logo.png'">
                <div class="text-start">
                  <h5 class="fw-black mb-0 text-dark">GOVERNMENT ARTS AND SCIENCE COLLEGE, IDAPPADI</h5>
                  <div class="small text-secondary fw-semibold">Department of Physical Education & Sports</div>
                </div>
              </div>
              <div class="badge bg-success bg-opacity-10 text-success border border-success fw-bold px-3 py-1 mt-2">
                OFFICIAL ONLINE TOURNAMENT REGISTRATION RECEIPT
              </div>
            </div>

            <!-- Receipt Metadata Grid -->
            <div class="row g-2 py-3 border-bottom small">
              <div class="col-sm-6">
                <div class="text-muted">Receipt Number:</div>
                <div class="fw-bold font-monospace">${r.receiptNumber}</div>
              </div>
              <div class="col-sm-6 text-sm-end">
                <div class="text-muted">Payment Date:</div>
                <div class="fw-bold">${dateStr}</div>
              </div>
              <div class="col-sm-6">
                <div class="text-muted">Registration Code:</div>
                <div class="fw-bold text-success font-monospace fs-6">${r.registrationCode}</div>
              </div>
              <div class="col-sm-6 text-sm-end">
                <div class="text-muted">Razorpay Payment ID:</div>
                <div class="fw-bold font-monospace">${r.paymentId}</div>
              </div>
            </div>

            <!-- Details Table -->
            <table class="table table-bordered table-sm my-3 small align-middle">
              <tbody>
                <tr>
                  <th class="bg-light text-muted w-35">Tournament</th>
                  <td class="fw-bold">${r.tournamentName}</td>
                </tr>
                <tr>
                  <th class="bg-light text-muted">Competition / Sport</th>
                  <td class="fw-bold">${r.competitionName}</td>
                </tr>
                <tr>
                  <th class="bg-light text-muted">Participant / Team</th>
                  <td class="fw-bold">${r.payerName}</td>
                </tr>
                <tr>
                  <th class="bg-light text-muted">College Name</th>
                  <td>${r.collegeName}</td>
                </tr>
                <tr>
                  <th class="bg-light text-muted">Payment Gateway</th>
                  <td>Razorpay Standard Checkout (Official Gateway)</td>
                </tr>
                <tr>
                  <th class="bg-light text-muted">Status</th>
                  <td><span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i>PAID & VERIFIED</span></td>
                </tr>
                <tr class="table-success">
                  <th class="fs-6 fw-bold">Total Amount Paid</th>
                  <th class="fs-5 fw-black text-success">₹${Number(r.amount || 0).toLocaleString('en-IN')} INR</th>
                </tr>
              </tbody>
            </table>

            <!-- Footer Seal & Auth -->
            <div class="d-flex justify-content-between align-items-end pt-3 text-center small text-muted">
              <div>
                <div class="fw-bold text-dark">Sports Department Computer Center</div>
                <div style="font-size:0.7rem;">System Verified Electronic Record</div>
              </div>
              <div>
                <div class="border-top border-dark border-1 pt-1 fw-bold text-dark" style="min-width:140px;">
                  Dr. R. ANITHA
                </div>
                <div style="font-size:0.7rem;">Physical Director / Authorized Incharge</div>
              </div>
            </div>
          </div>
        `;
      }
    }
  } catch (err) {
    if (contentBox) contentBox.innerHTML = '<div class="alert alert-danger">Error loading receipt: ' + err.message + '</div>';
  }
}

function printReceipt() {
  const content = document.getElementById('printable-receipt-card');
  if (!content) return;
  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>GASC Idappadi Sports Receipt</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${content.outerHTML}
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

/**
 * 7. AUTHORIZED REFUND INITIATION MODAL
 */
function openRefundModal(paymentId, regCode, amount) {
  const modalEl = document.getElementById('modal-initiate-refund');
  if (!modalEl) return;

  document.getElementById('refund-payment-id').value = paymentId;
  document.getElementById('refund-reg-code').innerText = regCode;
  document.getElementById('refund-max-amount').innerText = `₹${amount}`;
  document.getElementById('refund-amount-input').value = amount;
  document.getElementById('refund-amount-input').max = amount;
  document.getElementById('refund-reason-input').value = '';

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

async function submitAuthorizedRefund() {
  const paymentId = document.getElementById('refund-payment-id').value;
  const amount = Number(document.getElementById('refund-amount-input').value);
  const reason = document.getElementById('refund-reason-input').value;

  if (!paymentId) return;
  if (!reason || !reason.trim()) {
    notifyUser('Please specify a legitimate reason for this refund.', 'warning');
    return;
  }

  if (amount <= 0) {
    notifyUser('Refund amount must be greater than 0.', 'warning');
    return;
  }

  const btn = document.getElementById('btn-confirm-refund');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing with Razorpay...';
  }

  try {
    let data = null;
    const payload = { paymentId, amount, reason };

    try {
      const res = await apiRequest('/payments/admin/refund', 'POST', payload);
      if (res && res.success) data = res;
    } catch (e) {}

    if (!data) {
      const res = await fetch('/api/payments/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }

    if (data && data.success) {
      notifyUser(`✅ Refund of ₹${amount} successfully initiated! Payer will receive funds according to standard bank cycles.`, 'success');
      bootstrap.Modal.getInstance(document.getElementById('modal-initiate-refund'))?.hide();
      loadAdminPayments();
    } else {
      notifyUser('Refund failed: ' + (data?.message || 'Gateway rejected refund request'), 'danger');
    }
  } catch (err) {
    notifyUser('Refund error: ' + err.message, 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1"></i> Confirm Authorized Refund';
    }
  }
}

/**
 * 8. DYNAMIC RECEIVING ACCOUNT & GATEWAY CONFIGURATION MODAL
 */
function openPaymentSettingsModal() {
  const modalEl = document.getElementById('modal-payment-settings');
  if (!modalEl) return;

  const st = paymentSettingsCache?.settings || {};
  const gw = paymentSettingsCache?.gateway || {};

  document.getElementById('cfg-receiver-name').value = st.receiverName || 'Dr. R. ANITHA (Physical Director)';
  document.getElementById('cfg-receiver-dept').value = st.receiverDepartment || 'Department of Physical Education & Sports';
  document.getElementById('cfg-institution-name').value = st.institutionName || 'Government Arts and Science College, Idappadi';
  document.getElementById('cfg-merchant-id').value = st.merchantId || 'acc_GASC_SPORTS';
  document.getElementById('cfg-settlement-title').value = st.settlementAccountTitle || 'Sports Fund Account (Authorized Representative)';
  document.getElementById('cfg-settlement-bank').value = st.settlementBankName || 'State Bank of India';
  document.getElementById('cfg-settlement-branch').value = st.settlementBranch || 'Idappadi Branch';
  document.getElementById('cfg-settlement-status').value = st.settlementStatus || 'KYC_VERIFIED';
  document.getElementById('cfg-settlement-mask').value = st.settlementAccountMask || '••••••••4892';
  document.getElementById('cfg-team-fee').value = st.defaultTeamFee || 500;
  document.getElementById('cfg-individual-fee').value = st.defaultIndividualFee || 100;
  document.getElementById('cfg-is-test-mode').checked = st.isTestMode !== undefined ? st.isTestMode : true;
  document.getElementById('cfg-allow-free').checked = st.allowFreeRegistration !== undefined ? st.allowFreeRegistration : true;
  document.getElementById('cfg-change-summary').value = '';

  const keyDisplay = document.getElementById('cfg-public-key-display');
  if (keyDisplay) {
    keyDisplay.innerText = gw.publicKey || 'Not configured in server .env (running simulator)';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

async function savePaymentSettingsFromModal() {
  const payload = {
    receiverName: document.getElementById('cfg-receiver-name').value.trim(),
    receiverDepartment: document.getElementById('cfg-receiver-dept').value.trim(),
    institutionName: document.getElementById('cfg-institution-name').value.trim(),
    merchantId: document.getElementById('cfg-merchant-id').value.trim(),
    settlementAccountTitle: document.getElementById('cfg-settlement-title').value.trim(),
    settlementBankName: document.getElementById('cfg-settlement-bank').value.trim(),
    settlementBranch: document.getElementById('cfg-settlement-branch').value.trim(),
    settlementStatus: document.getElementById('cfg-settlement-status').value,
    settlementAccountMask: document.getElementById('cfg-settlement-mask').value.trim(),
    defaultTeamFee: Number(document.getElementById('cfg-team-fee').value) || 500,
    defaultIndividualFee: Number(document.getElementById('cfg-individual-fee').value) || 100,
    isTestMode: document.getElementById('cfg-is-test-mode').checked,
    allowFreeRegistration: document.getElementById('cfg-allow-free').checked,
    changeSummary: document.getElementById('cfg-change-summary').value.trim() || 'Updated payment receiving account settings'
  };

  if (!payload.receiverName) {
    notifyUser('Receiver name is required.', 'warning');
    return;
  }

  try {
    let data = null;
    try {
      const res = await apiRequest('/payments/admin/settings', 'POST', payload);
      if (res && res.success) data = res;
    } catch (e) {}

    if (!data) {
      const res = await fetch('/api/payments/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }

    if (data && data.success) {
      notifyUser('✅ Payment settings and receiving account information successfully updated!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('modal-payment-settings'))?.hide();
      loadAdminPayments();
    } else {
      notifyUser('Error saving settings: ' + (data?.message || 'Unknown error'), 'danger');
    }
  } catch (err) {
    notifyUser('Error saving settings: ' + err.message, 'danger');
  }
}

/**
 * 9. SETTINGS AUDIT HISTORY MODAL
 */
async function openPaymentAuditHistoryModal() {
  const modalEl = document.getElementById('modal-payment-audit-history');
  if (!modalEl) return;

  const tbody = document.getElementById('payment-audit-history-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><span class="spinner-border spinner-border-sm me-1"></span>Loading audit trail...</td></tr>';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  try {
    await fetchGatewaySettings();
    const history = paymentSettingsCache?.history || [];

    if (tbody) {
      if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No configuration changes recorded yet.</td></tr>';
        return;
      }

      let html = '';
      history.forEach(h => {
        const dateStr = h.created_at ? new Date(h.created_at).toLocaleString('en-IN') : '-';
        html += `
          <tr>
            <td class="fw-bold font-monospace text-primary">v${h.config_version || 1}</td>
            <td class="fw-bold">${h.receiver_name}</td>
            <td><span class="badge ${h.is_test_mode ? 'bg-warning text-dark' : 'bg-success'}">${h.is_test_mode ? 'TEST' : 'LIVE'}</span></td>
            <td>${h.settlement_status || 'VERIFIED'}</td>
            <td class="small text-muted">${dateStr}</td>
            <td class="small text-secondary">${h.change_summary || 'Updated settings'} (${h.changed_by || 'Admin'})</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-danger py-4">Error loading history: ' + err.message + '</td></tr>';
  }
}

/**
 * 10. EXPORT TRANSACTIONS TO CSV / EXCEL
 */
function exportPaymentsToCsv() {
  if (!paymentTransactionsCache || paymentTransactionsCache.length === 0) {
    notifyUser('No transactions to export.', 'warning');
    return;
  }

  const headers = [
    'Registration ID',
    'Date & Time',
    'Participant / Team',
    'College Name',
    'Tournament',
    'Competition',
    'Amount (INR)',
    'Payment Method',
    'Status',
    'Razorpay Payment ID',
    'Razorpay Order ID',
    'Refund ID',
    'Refund Amount'
  ];

  const rows = paymentTransactionsCache.map(p => [
    `"${p.registration_code || p.registration_id || ''}"`,
    `"${p.verified_at || p.created_at || ''}"`,
    `"${(p.payer_name || '').replace(/"/g, '""')}"`,
    `"${(p.college_name || '').replace(/"/g, '""')}"`,
    `"${(p.tournament_name || '').replace(/"/g, '""')}"`,
    `"${(p.competition_name || '').replace(/"/g, '""')}"`,
    p.amount || 0,
    `"${p.payment_method || 'Online'}"`,
    `"${p.status || 'PENDING'}"`,
    `"${p.provider_payment_id || ''}"`,
    `"${p.provider_order_id || ''}"`,
    `"${p.refund_id || ''}"`,
    p.refund_amount || 0
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GASC_Sports_Payment_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  notifyUser('✅ Payment records successfully exported to CSV!', 'success');
}

function copyTextToClipboard(text, label) {
  if (!text || text === '-') return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    notifyUser(`Copied ${label}: ${text}`, 'info');
  }
}

// Expose to window
window.loadAdminPayments = loadAdminPayments;
window.resetPaymentFilters = resetPaymentFilters;
window.openPaymentReceiptModal = openPaymentReceiptModal;
window.printReceipt = printReceipt;
window.openRefundModal = openRefundModal;
window.submitAuthorizedRefund = submitAuthorizedRefund;
window.openPaymentSettingsModal = openPaymentSettingsModal;
window.savePaymentSettingsFromModal = savePaymentSettingsFromModal;
window.openPaymentAuditHistoryModal = openPaymentAuditHistoryModal;
window.exportPaymentsToCsv = exportPaymentsToCsv;
window.copyTextToClipboard = copyTextToClipboard;
