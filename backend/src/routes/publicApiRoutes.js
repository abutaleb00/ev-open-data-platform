const express = require('express');
const router = express.Router();
const publicApiController = require('../controllers/publicApiController');

// NOTE: No auth middleware is applied here! This is open to the internet.
router.get('/dataset', publicApiController.getPublicDataset);

module.exports = router;