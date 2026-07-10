const express = require('express');
const router = express.Router();
const chargePointController = require('../controllers/chargePointController');
const { protect } = require('../middlewares/authMiddleware'); // <-- Make sure this is imported

// MOUNT PROTECTION HERE: All routes below this line will have req.user populated
router.use(protect); 

router.get('/', chargePointController.getAllChargePoints);
router.post('/', chargePointController.createChargePoint);
router.put('/:id', chargePointController.updateChargePoint);
router.delete('/:id', chargePointController.deleteChargePoint);

module.exports = router;