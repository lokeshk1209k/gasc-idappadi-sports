const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, requireAdmin, requireStudent } = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, requireAdmin, analyticsController.getAdminDashboardData);
router.get('/charts', verifyToken, requireAdmin, analyticsController.getChartData);
router.get('/registrations', verifyToken, requireAdmin, analyticsController.getRegistrationAnalytics);
router.get('/student-dashboard', verifyToken, requireStudent, analyticsController.getStudentDashboardData);

module.exports = router;
