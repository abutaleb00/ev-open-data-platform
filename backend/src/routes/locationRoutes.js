const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// 1. Secure all location routes (Requires a valid JWT token)
router.use(protect);

// 2. Route definitions
router.get('/', locationController.getAllLocations);

// Intercept file fields array with a threshold cap of 5 files maximum per submission query
router.post('/', upload.array('images', 5), locationController.createLocation);
router.put('/:id', upload.array('images', 5), locationController.updateLocation);
router.delete('/media/:mediaId', locationController.deleteLocationImage);
router.delete('/:id', locationController.deleteLocation);

module.exports = router;