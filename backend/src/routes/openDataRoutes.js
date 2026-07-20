const express = require('express');
const router = express.Router();
const openDataController = require('../controllers/openDataController');
const { protect, verifyPartnerApiKey } = require('../middlewares/authMiddleware');
const { checkLocationsGate, checkTariffsGate } = require('../middlewares/maintenanceInterceptor');

// ------------------------------------------------------
// 1. PUBLIC UNSECURED DATA OPEN STREAMS
// ------------------------------------------------------
// Feeds are completely open to third-party endpoints and consumer map clients
router.get('/feed', checkLocationsGate, openDataController.getPublicFeed);
router.get('/tariffs', checkTariffsGate, openDataController.getPublicTariffs);


// ------------------------------------------------------
// 2. EXTERNAL PARTNER DATA INGESTION & DELTA UPDATES
// ------------------------------------------------------
// Bulk Ingestion Endpoint (POST full location records from third-party backend)
router.post('/ingest', verifyPartnerApiKey, openDataController.ingestExternalData);

// Modular Delta/Partial Update Endpoints (PATCH specific changes by ID using x-api-key)
router.patch('/external/locations/:id', verifyPartnerApiKey, openDataController.patchExternalLocation);
router.patch('/external/locations/:locationId/evses/:evseId', verifyPartnerApiKey, openDataController.patchExternalEvse);
router.patch('/external/evses/:evseId/connectors/:connectorId', verifyPartnerApiKey, openDataController.patchExternalConnector);


// ------------------------------------------------------
// 3. ADMIN EDITABLE PORTAL DATA UPDATES
// ------------------------------------------------------
// Single API for Company Admins and Super Admins to fill in missing portal metadata
router.patch('/location/:id/metadata', protect, openDataController.updateLocationMetadata);


// ------------------------------------------------------
// 4. SECURED INTERNAL COMPANY DASHBOARD PREVIEWS
// ------------------------------------------------------
// Automatically isolates data visibility according to the user's active login token context
router.get('/preview/feed', protect, openDataController.getDashboardFeedPreview);
router.get('/preview/tariffs', protect, openDataController.getDashboardTariffsPreview);


// ------------------------------------------------------
// 5. PRIVATE DEVELOPER CREDENTIAL MANAGEMENT
// ------------------------------------------------------
router.get('/keys', protect, openDataController.getCompanyKeys);
router.post('/keys', protect, openDataController.generateApiKey);

module.exports = router;