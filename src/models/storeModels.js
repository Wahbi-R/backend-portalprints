const db = require('../config/db.config');

// Retrieve orders for a specific user
const getAllStoresByUserID = async (userId) => {
    const result = await db.query('SELECT * FROM stores WHERE user_id = $1', [userId]);
    return result.rows;
};

// Create a new order linked to a specific user
const addStoreConnection = async (store_name, store_domain, store_access_key) => {
  try {
    const result = await db.query(
      `INSERT INTO stores (store_name, store_domain, store_access_key)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [store_name, store_domain, store_access_key]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error adding store:", error.message);
    throw error;
  }
};

// Update the stores access key
const updateStoreAccessKey = async (storeDomain, storeAccessKey) => {
  try {
    const result = await db.query(
      `UPDATE stores
       SET store_access_key = $1
       WHERE store_domain = $2
       RETURNING *`,
      [storeAccessKey, storeDomain]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error updating store access key:", error.message);
    throw error;
  }
};



// Retrieve a store by domain and user ID
const getStoreByDomain = async (storeDomain) => {
  try {
    const result = await db.query(
      `SELECT * FROM stores WHERE store_domain = $1`,
      [storeDomain]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error retrieving store by domain:", error.message);
    throw error;
  }
};


const getAccessToken = async (storeDomain) => {
  const result = await db.query(
    `SELECT store_access_key 
      FROM stores 
      WHERE store_domain = $1`,
    [storeDomain]
  );
  if (result.rows.length === 0) {
      return null; // Access token not found
  }

  return result.rows[0].store_access_key;
};

// Fetch store ID based on user_id and storeDomain
const getStoreId = async (storeDomain) => {
  const result = await db.query(
      `SELECT MIN(store_id) AS store_id 
       FROM stores 
       WHERE store_domain = $1`,
      [storeDomain]
  );
  return result.rows[0]?.store_id || null;
};

// Save the product to the `store_products` table
const saveProductToStoreProducts = async ({ store_id, product_id, external_product_id, price, availability }) => {
  const client = await db.connect();
  try {
    await client.query(
      `INSERT INTO store_products (store_id, product_id, external_product_id, price, availability, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (store_id, product_id) DO NOTHING`,
      [store_id, product_id, external_product_id, price, availability]
    );
  } finally {
    client.release();
  }
};

// Fetch product with variants by product_id
const getProductWithVariants = async (product_id) => {
  const client = await db.connect();
  try {
    // Fetch product details
    const productResult = await client.query(
      `SELECT * FROM products WHERE product_id = $1`,
      [product_id]
    );

    const product = productResult.rows[0];
    if (!product) return null;

    // Fetch associated variants
    const variantsResult = await client.query(
      `SELECT * FROM variants WHERE product_id = $1`,
      [product_id]
    );

    product.variants = variantsResult.rows;
    return product;
  } finally {
    client.release();
  }
};

module.exports = {
    getAllStoresByUserID,
    addStoreConnection,
    getStoreByDomain,
    getAccessToken,
    getStoreId,
    updateStoreAccessKey,
    saveProductToStoreProducts,
    getProductWithVariants,
};