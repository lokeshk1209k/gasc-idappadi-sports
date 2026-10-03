const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Tournament Registration Report (dedicated route before generic /:type)
router.get('/tournament-registrations', verifyToken, requireAdmin, reportController.getTournamentRegistrationReport);

router.get('/:type', verifyToken, requireAdmin, reportController.getReportData);

module.exports = router;
