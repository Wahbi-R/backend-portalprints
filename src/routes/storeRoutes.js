const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const authenticateUser = require('../middleware/authMiddleware');

// Secure order-related routes
router.post('/stores/saveStore', authenticateUser, storeController.addStoreConnection);
router.get('/stores', authenticateUser, storeController.getAllStores);


module.exports = router;
