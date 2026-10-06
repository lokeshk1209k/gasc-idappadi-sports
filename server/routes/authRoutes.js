const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/verify-student/:registerNumber', authController.verifyStudent);
router.get('/verify-student', authController.verifyStudent);
router.post('/send-otp', authController.sendRegistrationOtp);
router.post('/verify-otp', authController.verifyRegistrationOtp);
router.post('/register', upload.single('profilePhoto'), authController.registerStudent);
router.post('/forgot-password', authController.sendPasswordResetOtp);
router.post('/verify-reset-otp', authController.verifyPasswordResetOtp);
router.post('/reset-password', authController.resetPasswordWithOtp);
router.post('/login', authController.login);
router.post('/student-login', authController.studentLogin);
router.post('/admin-login', authController.adminLogin);
router.post('/admin-register', authController.adminRegister);
router.post('/offline-login', authController.offlineAdminLogin);
router.get('/sync-status', authController.getSyncStatus);
router.get('/me', verifyToken, authController.getMe);
router.put('/profile', verifyToken, upload.single('profilePhoto'), authController.updateProfile);
router.put('/change-password', verifyToken, authController.changePassword);
router.all('/session-token', authController.getSessionToken);

module.exports = router;


