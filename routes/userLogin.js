const express = require('express');
const router = express.Router();
const { loginUser, createUser } = require('../controllers/userController');

// POST /user/login
router.post('/login', loginUser);

// POST /user/register
router.post('/register', createUser);

module.exports = router;