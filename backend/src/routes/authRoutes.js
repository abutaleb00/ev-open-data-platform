const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Defensive Checking System
const requiredAuthMethods = ['registerCompanyAndAdmin', 'verifyEmailToken', 'login'];

requiredAuthMethods.forEach(method => {
    if (typeof authController[method] !== 'function') {
        console.error(`\x1b[31m[CRITICAL AUTH ROUTE ERROR] authController.${method} is undefined. Check your spelling or exports in authController.js!\x1b[0m`);
    }
});

// Mount Onboarding Routes Safely
if (authController.registerCompanyAndAdmin) {
    router.post('/register', authController.registerCompanyAndAdmin); // <-- Pointed to the correct name signature
}

if (authController.login) {
    router.post('/login', authController.login);
}

if (authController.verifyEmailToken) {
    router.get('/verify-email', authController.verifyEmailToken);
}

module.exports = router;