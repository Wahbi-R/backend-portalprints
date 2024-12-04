const storeModel = require('../models/storeModels');
const sessionModel = require('../models/sessionModel.js')
const storeUsersModel = require('../models/storeUsersModel.js')

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
    // Fetch or validate the store access key
    let newAccessKey = store_access_key;

    if (!newAccessKey) {
      console.log("Access key not provided, fetching from session...");
      newAccessKey = await sessionModel.getSessionAccessKeyByDomain(store_domain);
      if (!newAccessKey) {
        return res.status(400).json({ error: "Unable to fetch store access key." });
      }
      console.log("Fetched access key:", newAccessKey);
    }

    // Check if the store already exists
    const existingStore = await storeModel.getStoreByDomain(store_domain);

    if (existingStore) {
      // Check if the user already has access to the store
      const userStore = await storeUsersModel.getStoreUser(store_domain, userId);

      if (userStore) {
        // Update the access key if necessary
        if (existingStore.store_access_key !== newAccessKey) {
          const updatedStore = await storeModel.updateStoreAccessKey(
            store_domain,
            newAccessKey
          );
          console.log("Store updated with new access key:", updatedStore);
          return res.status(200).json({
            message: "Store access key updated.",
            store: updatedStore,
          });
        }

        console.log("Store already linked to the user:", existingStore);
        return res.status(200).json({
          message: "Store already linked to the user.",
          store: existingStore,
        });
      }

      // Link the existing store to the user
      await storeUsersModel.addUserToStore(existingStore.store_id, userId, 'Shopify');
      return res.status(201).json({
        message: "Existing store linked to the user.",
        store: existingStore,
      });
    }

    // Add the store if it doesn't exist
    const newStore = await storeModel.addStoreConnection(store_name, store_domain, newAccessKey);
    console.log("New store added:", newStore);

    // Link the new store to the user
    await storeUsersModel.addUserToStore(newStore.store_id, userId, 'Shopify');

    return res.status(201).json({
      message: "New store added and linked to the user.",
      store: newStore,
    });
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
