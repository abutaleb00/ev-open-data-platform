const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// 1. Secure all company management boundaries globally via JWT guard
router.use(protect);

// 2. Route definitions mapping explicit roles limits

// --- SELF-SERVICE CPO ENDPOINT ---
// Infers company identity from the user's active session token payload data
router.put('/profile', restrictTo('COMPANY_ADMIN', 'SUPER_ADMIN'), companyController.updateMyCompany);

// --- GLOBAL ADMINISTRATIVE ENDPOINTS ---
router.get('/', companyController.getAllCompanies); // Shared read route access boundary

// Restrict high-level mutations exclusively to Platform Super Administrators
router.post('/', restrictTo('SUPER_ADMIN'), companyController.createCompany);
router.put('/:id', restrictTo('SUPER_ADMIN'), companyController.updateCompany);
router.delete('/:id', restrictTo('SUPER_ADMIN'), companyController.deleteCompany);

module.exports = router;