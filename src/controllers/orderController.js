const orderModel = require('../models/orderModels');

const getAllOrders = async (req, res) => {
    const { userId } = req;  // Extract userId from the request
    try {
        const orders = await orderModel.getOrdersByUserId(userId);
        return res.status(200).json(orders);
    } catch (error) {
        console.error("Error retrieving orders:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Create an order linked to the authenticated user
const createOrder = async (req, res) => {
    const { userId } = req;
    const orderData = req.body;

    try {
        const order = await orderModel.createOrder(userId, orderData);
        return res.status(201).json(order);
    } catch (error) {
        console.error("Error creating order:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllOrders,
    createOrder
};
