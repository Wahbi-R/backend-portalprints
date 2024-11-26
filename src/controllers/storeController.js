const storeModel = require('../models/storeModels');
const sessionModel = require('../models/sessionModel.js')

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
  console.log(store_access_key)
  var newAccessKey = store_access_key
  if (newAccessKey === null || newAccessKey === undefined) {
    console.log("undef storekey")
    newAccessKey = await sessionModel.getSessionAccessKeyByDomain(store_domain)
    console.log("store_access_key:", newAccessKey)
  }
  try {
    // Check if the store already exists
    const existingStore = await storeModel.getStoreByDomain(store_domain, userId);

    if (existingStore) {
      if (existingStore.store_access_key !== newAccessKey) {
        // Update the store_access_key if it's different
        const updatedStore = await storeModel.updateStoreAccessKey(
          userId,
          store_domain,
          store_access_key
        );
        console.log("Store updated with new access key:", updatedStore);
        return res.status(200).json({
          message: "Store access key updated.",
          store: updatedStore,
        });
      }
      console.log("Store already exists with the same access key:", existingStore);
      return res.status(200).json({ message: "Store already exists.", store: existingStore });
    }
    // Add the store if it doesn't exist
    console.log(newAccessKey)
    const store = await storeModel.addStoreConnection(userId, store_name, store_domain, newAccessKey);

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
