const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { verifyToken, requireAdmin, requireStudent } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', teamController.getAllTeams);
router.get('/rules', teamController.getSportRules);
router.get('/formed', teamController.getFormedTeams);
router.get('/eligible-players', verifyToken, requireAdmin, teamController.getEligiblePlayers);
router.post('/form-team', verifyToken, requireAdmin, teamController.formTeam);
router.get('/student-status', verifyToken, teamController.getStudentTeamStatus);
router.get('/my-teams', verifyToken, requireStudent, teamController.getMyTeams);
router.get('/:id/pdf-data', teamController.getTeamPdfData);
router.get('/:id', teamController.getTeamById);

router.post('/', verifyToken, requireAdmin, upload.single('logo'), teamController.createTeam);
router.put('/:id', verifyToken, requireAdmin, upload.single('logo'), teamController.updateTeam);
router.delete('/:id', verifyToken, requireAdmin, teamController.deleteTeam);

module.exports = router;
