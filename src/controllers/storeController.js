const storeModel = require('../models/storeModels');

const getAllStores = async (req, res) => {
    const { userId } = req;  // Extract userId from the request
    try {
        const stores = await storeModel.getAllStoresByUserID(userId);
        return res.status(200).json(stores);
    } catch (error) {
        console.error("Error retrieving stores:", error);
        return res.status(500).json({ error: 'Internal server error: store retrieval' });
    }
};

// Create an order linked to the authenticated user
const addStoreConnection = async (req, res) => {
    const { userId, store_name, store_domain, store_access_key } = req.body;

    try {
        const store = await storeModel.addStoreConnection(userId, store_name, store_domain, store_access_key);
        return res.status(201).json(store);
    } catch (error) {
        console.error("Error creating order:", error);
        return res.status(500).json({ error: 'Internal server error: store addition' });
    }
};

module.exports = {
    getAllStores,
    addStoreConnection
};
