const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// 1. Check if the user is logged in (valid JWT)
router.use(protect);

// 2. Check if the logged-in user is specifically a SUPER_ADMIN
router.use(restrictTo('SUPER_ADMIN'));

// Defensive Check: Ensure controller functions are defined before mounting to route paths
// This prevents silent undefined crashes if there are minor spelling typos in your controller file
const requiredMethods = [
    'getPendingSubmissions',
    'moderateLocation',
    'moderateChargePoint',
    'getMainMaintenanceSettings',
    'updateMaintenanceSettings',
    'toggleUserActivation' // <-- Added new activation method to safety tracking array
];

requiredMethods.forEach(method => {
    if (typeof moderationController[method] !== 'function') {
        console.error(`\x1b[31m[CRITICAL ROUTE ERROR] moderationController.${method} is undefined. Check your spelling or exports in moderationController.js!\x1b[0m`);
    }
});

// 3. Secured Operational Moderation Routes
if (moderationController.getPendingSubmissions) {
    router.get('/submissions', moderationController.getPendingSubmissions);
}
if (moderationController.moderateLocation) {
    router.patch('/locations/:id/moderate', moderationController.moderateLocation);
}
if (moderationController.moderateChargePoint) {
    router.patch('/charge-points/:id/moderate', moderationController.moderateChargePoint);
}

// --- SYSTEM CONFIGURATION & MAINTENANCE LEVERS ---
if (moderationController.getMainMaintenanceSettings) {
    router.get('/maintenance', moderationController.getMainMaintenanceSettings);
}
if (moderationController.updateMaintenanceSettings) {
    router.post('/maintenance', moderationController.updateMaintenanceSettings);
}

// --- NEW: TENANT OPERATIONS & USER MODERATION OVERRIDES ---
if (moderationController.toggleUserActivation) {
    router.patch('/users/:userId/activation', moderationController.toggleUserActivation);
}

module.exports = router;