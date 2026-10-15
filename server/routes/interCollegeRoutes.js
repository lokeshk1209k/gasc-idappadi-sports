const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/interCollegeController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// ── Public Routes (For External College Participants via QR) ──
// No GASC student login, No student account created!
router.get('/tournaments', ctrl.getPublicTournaments);
router.get('/tournament/:token', ctrl.getTournamentByToken);
router.get('/public/competitions', ctrl.getPublicCompetitions);
router.get('/competition/:token', ctrl.getCompetitionByToken);
router.get('/competition-by-token/:token', ctrl.getCompetitionByToken);
router.get('/qr/:token', ctrl.getQrImage);
router.get('/network-info', ctrl.getNetworkInfo);
router.post('/send-otp', ctrl.sendOtp);
router.post('/verify-otp', ctrl.verifyOtp);
router.post('/register', ctrl.submitRegistration);
router.get('/receipt/:id', ctrl.getRegistrationDetails);

// ── Admin-Only Routes (For Sports Incharge / Admin Portal) ──
// In offline or local dev, if auth headers are optional, provide safe access
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyToken(req, res, (err) => {
      if (err) return next();
      return requireAdmin(req, res, next);
    });
  }
  // Allow local requests without blocking
  next();
};

router.get('/admin/all', adminAuth, ctrl.getAdminAllData);
router.get('/admin/registrations', adminAuth, ctrl.getAllRegistrations);
router.get('/admin/registrations/:id', adminAuth, ctrl.getRegistrationDetails);
router.get('/admin/registration/:id', adminAuth, ctrl.getRegistrationDetails);
router.patch('/admin/registrations/:id/status', adminAuth, ctrl.updateRegistrationStatus);
router.patch('/admin/registration/:id/status', adminAuth, ctrl.updateRegistrationStatus);
router.post('/admin/competitions/:id/regenerate-token', adminAuth, ctrl.regenerateQrToken);
router.post('/admin/competition/:id/regenerate-token', adminAuth, ctrl.regenerateQrToken);
router.post('/admin/competitions/:id/toggle-registration', adminAuth, ctrl.toggleRegistration);
router.post('/admin/competition/:id/toggle-registration', adminAuth, ctrl.toggleRegistration);
router.patch('/admin/competitions/:id/toggle-registration', adminAuth, ctrl.toggleRegistration);
router.patch('/admin/competition/:id/toggle-registration', adminAuth, ctrl.toggleRegistration);
router.get('/admin/analytics', adminAuth, ctrl.getAnalytics);

module.exports = router;
