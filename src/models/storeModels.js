const db = require('../config/db.config');

// Retrieve orders for a specific user
const getAllStoresByUserID = async (userId) => {
    const result = await db.query('SELECT * FROM stores WHERE user_id = $1', [userId]);
    return result.rows;
};

// Create a new order linked to a specific user
const addStoreConnection = async (userId, store_name, store_domain, store_access_key) => {
    const result = await db.query(
        `INSERT INTO stores (user_id, store_name, store_domain, store_access_key)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, store_name, store_domain, store_access_key]
    );
    return result.rows[0];
};

// Retrieve a store by domain and user ID
const getStoreByDomain = async (storeDomain, userId) => {
    try {
      const result = await db.query(
        `SELECT * FROM stores WHERE store_domain = $1 AND user_id = $2`,
        [storeDomain, userId]
      );
      return result.rows[0]; // Return the store if found, or undefined if not
    } catch (error) {
      console.error("Error retrieving store by domain:", error.message);
      throw error;
    }
  };

module.exports = {
    getAllStoresByUserID,
    addStoreConnection,
    getStoreByDomain
};