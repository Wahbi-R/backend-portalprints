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

const getAccessToken = async (uid, storeDomain) => {
  const result = await db.query(
    `SELECT store_access_key 
      FROM stores 
      WHERE user_id = $1 AND store_domain = $2`,
    [uid, storeDomain]
  );
  if (result.rows.length === 0) {
      return null; // Access token not found
  }

  return result.rows[0].store_access_key;
};

// Fetch store ID based on user_id and storeDomain
const getStoreId = async (userId, storeDomain) => {
  const result = await db.query(
      'SELECT store_id FROM stores WHERE user_id = $1 AND store_domain = $2',
      [userId, storeDomain]
  );
  return result.rows.length > 0 ? result.rows[0].store_id : null;
};

module.exports = {
    getAllStoresByUserID,
    addStoreConnection,
    getStoreByDomain,
    getAccessToken,
    getStoreId,
};