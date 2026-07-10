const express = require('express');
const router = express.Router();
const tariffController = require('../controllers/tariffController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Secure all pricing and commercial structures globally via JWT guard
router.use(protect);

// Read permissions map onto Super Admins, Company Managers, and general Technical Staff
router.get('/', restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN', 'STAFF'), tariffController.getAllTariffs);

// Write/Mutation privileges are restricted to Super Admins and Company Admins exclusively
router.post('/', restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), tariffController.createTariff);
router.put('/:id', restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), tariffController.updateTariff);
router.delete('/:id', restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'), tariffController.deleteTariff);

module.exports = router;