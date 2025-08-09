const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, deviceController.getAllDevices);
router.get('/:deviceId', authenticateToken, deviceController.getDeviceById);
router.get('/status/:deviceId', authenticateToken, deviceController.checkDeviceStatus);

module.exports = router;