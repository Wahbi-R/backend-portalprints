const db = require('../config/db.config');

// Retrieve all products
const getAllProducts = async (userId = null) => {
    const query = userId ? 
        'SELECT * FROM products WHERE user_id = $1' : 
        'SELECT * FROM products';
    const result = await db.query(query, userId ? [userId] : []);
    return result.rows;
};

// Retrieve a specific product by ID, including its variants
const getProductById = async (productId) => {
    const productResult = await db.query('SELECT * FROM products WHERE product_id = $1', [productId]);
    const variantsResult = await db.query('SELECT * FROM variants WHERE product_id = $1', [productId]);

    const product = productResult.rows[0];
    if (product) {
        product.variants = variantsResult.rows;
    }
    return product;
};

// Create a new product
const createProduct = async (productData) => {
    const { user_id, external_product_id, name, description } = productData;
    const result = await db.query(
        `INSERT INTO products (user_id, external_product_id, name, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, external_product_id, name, description]
    );
    return result.rows[0];
};

// Update an existing product by ID
const updateProduct = async (productId, productData) => {
    const { name, description } = productData;
    const result = await db.query(
        `UPDATE products
         SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
         WHERE product_id = $3
         RETURNING *`,
        [name, description, productId]
    );
    return result.rows[0];
};

// Delete a product by ID
const deleteProduct = async (productId) => {
    const result = await db.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [productId]);
    return result.rows[0];
};

// Create a new variant for a product
const createVariant = async (productId, variantData) => {
    const { variant_name, price, sku, stock_quantity } = variantData;
    const result = await db.query(
        `INSERT INTO variants (product_id, variant_name, price, sku, stock_quantity)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [productId, variant_name, price, sku, stock_quantity]
    );
    return result.rows[0];
};

// Update a variant by ID
const updateVariant = async (variantId, variantData) => {
    const { variant_name, price, sku, stock_quantity } = variantData;
    const result = await db.query(
        `UPDATE variants
         SET variant_name = $1, price = $2, sku = $3, stock_quantity = $4
         WHERE variant_id = $5
         RETURNING *`,
        [variant_name, price, sku, stock_quantity, variantId]
    );
    return result.rows[0];
};

// Delete a variant by ID
const deleteVariant = async (variantId) => {
    const result = await db.query('DELETE FROM variants WHERE variant_id = $1 RETURNING *', [variantId]);
    return result.rows[0];
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
