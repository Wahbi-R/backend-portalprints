const db = require('../config/db.config');

// Retrieve orders for a specific user
const getOrdersByUserId = async (userId) => {
    const result = await db.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
    return result.rows;
};

// Create a new order linked to a specific user
const createOrder = async (userId, orderData) => {
    const { total_cost, shipping_cost, customer_name } = orderData;
    const result = await db.query(
        `INSERT INTO orders (user_id, total_cost, shipping_cost, customer_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, total_cost, shipping_cost, customer_name]
    );
    return result.rows[0];
};

module.exports = {
    getOrdersByUserId,
    createOrder
};