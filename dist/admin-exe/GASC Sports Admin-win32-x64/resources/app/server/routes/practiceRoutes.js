const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practiceController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', practiceController.getAllPracticeSessions);
router.get('/:id', practiceController.getPracticeSessionById);

router.post('/', verifyToken, requireAdmin, practiceController.createPracticeSession);
router.put('/:id', verifyToken, requireAdmin, practiceController.updatePracticeSession);
router.delete('/:id', verifyToken, requireAdmin, practiceController.deletePracticeSession);

module.exports = router;
