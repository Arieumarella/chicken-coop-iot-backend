const express = require('express');
const router = express.Router();
const relayScheduleController = require('../controllers/relayScheduleController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, relayScheduleController.getAllSchedules);
router.post('/', authenticateToken, relayScheduleController.createSchedule);
router.put('/:id', authenticateToken, relayScheduleController.updateSchedule);
router.delete('/:id', authenticateToken, relayScheduleController.deleteSchedule);

module.exports = router;