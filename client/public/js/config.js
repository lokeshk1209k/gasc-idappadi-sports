/**
 * GASC Idappadi Smart Sports Management System
 * Global Application & API Configuration
 * 
 * This file centralizes the backend API endpoint for:
 * 1. Web Browser (http://localhost:5000 or production domain)
 * 2. Student Android APK (packaged webview/capacitor app)
 * 3. Sports Incharge Admin Windows EXE (Electron desktop app)
 */

(function() {
  // =========================================================================
  // 🌐 PRODUCTION BACKEND CONFIGURATION
  // =========================================================================
  // Running locally / offline on college network
  const PRODUCTION_BACKEND_URL = '';

  // Determine current origin & environment
  const isHttpOrHttps = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  const isLocalhost = isHttpOrHttps && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  );
  const isPackagedApp = !isHttpOrHttps || window.location.protocol === 'file:' || window.location.protocol === 'capacitor:';

  // Resolve active backend base URL
  let resolvedBackendOrigin = '';

  if (isLocalhost) {
    // If running on local development server, use current host
    resolvedBackendOrigin = `${window.location.protocol}//${window.location.hostname}:${window.location.port || 5000}`;
  } else if (isHttpOrHttps) {
    // If running on a public website domain (e.g. Render or custom college domain), use current origin
    resolvedBackendOrigin = window.location.origin;
  } else if (isPackagedApp) {
    // For Desktop Electron app / local packaged app, default to local server http://localhost:5000
    resolvedBackendOrigin = 'http://localhost:5000';
  } else if (PRODUCTION_BACKEND_URL && PRODUCTION_BACKEND_URL.trim() !== '') {
    resolvedBackendOrigin = PRODUCTION_BACKEND_URL.replace(/\/+$/, '');
  } else {
    resolvedBackendOrigin = 'http://localhost:5000';
  }

  // Define global config object
  window.GASC_CONFIG = {
    PRODUCTION_BACKEND_URL: PRODUCTION_BACKEND_URL,
    PUBLIC_STUDENT_PORTAL_URL: 'https://gasc-student-portal.vercel.app',
    BACKEND_ORIGIN: resolvedBackendOrigin,
    API_BASE_URL: `${resolvedBackendOrigin}/api`,
    IS_PACKAGED_APP: isPackagedApp,
    IS_LOCALHOST: isLocalhost,

    /**
     * Resolves an API endpoint cleanly
     * @param {string} endpoint e.g. '/auth/login' or 'auth/login'
     * @returns {string} full API URL
     */
    getApiUrl: function(endpoint) {
      if (!endpoint) return this.API_BASE_URL;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `${this.API_BASE_URL}${cleanEndpoint}`;
    },

    /**
     * Resolves an asset / upload URL cleanly
     * @param {string} relativePath e.g. '/uploads/avatar.jpg'
     * @returns {string} full URL
     */
    getAssetUrl: function(relativePath) {
      if (!relativePath) return '';
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
      }
      const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
      return `${this.BACKEND_ORIGIN}${cleanPath}`;
    },

    /**
     * Sets the production backend URL dynamically (useful for testing)
     */
    setProductionBackendUrl: function(url) {
      if (!url) return;
      localStorage.setItem('gasc_production_api_url', url);
      window.location.reload();
    }
  };

  // Check if an override URL was saved in localStorage for testing (only in packaged offline apps)
  if (isPackagedApp) {
    try {
      const savedUrl = localStorage.getItem('gasc_production_api_url');
      if (savedUrl && savedUrl.trim() !== '') {
        window.GASC_CONFIG.BACKEND_ORIGIN = savedUrl.replace(/\/+$/, '');
        window.GASC_CONFIG.API_BASE_URL = `${window.GASC_CONFIG.BACKEND_ORIGIN}/api`;
      }
    } catch (e) {
      // Ignore localStorage access restriction if any
    }
  }

  window.normalizeSportName = function(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  // Centralized Source of Truth for Sport Images (Lightweight & Instant Loading)
  window.SPORT_IMAGES = {
    badminton: '/images/sports/badminton.jpg',
    kabaddi: '/images/sports/kabaddi.jpg',
    boxing: '/images/sports/boxing.jpg',
    cricket: '/images/sports/cricket.jpg',
    football: '/images/sports/football.jpg',
    volleyball: '/images/sports/volleyball.jpg',
    basketball: '/images/sports/basketball.jpg',
    chess: '/images/sports/chess.jpg',
    running: '/images/sports/running.jpg',
    athletics: '/images/sports/running.jpg',
    carrom: '/images/sports/carrom.jpg',
    table_tennis: '/images/sports/table_tennis.jpg',
    hockey: '/images/sports/hockey.jpg',
    kho_kho: '/images/sports/kho_kho.jpg',
    tennis: '/images/sports/tennis.jpg',
    handball: '/images/sports/handball.jpg',
    throwball: '/images/sports/throwball.jpg',
    relay: '/images/sports/relay.jpg',
    long_jump: '/images/sports/long_jump.jpg',
    high_jump: '/images/sports/high_jump.jpg',
    triple_jump: '/images/sports/triple_jump.jpg',
    shot_put: '/images/sports/shot_put.jpg',
    discus_throw: '/images/sports/discus_throw.jpg',
    javelin_throw: '/images/sports/javelin_throw.jpg',
    marathon: '/images/sports/marathon.jpg',
    half_marathon: '/images/sports/half_marathon.jpg',
    wrestling: '/images/sports/wrestling.jpg',
    karate: '/images/sports/karate.jpg',
    kickboxing: '/images/sports/kickboxing.jpg',
    silambam: '/images/sports/silambam.jpg',
    tournament: '/images/sports/tournament.jpg'
  };

  window.getSportImage = function(sportName, explicitUrl) {
    if (
      explicitUrl &&
      explicitUrl.includes('/uploads/') &&
      !explicitUrl.includes('tournament') &&
      explicitUrl !== 'null' &&
      explicitUrl !== 'undefined'
    ) {
      return explicitUrl;
    }

    const slug = window.normalizeSportName(sportName);
    if (window.SPORT_IMAGES[slug]) {
      return window.SPORT_IMAGES[slug];
    }

    if (slug.includes('badminton')) return window.SPORT_IMAGES.badminton;
    if (slug.includes('kabaddi')) return window.SPORT_IMAGES.kabaddi;
    if (slug.includes('boxing')) return window.SPORT_IMAGES.boxing;
    if (slug.includes('cricket')) return window.SPORT_IMAGES.cricket;
    if (slug.includes('football')) return window.SPORT_IMAGES.football;
    if (slug.includes('volleyball')) return window.SPORT_IMAGES.volleyball;
    if (slug.includes('basketball')) return window.SPORT_IMAGES.basketball;
    if (slug.includes('chess')) return window.SPORT_IMAGES.chess;
    if (slug.includes('running') || slug.includes('athletics')) return window.SPORT_IMAGES.running;

    if (slug) return '/images/sports/' + slug + '.jpg';

    return '/images/sports/running.jpg';
  };

  /**
   * Equipment Icon & Emoji Resolver
   * Resolves crisp emoji badges for sports equipment items (no broken photos)
   */
  window.getEquipmentEmoji = function(name, category, sportName) {
    const text = ` ${name || ''} ${category || ''} ${sportName || ''} `.toLowerCase();
    
    // 1. Table Tennis first before tennis / general racket
    if (text.includes('table tennis') || text.includes(' tt ') || text.includes('ping pong')) {
      return { emoji: '🏓', bg: '#ffedd5', color: '#c2410c' };
    }
    // 2. Badminton before general racket
    if (text.includes('badminton') || text.includes('shuttle') || text.includes('racket') || text.includes('racquet')) {
      return { emoji: '🏸', bg: '#d1fae5', color: '#047857' };
    }
    // 3. Carrom
    if (text.includes('carrom') || text.includes('striker') || text.includes('carrom coin')) {
      return { emoji: '🎯', bg: '#fef3c7', color: '#b45309' };
    }
    // 4. Chess
    if (text.includes('chess')) {
      return { emoji: '♟️', bg: '#f3e8ff', color: '#7e22ce' };
    }
    // 5. Cricket (bounded 'bat' to avoid 'baton')
    if (text.includes('cricket') || text.includes(' bat ') || text.includes(' bats ') || text.includes('wicket') || text.includes('stump')) {
      return { emoji: '🏏', bg: '#e0f2fe', color: '#0369a1' };
    }
    // 6. Volleyball
    if (text.includes('volleyball') || text.includes('volley')) {
      return { emoji: '🏐', bg: '#e0e7ff', color: '#4338ca' };
    }
    // 7. Football
    if (text.includes('football') || text.includes('soccer')) {
      return { emoji: '⚽', bg: '#f1f5f9', color: '#0f172a' };
    }
    // 8. Basketball
    if (text.includes('basketball')) {
      return { emoji: '🏀', bg: '#ffedd5', color: '#ea580c' };
    }
    // 9. Tennis
    if (text.includes('tennis')) {
      return { emoji: '🎾', bg: '#ecfccb', color: '#4d7c0f' };
    }
    // 10. Hockey
    if (text.includes('hockey')) {
      return { emoji: '🏑', bg: '#fef2f2', color: '#b91c1c' };
    }
    // 11. Kabaddi
    if (text.includes('kabaddi') || text.includes('wrestling')) {
      return { emoji: '🤼', bg: '#fdf2f8', color: '#be185d' };
    }
    // 12. Handball
    if (text.includes('handball')) {
      return { emoji: '🤾', bg: '#ede9fe', color: '#6d28d9' };
    }
    // 13. Discus
    if (text.includes('discus')) {
      return { emoji: '🥏', bg: '#e0f2fe', color: '#0284c7' };
    }
    // 14. Athletics, relay baton, javelin, shot put
    if (text.includes('baton') || text.includes('relay') || text.includes('javelin') || text.includes('shot put') || text.includes('athletic') || text.includes('track') || text.includes('running')) {
      return { emoji: '🏃', bg: '#e0f2fe', color: '#0284c7' };
    }
    // 15. Fitness & weights
    if (text.includes('fitness') || text.includes('gym') || text.includes('dumbbell') || text.includes('weight') || text.includes('barbell')) {
      return { emoji: '🏋️', bg: '#fee2e2', color: '#dc2626' };
    }
    // 16. Skipping rope
    if (text.includes('skipping') || text.includes('rope')) {
      return { emoji: '🪢', bg: '#fef3c7', color: '#b45309' };
    }
    // 17. Nets
    if (text.includes('net') || text.includes('post') || text.includes('goal')) {
      return { emoji: '🥅', bg: '#f0fdf4', color: '#15803d' };
    }
    // 18. Cones & markers
    if (text.includes('cone') || text.includes('marker') || text.includes('agility')) {
      return { emoji: '🛑', bg: '#fff7ed', color: '#c2410c' };
    }
    // 19. Stopwatches
    if (text.includes('whistle') || text.includes('stopwatch') || text.includes('timer')) {
      return { emoji: '⏱️', bg: '#f0fdfa', color: '#0f766e' };
    }
    // 20. Uniforms & bibs
    if (text.includes('jersey') || text.includes('bib') || text.includes('dress') || text.includes('uniform')) {
      return { emoji: '🎽', bg: '#eff6ff', color: '#1d4ed8' };
    }
    // 21. First aid
    if (text.includes('first aid') || text.includes('medical') || text.includes('kit') || text.includes('bandage')) {
      return { emoji: '🩹', bg: '#fff1f2', color: '#e11d48' };
    }
    // 22. Board games
    if (text.includes('board')) {
      return { emoji: '🎲', bg: '#fefce8', color: '#a16207' };
    }
    // 23. General ball
    if (text.includes('ball')) {
      return { emoji: '⚽', bg: '#f8fafc', color: '#334155' };
    }

    return { emoji: '📦', bg: '#f1f5f9', color: '#475569' };
  };

  window.getEquipmentEmojiBadge = function(name, category, sportName, size = 36, fontSize = 20) {
    const item = window.getEquipmentEmoji(name, category, sportName);
    return `<div class="d-inline-flex align-items-center justify-content-center rounded-3 shadow-sm flex-shrink-0" style="width:${size}px; height:${size}px; background-color:${item.bg}; border: 1px solid rgba(0,0,0,0.08); font-size:${fontSize}px; line-height:1; user-select:none;" title="${name || 'Equipment'}">${item.emoji}</div>`;
  };
})();
