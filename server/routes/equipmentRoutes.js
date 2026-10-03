const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipmentController');
const { verifyToken, requireAdmin, requireStudent } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', equipmentController.getAllEquipment);
router.get('/lookup-student/:regNo', equipmentController.lookupStudent);
router.get('/transactions', verifyToken, equipmentController.getAllTransactions);
router.get('/my-equipment', equipmentController.getMyEquipment);
router.get('/:id', verifyToken, equipmentController.getEquipmentById);

router.post('/', verifyToken, requireAdmin, upload.single('image'), equipmentController.createEquipment);
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), equipmentController.updateEquipment);
router.delete('/:id', verifyToken, requireAdmin, equipmentController.deleteEquipment);

router.post('/issue', verifyToken, requireAdmin, equipmentController.issueEquipment);
router.post('/return', verifyToken, requireAdmin, equipmentController.returnEquipment);

module.exports = router;
