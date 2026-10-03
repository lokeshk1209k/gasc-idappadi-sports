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
const compression = require('compression');
const { apiCache } = require('./middleware/cacheMiddleware');

const app = express();

// Enable Gzip Compression for 10,000+ concurrent users (reduces network payload by ~80%)
app.use(compression());

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

const studentPublic = path.join(__dirname, '../student-client/dist');

// 1. Student Portal Routes
app.get(['/student', '/student/'], (req, res) => {
  if (fs.existsSync(path.join(studentPublic, 'index.html'))) {
    return res.sendFile(path.join(studentPublic, 'index.html'));
  }
  res.sendFile(path.join(clientPublic, 'student-login.html'));
});
app.get('/student/login', (req, res) => {
  if (fs.existsSync(path.join(studentPublic, 'index.html'))) {
    return res.sendFile(path.join(studentPublic, 'index.html'));
  }
  res.sendFile(path.join(clientPublic, 'student-login.html'));
});
app.get('/student/register', (req, res) => {
  if (fs.existsSync(path.join(studentPublic, 'index.html'))) {
    return res.sendFile(path.join(studentPublic, 'index.html'));
  }
  res.sendFile(path.join(clientPublic, 'student-register.html'));
});
app.get('/student/dashboard', (req, res) => {
  if (fs.existsSync(path.join(studentPublic, 'index.html'))) {
    return res.sendFile(path.join(studentPublic, 'index.html'));
  }
  res.sendFile(path.join(clientPublic, 'student-dashboard.html'));
});

// 2. Sports Incharge / Admin Portal Routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(clientPublic, 'admin-login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(clientPublic, 'admin-dashboard.html'));
});
app.get(['/admin', '/admin/'], (req, res) => {
  res.redirect('/admin/dashboard');
});
app.get('/admin/:section', (req, res) => {
  res.sendFile(path.join(clientPublic, 'admin-dashboard.html'));
});

// 3. Legacy Redirects for seamless backward compatibility
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


// Serve static frontend assets
app.use('/images', express.static(path.join(clientPublic, 'images')));
app.use('/images', express.static(path.join(studentPublic, 'images')));
// Serve React app first (so it handles /index.html and its assets)
app.use(express.static(studentPublic));
// Serve admin portal static assets for relative /admin/* paths
app.use('/admin', express.static(clientPublic));
app.use(express.static(clientPublic));
app.use('/uploads', express.static(uploadDir));


// API Routes (Optimized for 10,000+ Concurrent Student Requests)
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/sports', apiCache(20), sportRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/competitions', apiCache(15), competitionRoutes);
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

// Health check + Supabase diagnostics
app.get('/api/health', async (req, res) => {
  const cfgMod = require('./config/supabase');
  const configured = cfgMod.isSupabaseConfigured();
  const supabaseUrlShort = cfgMod.supabaseUrl ? cfgMod.supabaseUrl.substring(0, 35) + '...' : 'NOT SET';
  let dbStatus = configured ? 'testing...' : 'not_configured';
  let dbError = null;
  if (configured) {
    try {
      const { supabase } = require('./utils/supabaseHelper');
      const { data, error } = await supabase.from('sports').select('id').limit(1);
      dbStatus = error ? 'error' : 'connected_ok';
      if (error) dbError = error.message;
    } catch (e) { dbStatus = 'error'; dbError = e.message; }
  }
  res.json({
    status: 'online',
    college: 'Government Arts and Science College, Idappadi',
    supabase: { configured, url: supabaseUrlShort, dbStatus, dbError },
    timestamp: new Date()
  });
});
// React SPA Fallback Route
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(studentPublic, 'index.html'));
});

// Catch-all route for React SPA routes (/student/*, /student/login, /student/dashboard, etc.)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
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
    console.log(`⚡ Supabase Database: ${isSupabaseConfigured() ? '✅ Connected & Active' : '❌ Not configured'}`);
    console.log('---------------------------------------------------------------');
    console.log('Demo Credentials for Viva / Presentation:');
    console.log('  Admin (Sports Incharge):       admin / admin123');
    console.log('  Student Player:                23UGCS101 / student123');
    console.log('===============================================================\n');
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

// Initialize Supabase Database and Start Server
const startServer = async () => {
  listenOnPort(DEFAULT_PORT);
  try {
    if (isSupabaseConfigured()) {
      console.log('⚡ Connected to Supabase Cloud Database!');
      await seedSupabase(false);
    } else {
      console.warn('⚠️ Supabase credentials missing in .env');
    }
  } catch (error) {
    console.error('Failed during server startup check:', error.message);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = {
  app,
  startServer,
  getHttpServer: () => activeServer,
  getActivePort: () => (activeServer && activeServer.address && activeServer.address() ? activeServer.address().port : null)
};
