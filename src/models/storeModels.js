const db = require('../config/db.config');

// Retrieve orders for a specific user
const getAllStores = async (userId) => {
    const result = await db.query('SELECT * FROM stores WHERE user_id = $1', [userId]);
    return result.rows;
};

// Create a new order linked to a specific user
const addStoreConnection = async (userId, orderData) => {
    const { total_cost, store_name, store_domain } = orderData;
    const result = await db.query(
        `INSERT INTO stores (user_id, store_name, store_domain)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, total_cost, store_name, store_domain]
    );
    return result.rows[0];
};

module.exports = {
    getAllStores,
    addStoreConnection
};