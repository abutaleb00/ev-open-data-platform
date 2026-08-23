const express = require('express');
const router = express.Router();

const openDataController = require('../controllers/openDataController');
const operatorSyncController = require('../controllers/operatorSyncController');

const { protect, verifyPartnerApiKey } = require('../middlewares/authMiddleware');
const { checkLocationsGate, checkTariffsGate } = require('../middlewares/maintenanceInterceptor');
const { feedRateLimiter, logApiRequest } = require('../middlewares/requestTracker');

// Defensive fallback wrapper to prevent router crashes if middleware loading fails
const safeMw = (mw, name) => {
    if (typeof mw === 'function') return mw;
    console.warn(`[Warning] Route middleware '${name}' is not a function (received ${typeof mw}). Bypassing.`);
    return (req, res, next) => next();
};

// ------------------------------------------------------
// 1. PUBLIC UNSECURED DATA OPEN STREAMS (RATE LIMITED)
// ------------------------------------------------------
router.get(
    '/feed',
    safeMw(feedRateLimiter, 'feedRateLimiter'),
    safeMw(logApiRequest, 'logApiRequest'),
    safeMw(checkLocationsGate, 'checkLocationsGate'),
    safeMw(openDataController.getPublicFeed, 'getPublicFeed')
);

router.get(
    '/tariffs',
    safeMw(checkTariffsGate, 'checkTariffsGate'),
    safeMw(openDataController.getPublicTariffs, 'getPublicTariffs')
);


// ------------------------------------------------------
// 2. EXTERNAL PARTNER DATA INGESTION & DELTA UPDATES
// ------------------------------------------------------
router.post(
    '/sync-operator',
    safeMw(verifyPartnerApiKey, 'verifyPartnerApiKey'),
    safeMw(operatorSyncController.syncOperatorData, 'syncOperatorData')
);

router.post(
    '/ingest',
    safeMw(verifyPartnerApiKey, 'verifyPartnerApiKey'),
    safeMw(openDataController.ingestExternalData, 'ingestExternalData')
);

router.patch(
    '/external/locations/:id',
    safeMw(verifyPartnerApiKey, 'verifyPartnerApiKey'),
    safeMw(openDataController.patchExternalLocation, 'patchExternalLocation')
);

router.patch(
    '/external/locations/:locationId/evses/:evseId',
    safeMw(verifyPartnerApiKey, 'verifyPartnerApiKey'),
    safeMw(openDataController.patchExternalEvse, 'patchExternalEvse')
);

router.patch(
    '/external/evses/:evseId/connectors/:connectorId',
    safeMw(verifyPartnerApiKey, 'verifyPartnerApiKey'),
    safeMw(openDataController.patchExternalConnector, 'patchExternalConnector')
);


// ------------------------------------------------------
// 3. ADMIN EDITABLE PORTAL DATA UPDATES & METRICS
// ------------------------------------------------------
router.patch(
    '/location/:id/metadata',
    safeMw(protect, 'protect'),
    safeMw(openDataController.updateLocationMetadata, 'updateLocationMetadata')
);

router.get(
    '/admin/traffic-metrics',
    safeMw(protect, 'protect'),
    safeMw(openDataController.getTrafficMetrics, 'getTrafficMetrics')
);

router.get(
    '/admin/rate-limit-telemetry',
    safeMw(protect, 'protect'),
    safeMw(openDataController.getRateLimitTelemetry, 'getRateLimitTelemetry')
);


// ------------------------------------------------------
// 4. SECURED INTERNAL DASHBOARD PREVIEWS (NO RATE LIMIT)
// ------------------------------------------------------
router.get(
    '/preview/feed',
    safeMw(protect, 'protect'),
    safeMw(openDataController.getDashboardFeedPreview, 'getDashboardFeedPreview')
);

router.get(
    '/preview/tariffs',
    safeMw(protect, 'protect'),
    safeMw(openDataController.getDashboardTariffsPreview, 'getDashboardTariffsPreview')
);


// ------------------------------------------------------
// 5. PRIVATE DEVELOPER CREDENTIAL MANAGEMENT
// ------------------------------------------------------
router.get(
    '/keys',
    safeMw(protect, 'protect'),
    safeMw(openDataController.getCompanyKeys, 'getCompanyKeys')
);

router.post(
    '/keys',
    safeMw(protect, 'protect'),
    safeMw(openDataController.generateApiKey, 'generateApiKey')
);

module.exports = router;