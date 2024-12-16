const productModel = require('../models/productModel');
const storeModel = require('../models/storeModels')
const db = require('../config/db.config');

// Get all products (or products for a specific user)
const getAllProducts = async (req, res) => {
    const { uid, storeDomain, vendor } = req.query;

    if (!uid || !storeDomain) {
        return res.status(400).json({ error: "uid and storeDomain are required" });
    }

    try {
        // Get store ID based on uid and storeDomain
        // TODO: Check UID 
        const storeId = await storeModel.getStoreId(storeDomain);

        if (!storeId) {
            return res.status(404).json({ error: "Store not found for the given uid and storeDomain" });
        }

        // Get all orders for the store
        //const products = await productModel.getProductsByStoreId(storeId);
        let products = await productModel.getProductsWithStoreMeta(storeId);
        // const products = await productModel.getProductsByVendor(vendor);

        // if (products.length === 0) {
        //     return res.status(404).json({ error: "No products found for the given store" });
        // }

        // Re-key products as necessary
        products = products.map(p => {
            return {
                ...p,
                isInStore: p.external_product_id !== null
            };
        })


        console.log(products)

        //const products = await productModel.getAllProducts(req.userId);
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
        const productData = { ...req.body, user_id: req.userId, store_id: req.storeId };
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

const getVariantByProductIDArray = async (req, res) => {
    const { productIds } = req.body;
    console.log("getVariantsByArray")
    if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: "Invalid productIds. Must be an array." });
      }
    try {
        const client = await db.connect();
    const query = `
      SELECT 
        v.variant_id, 
        v.product_id, 
        v.sku, 
        v.created_at, 
        v.updated_at,
        (vo.name || ': ' || vo.value) AS "variant_name"
      FROM variants v
      INNER JOIN variant_options vo ON v.variant_id = vo.variant_id
      WHERE product_id = ANY($1)
    `;
    const { rows } = await client.query(query, [productIds]);
    client.release();
    
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching variants:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant,
    getVariantByProductIDArray
};
