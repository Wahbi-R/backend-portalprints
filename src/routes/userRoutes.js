// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateUser = require('../middleware/authMiddleware');

// Secure user registration and profile routes
router.post('/users/register', authenticateUser, userController.registerUser);
router.get('/users/profile', authenticateUser, userController.getUserProfile);

module.exports = router;
