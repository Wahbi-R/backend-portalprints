const fetch = require("node-fetch");
const storeModel = require("../models/storeModels"); 
const shopifyUtils = require("../utils/shopifyUtils")
const shopifyModel = require("../models/shopifyModel")

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

const { initiateBulkOperation, pollBulkOperation, processJsonlFile } = require('../utils/shopifyUtils');

const processBulkOrders = async (req, res) => {
  const { storeDomain, uid } = req.body;

  if (!storeDomain || !uid) {
      return res.status(400).json({ error: "storeDomain and uid are required" });
  }
  console.log(storeDomain)

  try {
      // Step 1: Fetch access token from the database
      console.log(`Fetching access token for storeDomain: ${storeDomain} and uid: ${uid}`);
      const accessToken = await storeModel.getAccessToken(uid, storeDomain);

      if (!accessToken) {
          return res.status(404).json({ error: "Access token not found for the given storeDomain and uid" });
      }

      // Step 2: Initiate the bulk operation
      console.log("Starting bulk operation for orders...");
      const bulkOperationId = await initiateBulkOperation(storeDomain, accessToken);

      // Step 3: Poll for the bulk operation's completion
      console.log(`Polling for bulk operation ID: ${bulkOperationId}`);
      const downloadUrl = await pollBulkOperation(storeDomain, accessToken);

      // Step 4: Process and store orders and items
      console.log("Processing and storing .jsonl data...");
      await shopifyUtils.processJsonlFileAndStore(downloadUrl, uid, storeDomain);

      console.log("Bulk orders processed successfully.");
      res.status(200).send("Bulk orders processed successfully.");
  } catch (error) {
      console.error("Error processing bulk orders:", error.message);
      res.status(500).send("Error processing bulk orders");
  }
};

const storeProducts = async (req, res) => {
  const { storeDomain, uid } = req.body;

  if (!storeDomain || !uid) {
      return res.status(400).json({ error: "storeDomain and uid are required" });
  }

  try {
      // Fetch access token for the given store and user
      console.log(`Fetching access token for storeDomain: ${storeDomain} and uid: ${uid}`);
      const accessToken = await storeModel.getAccessToken(uid, storeDomain);

      if (!accessToken) {
          return res.status(404).json({ error: "Access token not found for the given storeDomain and uid" });
      }

      // Initiate the bulk operation for products
      console.log("Starting bulk operation for products...");
      const bulkOperationId = await shopifyUtils.initiateBulkOperationForProducts(storeDomain, accessToken);

      // Poll for the bulk operation's completion
      console.log(`Polling for bulk operation ID: ${bulkOperationId}`);
      const downloadUrl = await shopifyUtils.pollBulkOperation(storeDomain, accessToken);

      // Process the downloaded .jsonl file
      console.log("Processing .jsonl file...");
      const { products, variants } = await shopifyUtils.processProductsJsonlFile(downloadUrl);

      // Save products and variants to the database
      console.log("Saving products and variants to the database...");
      await shopifyModel.addProductsAndVariants(products, variants, uid, storeDomain);

      console.log("Products and variants stored successfully")
      res.status(200).json({ message: "Products and variants stored successfully" });
  } catch (error) {
      console.error("Error storing products:", error.message);
      res.status(500).send("Error storing products");
  }
};

module.exports = {
    processBulkOrders,
};

module.exports = {
  exchangeToken,
  processBulkOrders,
  storeProducts,
};
