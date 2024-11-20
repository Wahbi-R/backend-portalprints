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


// Fetch all orders for a given store_id
const getOrdersByStoreId = async (storeId) => {
    const result = await db.query(
        `SELECT 
            o.*,
            s.store_name 
         FROM orders o
         JOIN stores s ON o.store_id = s.store_id
         WHERE o.store_id = $1`,
        [storeId]
    );
    return result.rows;
};

// Fetch all order items with their linked products and variants for specific order IDs
const getOrderItemsByOrderIds = async (orderIds) => {
    const result = await db.query(
        `SELECT 
            oi.*,
            p.name,
            v.variant_name 
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.product_id
         LEFT JOIN variants v ON oi.variant_id = v.variant_id
         WHERE oi.order_id = ANY ($1::int[])`,
        [orderIds]
    );
    return result.rows;
};

module.exports = {
    getOrdersByUserId,
    createOrder,
    getOrdersByStoreId,
    getOrderItemsByOrderIds,
};