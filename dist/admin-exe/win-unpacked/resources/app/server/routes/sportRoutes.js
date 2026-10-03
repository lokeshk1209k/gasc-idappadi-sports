const express = require('express');
const router = express.Router();
const sportController = require('../controllers/sportController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', sportController.getAllSports);
router.get('/:id', sportController.getSportById);
router.post('/', verifyToken, requireAdmin, upload.single('image'), sportController.createSport);
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), sportController.updateSport);
router.delete('/:id', verifyToken, requireAdmin, sportController.deleteSport);

module.exports = router;
