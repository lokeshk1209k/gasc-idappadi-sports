const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { verifyToken, requireAdmin, requireStudent } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', achievementController.getAllAchievements);
router.get('/my-achievements', verifyToken, requireStudent, achievementController.getMyAchievements);
router.get('/:id', achievementController.getAchievementById);

router.post(
  '/',
  verifyToken,
  requireAdmin,
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'certificate', maxCount: 1 }
  ]),
  achievementController.createAchievement
);

router.put(
  '/:id',
  verifyToken,
  requireAdmin,
  upload.single('photo'),
  achievementController.updateAchievement
);

router.delete('/:id', verifyToken, requireAdmin, achievementController.deleteAchievement);

module.exports = router;
