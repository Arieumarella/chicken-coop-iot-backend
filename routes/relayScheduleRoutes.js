const express = require('express');
const router = express.Router();
const relayScheduleController = require('../controllers/relayScheduleController');

router.get('/', relayScheduleController.getAllSchedules);
router.post('/', relayScheduleController.createSchedule);
router.put('/:id', relayScheduleController.updateSchedule);
router.delete('/:id', relayScheduleController.deleteSchedule);

module.exports = router;