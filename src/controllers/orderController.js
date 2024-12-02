const orderModel = require('../models/orderModels');
const storeModel = require('../models/storeModels')


const getAllOrders = async (req, res) => {
    const { uid, storeDomain } = req.query;

    if (!uid || !storeDomain) {
        return res.status(400).json({ error: "uid and storeDomain are required" });
    }

    try {
        // Get store ID based on uid and storeDomain
        const storeId = await storeModel.getStoreId(storeDomain);

        if (!storeId) {
            return res.status(404).json({ error: "Store not found for the given uid and storeDomain" });
        }

        // Get all orders for the store
        const orders = await orderModel.getOrdersByStoreId(storeId);

        if (orders.length === 0) {
            return res.status(404).json({ error: "No orders found for the given store" });
        }

        // Get all order items with their linked products and variants
        const items = await orderModel.getOrderItemsByOrderIds(orders.map(order => order.order_id));

        // Group order items by their order ID
        const itemsByOrderId = items.reduce((acc, item) => {
            if (!acc[item.order_id]) {
                acc[item.order_id] = [];
            }
            acc[item.order_id].push(item);
            return acc;
        }, {});

        // Attach items to their respective orders
        orders.forEach(order => {
            order.items = itemsByOrderId[order.order_id] || [];
        });

        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error.message);
        res.status(500).json({ error: "Internal server error" });
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
