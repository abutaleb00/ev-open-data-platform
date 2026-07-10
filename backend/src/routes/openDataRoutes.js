const express = require('express');
const router = express.Router();
const openDataController = require('../controllers/openDataController');
const { protect } = require('../middlewares/authMiddleware');
const { checkLocationsGate, checkTariffsGate } = require('../middlewares/maintenanceInterceptor');

// --- PUBLIC UNSECURED DATA OPEN STREAMS ---
// Feeds are completely open to third-party endpoints and consumer map clients
router.get('/feed', checkLocationsGate, openDataController.getPublicFeed);
router.get('/tariffs', checkTariffsGate, openDataController.getPublicTariffs);

// --- SECURED INTERNAL COMPANY DASHBOARD PREVIEWS ---
// Automatically isolates data visibility according to the user's active login token context
router.get('/preview/feed', protect, openDataController.getDashboardFeedPreview);
router.get('/preview/tariffs', protect, openDataController.getDashboardTariffsPreview);

// --- PRIVATE DEVELOPER CREDENTIAL MANAGEMENT ---
router.get('/keys', protect, openDataController.getCompanyKeys);
router.post('/keys', protect, openDataController.generateApiKey);

module.exports = router;