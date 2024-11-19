const express = require("express");
const router = express.Router();
const shopifyController = require('../controllers/shopifyController');
const authenticateUser = require('../middleware/authMiddleware');

// Route to exchange Shopify authorization code for access token
router.post("/shopify/exchange-token", authenticateUser, shopifyController.exchangeToken);

module.exports = router;
