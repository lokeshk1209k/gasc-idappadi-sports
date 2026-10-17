const express = require('express');
const router = express.Router();
const cmTrophyController = require('../controllers/cmTrophyController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public / Student Read Routes (Optional token to detect admin role)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyToken(req, res, next);
  }
  next();
};

router.get('/', optionalAuth, cmTrophyController.getAllAnnouncements);
router.get('/:id', optionalAuth, cmTrophyController.getAnnouncementById);

// Admin Management Routes
router.post('/', verifyToken, requireAdmin, cmTrophyController.createAnnouncement);
router.put('/:id', verifyToken, requireAdmin, cmTrophyController.updateAnnouncement);
router.patch('/:id/publish', verifyToken, requireAdmin, cmTrophyController.publishAnnouncement);
router.patch('/:id/archive', verifyToken, requireAdmin, cmTrophyController.archiveAnnouncement);
router.delete('/:id', verifyToken, requireAdmin, cmTrophyController.deleteAnnouncement);

module.exports = router;
