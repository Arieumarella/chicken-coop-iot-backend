const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');

router.get('/', readingController.getAllReadings); // Hati-hati dengan ini di produksi, bisa sangat banyak
router.get('/latest', readingController.getLatestReadings);
router.get('/:deviceId', readingController.getReadingsByDeviceId);

module.exports = router;