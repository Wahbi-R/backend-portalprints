const productModel = require('../models/productModel');

// Get all products (or products for a specific user)
const getAllProducts = async (req, res) => {
    try {
        const products = await productModel.getAllProducts(req.userId);
        return res.status(200).json(products);
    } catch (error) {
        console.error("Error retrieving products:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Get a specific product by ID, including its variants
const getProductById = async (req, res) => {
    try {
        const product = await productModel.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(200).json(product);
    } catch (error) {
        console.error("Error retrieving product:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a new product
const createProduct = async (req, res) => {
    try {
        const productData = { ...req.body, user_id: req.userId };
        const product = await productModel.createProduct(productData);
        return res.status(201).json(product);
    } catch (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Update an existing product
const updateProduct = async (req, res) => {
    try {
        const product = await productModel.updateProduct(req.params.id, req.body);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete a product
const deleteProduct = async (req, res) => {
    try {
        const product = await productModel.deleteProduct(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(200).json(product);
    } catch (error) {
        console.error("Error deleting product:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Create a new variant for a product
const createVariant = async (req, res) => {
    try {
        const productId = req.params.productId;
        const variant = await productModel.createVariant(productId, req.body);
        return res.status(201).json(variant);
    } catch (error) {
        console.error("Error creating variant:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Update a variant
const updateVariant = async (req, res) => {
    try {
        const variant = await productModel.updateVariant(req.params.variantId, req.body);
        if (!variant) {
            return res.status(404).json({ error: 'Variant not found' });
        }
        return res.status(200).json(variant);
    } catch (error) {
        console.error("Error updating variant:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete a variant
const deleteVariant = async (req, res) => {
    try {
        const variant = await productModel.deleteVariant(req.params.variantId);
        if (!variant) {
            return res.status(404).json({ error: 'Variant not found' });
        }
        return res.status(200).json(variant);
    } catch (error) {
        console.error("Error deleting variant:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant
};
