// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateUser = require('../middleware/authMiddleware');
const multer = require('multer'); // Import multer

// Secure user registration and profile routes
router.post('/users/register', authenticateUser, userController.registerUser);
router.get('/users/profile', authenticateUser, userController.getUserProfile);

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory temporarily

// Route for uploading profile picture
router.post('/users/upload-profile-picture', upload.single('file'), userController.uploadProfilePicture);

module.exports = router;
