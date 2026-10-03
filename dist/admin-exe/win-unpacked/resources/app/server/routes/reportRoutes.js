const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/:type', verifyToken, requireAdmin, reportController.getReportData);

module.exports = router;
