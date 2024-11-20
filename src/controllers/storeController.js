const storeModel = require('../models/storeModels');

const getAllStores = async (req, res) => {
    const { userId } = req.query;  // Extract userId from the request
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
      // Step 1: Check if the store already exists
      const existingStore = await storeModel.getStoreByDomain(store_domain, userId);
  
      if (existingStore) {
        console.log("Store already exists:", existingStore);
        return res.status(200).json({ message: "Store already exists.", store: existingStore });
      }
  
      // Step 2: Add the store if it doesn't exist
      const store = await storeModel.addStoreConnection(userId, store_name, store_domain, store_access_key);
  
      console.log("New store added:", store);
      return res.status(201).json(store);
    } catch (error) {
      console.error("Error adding store connection:", error.message);
      return res.status(500).json({ error: "Internal server error: store addition" });
    }
  };

  const saveShopifyAccessToken = async (req, res) => {
    console.log(req)
    return res.status(200)
  }
  
module.exports = {
    getAllStores,
    addStoreConnection,
    saveShopifyAccessToken
};
