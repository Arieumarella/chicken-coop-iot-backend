const express = require('express');
const router = express.Router();
const relayController = require('../controllers/relayController');

router.get('/', relayController.getAllRelays);
router.get('/:deviceId/:relayChannel', relayController.getRelayByDeviceIdAndChannel);
router.post('/:deviceId/:relayChannel/control', relayController.controlRelay); // Menggunakan POST untuk mengirim perintah

module.exports = router;