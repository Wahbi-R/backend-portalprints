const express = require("express");
const router = express.Router();
const shopifyController = require('../controllers/shopifyController');
const authenticateUser = require('../middleware/authMiddleware');

// Route to exchange Shopify authorization code for access token
router.post("/shopify/exchange-token", authenticateUser, shopifyController.exchangeToken);
// fetch Shopify orders
router.post('/shopify/getShopOrders', authenticateUser, shopifyController.processBulkOrders);
// fetch Shopify products
router.post("/shopify/getStoreProducts", authenticateUser, shopifyController.storeProducts);
// add a product to your shopify store
router.post("/shopify/addProduct", authenticateUser, shopifyController.addOrUpdateProduct)

module.exports = router;
