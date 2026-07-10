const express = require('express');
const router = express.Router();
const connectorController = require('../controllers/connectorController');
const { protect } = require('../middlewares/authMiddleware');

// 1. Secure all connector routes (Requires a valid JWT token)
router.use(protect);

// 2. Route definitions
router.get('/', connectorController.getAllConnectors);
router.post('/', connectorController.createConnector);
router.put('/:id', connectorController.updateConnector);
router.delete('/:id', connectorController.deleteConnector);

module.exports = router;