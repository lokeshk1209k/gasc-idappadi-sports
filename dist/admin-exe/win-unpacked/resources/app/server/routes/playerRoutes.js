const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', playerController.getAllPlayers);
router.get('/:id', verifyToken, playerController.getPlayerById);
router.put('/:id', verifyToken, requireAdmin, playerController.updatePlayer);
router.delete('/:id', verifyToken, requireAdmin, playerController.deletePlayer);

module.exports = router;
