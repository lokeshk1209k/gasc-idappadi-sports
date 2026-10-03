const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', verifyToken, requireAdmin, upload.single('file'), rosterController.uploadExcelRoster);
router.get('/', verifyToken, requireAdmin, rosterController.getRosterStudents);
router.get('/template', verifyToken, requireAdmin, rosterController.downloadTemplate);
router.post('/manual', verifyToken, requireAdmin, rosterController.addSingleStudent);
router.put('/:id', verifyToken, requireAdmin, rosterController.updateStudent);
router.delete('/:id', verifyToken, requireAdmin, rosterController.deleteStudent);

module.exports = router;
