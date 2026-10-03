const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/externalCompetitionController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public routes (students & admin can view published)
router.get('/', verifyToken, ctrl.getAll);
router.get('/:id', verifyToken, ctrl.getOne);

// Admin-only routes
router.post('/', verifyToken, requireAdmin, ctrl.create);
router.put('/:id', verifyToken, requireAdmin, ctrl.update);
router.delete('/:id', verifyToken, requireAdmin, ctrl.remove);
router.patch('/:id/publish', verifyToken, requireAdmin, ctrl.togglePublish);
router.patch('/:id/status', verifyToken, requireAdmin, ctrl.updateStatus);

module.exports = router;
