const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', settingsController.getSettings);
router.put('/', verifyToken, requireAdmin, upload.single('profilePhoto'), settingsController.updateSettings);
router.post('/upload-photo', verifyToken, requireAdmin, upload.single('profilePhoto'), settingsController.uploadPhoto);

module.exports = router;
