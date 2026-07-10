const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middlewares/authMiddleware'); // Ensure your auth middleware is applied

// Secure this route so only logged-in users can see their analytics
router.use(protect);

router.get('/overview', analyticsController.getOverviewStats);

module.exports = router;