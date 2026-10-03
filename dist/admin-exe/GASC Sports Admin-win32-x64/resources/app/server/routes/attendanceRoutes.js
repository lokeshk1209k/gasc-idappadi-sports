const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, requireAdmin, requireStudent } = require('../middleware/authMiddleware');

router.post('/batch', verifyToken, requireAdmin, attendanceController.recordBatchAttendance);
router.get('/session/:id', verifyToken, attendanceController.getAttendanceBySession);
router.get('/my-stats', verifyToken, requireStudent, attendanceController.getMyAttendanceStats);

module.exports = router;
