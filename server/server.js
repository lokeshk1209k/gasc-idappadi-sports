const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');

// Supabase Configuration & Auto-seeder
const { isSupabaseConfigured, supabase } = require('./config/supabase');
const seedSupabase = require('./utils/seedSupabase');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const playerRoutes = require('./routes/playerRoutes');
const sportRoutes = require('./routes/sportRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const teamRoutes = require('./routes/teamRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const practiceRoutes = require('./routes/practiceRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const supabaseRoutes = require('./routes/supabaseRoutes');
const externalCompetitionRoutes = require('./routes/externalCompetitionRoutes');
const sportsNewsRoutes = require('./routes/sportsNewsRoutes');
const interCollegeRoutes = require('./routes/interCollegeRoutes');
let compression;
try {
  compression = require('compression');
} catch (e) {
  // Compression is optional for offline/portable environments
}
const { apiCache } = require('./middleware/cacheMiddleware');

const app = express();

// Enable Gzip Compression for 10,000+ concurrent users if available
if (compression) {
  app.use(compression());
}

// Initialize local SQLite database for offline-first operation
try {
  const localDB = require('./database/localDB');
  localDB.initDB();
  console.log('[Server] ✅ Local SQLite DB ready for offline operation.');
} catch (e) {
  console.warn('[Server] ⚠️  Local SQLite init warning:', e.message);
}

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP caching strategy for high concurrency (10,000 users peak load)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
  } else if (req.path.match(/\.(woff2?|ttf|eot)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (req.path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
  next();
});

// Ensure upload directory exists
const clientPublic = path.join(__dirname, '../client/public');
const uploadDir = path.join(clientPublic, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================================
// 🏛️ CLEAN PORTAL ROUTES (STUDENT & SPORTS INCHARGE / ADMIN)
// ============================================================

const studentPublic = fs.existsSync(path.join(__dirname, '../dist/index.html'))
  ? path.join(__dirname, '../dist')
  : path.join(__dirname, '../student-client/dist');

// 1. Static Assets (Must come before route matchers so images, css, and js always resolve)
app.use('/images', express.static(path.join(clientPublic, 'images')));
app.use('/images', express.static(path.join(studentPublic, 'images')));
app.use('/admin/images', express.static(path.join(clientPublic, 'images')));
app.use('/admin/vendor', express.static(path.join(clientPublic, 'vendor')));
app.use('/vendor', express.static(path.join(clientPublic, 'vendor')));
app.use('/admin/css', express.static(path.join(clientPublic, 'css')));
app.use('/admin/js', express.static(path.join(clientPublic, 'js')));
app.use('/css', express.static(path.join(clientPublic, 'css')));
// 1. Live Dynamic API Routes (High Priority - Always Handled By Controllers)
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/sports', sportRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/notifications', apiCache(10), notificationRoutes);
app.use('/api/gallery', apiCache(30), galleryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/supabase', supabaseRoutes);
app.use('/api/external-competitions', externalCompetitionRoutes);
app.use('/api/sports-news', apiCache(60), sportsNewsRoutes);
app.use('/api/inter-college', interCollegeRoutes);

// 2. Static Assets & File Hosting
app.use('/css', express.static(path.join(clientPublic, 'css')));
app.use('/vendor', express.static(path.join(clientPublic, 'vendor')));
app.use('/images', express.static(path.join(clientPublic, 'images')));
app.use('/js', express.static(path.join(clientPublic, 'js')));
app.use('/assets', express.static(path.join(studentPublic, 'assets')));
app.use('/uploads', express.static(uploadDir));
app.use(express.static(studentPublic));
app.use(express.static(clientPublic));
app.use('/admin', express.static(clientPublic));

// 3. Student Portal Routes & Public Inter-College QR Routes (React + Vite SPA)
// Root / and public routes directly load the React Student Portal
app.get(['/', '/index.html', '/student', '/student/*', '/student-portal', '/cyber-portal', '/inter-college', '/inter-college/*'], (req, res) => {
  if (fs.existsSync(path.join(studentPublic, 'index.html'))) {
    return res.sendFile(path.join(studentPublic, 'index.html'));
  }
  res.sendFile(path.join(clientPublic, 'admin-login.html'));
});

// 4. Sports Incharge / Admin Portal Routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(clientPublic, 'admin-login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(clientPublic, 'admin-dashboard.html'));
});
app.get(['/admin', '/admin/'], (req, res) => {
  res.redirect('/admin/dashboard');
});
app.get('/admin/:section', (req, res, next) => {
  if (req.params.section.includes('.') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(clientPublic, 'admin-dashboard.html'));
});

// 5. Legacy Redirects for seamless backward compatibility
app.get('/login.html', (req, res) => {
  if (req.query.role === 'admin') {
    return res.redirect('/admin/login');
  }
  res.redirect('/student/login');
});
app.get('/register.html', (req, res) => {
  res.redirect('/student/register');
});
app.get('/admin.html', (req, res) => {
  res.redirect('/admin/login');
});
app.get('/student.html', (req, res) => {
  res.redirect('/student/login');
});

// Instant Health check (0ms response, does not hang on remote cloud)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    college: 'Government Arts and Science College, Idappadi',
    port: activeServer && activeServer.address() ? activeServer.address().port : 5000,
    timestamp: new Date()
  });
});

// Catch-all route for React SPA routes (/student/*, /student/login, /student/dashboard, etc.)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/uploads') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(studentPublic, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;

let activeServer = null;
const readyCallbacks = [];

const notifyReady = (port) => {
  while (readyCallbacks.length) {
    const cb = readyCallbacks.shift();
    try { cb(port); } catch(e) {}
  }
};

// Resilient port listener (auto-switches to next port if busy)
const listenOnPort = (port) => {
  const server = app.listen(port, '0.0.0.0', () => {
    activeServer = server;
    console.log('\n===============================================================');
    console.log('🏆 GASC IDAPPADI — SMART SPORTS MANAGEMENT SYSTEM');
    console.log('🏛️ Government Arts and Science College, Idappadi');
    console.log('---------------------------------------------------------------');
    console.log(`🚀 Server running on: http://localhost:${port}`);
    console.log(`🌐 Public Website:    http://localhost:${port}/index.html`);
    console.log(`⚡ Database Mode:     Local Store Ready + Supabase Sync Engine`);
    console.log('---------------------------------------------------------------');
    console.log('Demo Credentials for Viva / Presentation:');
    console.log('  Admin (Sports Incharge):       admin / admin123');
    console.log('  Student Player:                23UGCS101 / student123');
    console.log('===============================================================\n');
    notifyReady(port);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`⚠️  Port ${port} is currently in use. Automatically switching to http://localhost:${nextPort}...`);
      listenOnPort(nextPort);
    } else {
      console.error('Server error:', err.message);
    }
  });
};

// Start Server (Instant non-blocking startup)
const startServer = async () => {
  listenOnPort(DEFAULT_PORT);
  if (isSupabaseConfigured()) {
    // Background seed test without blocking express startup
    setTimeout(async () => {
      try {
        await seedSupabase(false);
      } catch (err) {
        console.warn('Background seed notice:', err.message);
      }
    }, 1500);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = {
  app,
  startServer,
  getHttpServer: () => activeServer,
  getActivePort: () => (activeServer && activeServer.address && activeServer.address() ? activeServer.address().port : null),
  whenReady: (cb) => {
    const p = activeServer && activeServer.address && activeServer.address() ? activeServer.address().port : null;
    if (p) return cb(p);
    readyCallbacks.push(cb);
  }
};
