const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticateUser = require('../middleware/authMiddleware');
const validateOrder = require('../validators/orderValidator');

router.post('/orders', authenticateUser, validateOrder, orderController.createOrder);
// Fetch all orders with their related items, products, and variants
router.get('/orders', orderController.getAllOrders);

module.exports = router;
