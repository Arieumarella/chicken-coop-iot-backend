const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, readingController.getAllReadings); // Hati-hati dengan ini di produksi, bisa sangat banyak
router.get('/latest', authenticateToken, readingController.getLatestReadings);
router.get('/:deviceId', authenticateToken, readingController.getReadingsByDeviceId);

module.exports = router;