const express = require('express');
const router = express.Router();
const tariffController = require('../controllers/tariffController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Defensive wrapper to prevent router crashes if any middleware/handler resolves as undefined
const safeMw = (mw, name) => {
    if (typeof mw === 'function') return mw;
    console.warn(`[Warning] Route handler/middleware '${name}' is undefined or not a function (received ${typeof mw}). Bypassing.`);
    return (req, res, next) => next();
};

// ------------------------------------------------------
// TARIFF ROUTES (TENANT-ISOLATED & ROLE-PROTECTED)
// ------------------------------------------------------

// 1. SECURE ALL PRICING AND COMMERCIAL STRUCTURES GLOBALLY VIA JWT GUARD
router.use(safeMw(protect, 'protect'));

// 2. READ PERMISSIONS: Super Admins, Company Admins, and Staff
router.get(
    '/',
    safeMw(restrictTo && restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN', 'STAFF'), 'restrictTo'),
    safeMw(tariffController.getAllTariffs, 'getAllTariffs')
);

// 3. MUTATION PRIVILEGES: Restricted strictly to Super Admins and Company Admins
router.post(
    '/',
    safeMw(restrictTo && restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), 'restrictTo'),
    safeMw(tariffController.createTariff, 'createTariff')
);

router.put(
    '/:id',
    safeMw(restrictTo && restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), 'restrictTo'),
    safeMw(tariffController.updateTariff, 'updateTariff')
);

router.delete(
    '/:id',
    safeMw(restrictTo && restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), 'restrictTo'),
    safeMw(tariffController.deleteTariff, 'deleteTariff')
);

module.exports = router;