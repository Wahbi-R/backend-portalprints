const fetch = require("node-fetch");
const storeModel = require("../models/storeModels"); // Import the model

const exchangeToken = async (req, res) => {
  const { code, shop, uid } = req.body;

  console.log("Code:", code, "Shop:", shop, "UID:", uid);

  if (!code || !shop || !uid) {
    console.error("Missing required parameters: code, shop, or uid.");
    return res.status(400).send("Missing required parameters: code, shop, or uid.");
  }

  try {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    // Check if the store already exists
    const existingStore = await storeModel.getStoreByDomain(shop, uid);
    if (existingStore) {
      console.log("Store already exists:", existingStore);
      return res.status(200).json({ message: "Store already exists.", store: existingStore });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Error exchanging token:", errorData);
      return res.status(500).send("Error exchanging token.");
    }

    const { access_token } = await tokenResponse.json();
    console.log("Access Token:", access_token);

    // Save the store data to the database
    const storeData = await storeModel.addStoreConnection(uid, null, shop, access_token); // Store name is null

    console.log("Store saved to database:", storeData);

    // Respond with success and the saved store data
    return res.status(201).json(storeData);
  } catch (error) {
    console.error("Error during token exchange:", error.message);
    return res.status(500).send("Error during token exchange.");
  }
};

module.exports = {
  exchangeToken,
};
