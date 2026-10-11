/**
 * GASC Idappadi Sports API Client & Toast System
 */

const API_BASE = (typeof window !== 'undefined' && window.GASC_CONFIG && window.GASC_CONFIG.API_BASE_URL) 
  ? window.GASC_CONFIG.API_BASE_URL 
  : (typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'http://localhost:5000/api' : '/api');

// Toast Notification System
function showToast(message, type = 'info', title = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'sports-toast';

  let icon = 'bi-info-circle-fill text-primary';
  let borderClass = 'border-primary';
  if (type === 'success') {
    icon = 'bi-check-circle-fill text-success';
    borderClass = 'border-success';
  } else if (type === 'error' || type === 'danger') {
    icon = 'bi-exclamation-triangle-fill text-danger';
    borderClass = 'border-danger';
  } else if (type === 'warning') {
    icon = 'bi-exclamation-circle-fill text-warning';
    borderClass = 'border-warning';
  }

  toast.innerHTML = `
    <i class="bi ${icon} fs-4"></i>
    <div class="flex-grow-1">
      <div class="fw-bold mb-1">${title || (type.charAt(0).toUpperCase() + type.slice(1))}</div>
      <div class="small text-secondary">${message}</div>
    </div>
    <button type="button" class="btn-close btn-sm ms-2" onclick="this.parentElement.remove()"></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Global API Request Helper
async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
  const token = localStorage.getItem('gasc_token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };

  if (body) {
    if (isFormData) {
      options.body = body; // Browser sets Content-Type multipart/form-data boundary
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/admin-login')) {
        // Token expired or invalid
        localStorage.removeItem('gasc_token');
        localStorage.removeItem('gasc_user');
        const isAdminPage = window.location.pathname.includes('admin') || window.location.href.includes('admin');
        if (isAdminPage) {
          const adminUrl = window.location.protocol === 'file:' ? 'admin-login.html?expired=true' : '/admin/login?expired=true';
          window.location.href = adminUrl;
        } else {
          const studentUrl = window.location.protocol === 'file:' ? 'student-login.html?expired=true' : '/student/login?expired=true';
          window.location.href = studentUrl;
        }
      }
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// Date Formatter
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// User state helpers
function getCurrentUser() {
  const user = localStorage.getItem('gasc_user');
  return user ? JSON.parse(user) : null;
}

function setCurrentUser(user, token) {
  if (token) localStorage.setItem('gasc_token', token);
  if (user) localStorage.setItem('gasc_user', JSON.stringify(user));
}

function logout() {
  const user = getCurrentUser();
  const isAdmin = user && user.role === 'admin';
  localStorage.removeItem('gasc_token');
  localStorage.removeItem('gasc_user');
  showToast('Logged out successfully. See you again!', 'info', 'Logout');
  const isPackaged = window.location.protocol === 'file:' || window.location.protocol === 'capacitor:';
  setTimeout(() => {
    if (isAdmin) {
      window.location.href = isPackaged ? 'admin-login.html' : '/admin/login';
    } else {
      window.location.href = isPackaged ? 'student-login.html' : '/student/login';
    }
  }, 500);
}

// Enforce College Access Gate & Strict Role-Based Portal Access
function enforceCollegeGate() {
  if (typeof window === 'undefined') return true;

  const path = window.location.pathname.toLowerCase();
  
  // Public & Auth Pages
  const isAuthPage = path.includes('login') || path.includes('register') || path === '/' || path.endsWith('index.html');
  if (isAuthPage) return true;

  const token = localStorage.getItem('gasc_token');
  const user = getCurrentUser();

  const isAdminArea = path.includes('/admin') || path.includes('admin-dashboard');
  const isStudentArea = path.includes('/student') || path.includes('student-dashboard');

  if (isAdminArea) {
    if (!token || !user) {
      window.location.replace('/admin/login');
      return false;
    }
    if (user.role !== 'admin') {
      alert('Access Denied: Sports Incharge / Admin privileges required.');
      window.location.replace('/student/dashboard');
      return false;
    }
    return true;
  }

  if (isStudentArea) {
    if (!token || !user) {
      window.location.replace('/student/login');
      return false;
    }
    if (user.role !== 'student') {
      // Admin trying to access student dashboard
      window.location.replace('/admin/dashboard');
      return false;
    }
    return true;
  }

  // Other internal pages (e.g. sports.html, etc. when gated)
  if (!token || !user) {
    window.location.replace('/student/login');
    return false;
  }

  return true;
}

// Run gate check immediately
enforceCollegeGate();

