const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sportsNewsController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public/Student - view published news
router.get('/', verifyToken, ctrl.getAll);
router.get('/:id', verifyToken, ctrl.getOne);

// Admin-only
router.post('/', verifyToken, requireAdmin, ctrl.create);
router.put('/:id', verifyToken, requireAdmin, ctrl.update);
router.delete('/:id', verifyToken, requireAdmin, ctrl.remove);
router.patch('/:id/publish', verifyToken, requireAdmin, ctrl.togglePublish);

module.exports = router;
