const express = require('express');
const router = express.Router();
const relayController = require('../controllers/relayController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, relayController.getAllRelays);
router.get('/:deviceId/:relayChannel', authenticateToken, relayController.getRelayByDeviceIdAndChannel);
router.post('/:deviceId/:relayChannel/control', authenticateToken, relayController.controlRelay); // Menggunakan POST untuk mengirim perintah

module.exports = router;