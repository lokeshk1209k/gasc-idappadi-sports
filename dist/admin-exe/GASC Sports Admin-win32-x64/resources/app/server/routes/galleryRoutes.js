const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', galleryController.getAllGallery);
router.post('/', verifyToken, requireAdmin, upload.single('image'), galleryController.createGalleryItem);
router.delete('/:id', verifyToken, requireAdmin, galleryController.deleteGalleryItem);

module.exports = router;
