const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticateUser = require('../middleware/authMiddleware');

// Product routes
router.get('/products', authenticateUser, productController.getAllProducts);
router.get('/products/:id', authenticateUser, productController.getProductById);
router.post('/products', authenticateUser, productController.createProduct);
router.put('/products/:id', authenticateUser, productController.updateProduct);
router.delete('/products/:id', authenticateUser, productController.deleteProduct);

// Variant routes (nested under products)
router.post('/products/:productId/variants', authenticateUser, productController.createVariant);
router.put('/variants/:variantId', authenticateUser, productController.updateVariant);
router.delete('/variants/:variantId', authenticateUser, productController.deleteVariant);

router.post('/variants', authenticateUser, productController.getVariantByProductIDArray)
module.exports = router;
