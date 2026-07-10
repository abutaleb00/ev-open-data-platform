const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/live', sessionController.getLiveSessions);
router.get('/transactions', sessionController.getTransactions);
router.post('/start', sessionController.startSession);
router.post('/:id/stop', sessionController.stopSession);
module.exports = router;