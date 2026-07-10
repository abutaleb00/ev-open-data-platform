const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { protect } = require('../middlewares/authMiddleware');

// Secure route so only logged-in users can view logs
router.use(protect);
router.get('/', auditController.getAuditLogs);

module.exports = router;