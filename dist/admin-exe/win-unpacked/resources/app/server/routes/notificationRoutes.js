const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyToken, notificationController.getMyNotifications);
router.get('/all', verifyToken, requireAdmin, notificationController.getAllNotifications);
router.post('/', verifyToken, requireAdmin, notificationController.createNotification);
router.patch('/:id/read', verifyToken, notificationController.markAsRead);
router.delete('/:id', verifyToken, requireAdmin, notificationController.deleteNotification);

module.exports = router;
