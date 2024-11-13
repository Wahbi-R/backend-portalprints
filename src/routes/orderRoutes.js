const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticateUser = require('../middleware/authMiddleware');
const validateOrder = require('../validators/orderValidator');

// Secure order-related routes
router.post('/orders', authenticateUser, validateOrder, orderController.createOrder);
router.get('/orders', authenticateUser, orderController.getAllOrders);

module.exports = router;
