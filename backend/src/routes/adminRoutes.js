const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');

// Lock all admin endpoints strictly to Super Admins
router.use(protect);
router.use((req, res, next) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: "Access restricted to root platform instances." });
    }
    next();
});

// Platform Users & Company Moderation
router.get('/users', adminController.getAllUsers);
router.put('/companies/:id/status', adminController.updateCompanyStatus);
router.put('/users/:id/status', adminController.updateUserStatus);

// System Rate Limit Controls
router.get('/config/rate-limit', adminController.getRateLimitConfig);
router.put('/config/rate-limit', adminController.updateRateLimitConfig);

module.exports = router;