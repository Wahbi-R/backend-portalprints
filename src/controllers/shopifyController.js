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
      const accessToken = await storeModel.getAccessToken(storeDomain);

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
      const accessToken = await storeModel.getAccessToken(storeDomain);

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

const addProductToShopifyStore = async (req, res) => {
  const { uid, storeDomain, product_id } = req.body;

  console.log(uid, storeDomain, product_id);
  console.log("Running addProductToShopifyStore");

  if (!storeDomain || !uid || !product_id) {
    return res.status(400).json({ error: "storeDomain, uid, and product_id are required" });
  }

  try {
    // Step 1: Fetch product and variants from the database
    const product = await storeModel.getProductWithVariants(product_id);
    if (!product) {
      console.error("Product not found in the database");
      return res.status(404).json({ error: "Product not found in the database" });
    }
    console.log("Fetched product:", product);

    // Step 2: Fetch the Shopify access token
    const accessToken = await storeModel.getAccessToken(storeDomain);
    if (!accessToken) {
      console.error("Access token not found for storeDomain:", storeDomain);
      return res.status(404).json({ error: "Access token not found for the given storeDomain and uid" });
    }
    console.log("Fetched access token for storeDomain:", storeDomain);

    // Step 3: Create the product with image and options in Shopify
    console.log("Creating product with image and options in Shopify...");
    const createdProduct = await shopifyUtils.createProductWithImageAndOptions(storeDomain, accessToken, product);
    console.log("Created product in Shopify:", createdProduct);

    // Step 4: Generate all possible variants
    const variants = shopifyUtils.generateVariants(product.variants, product.variants[0]?.price || null);
    console.log("Generated variants:", variants);

    // Step 5: Add variants to the product in Shopify
    console.log("Adding variants to the product in Shopify...");
    const createdVariants = await shopifyUtils.addVariantsToProduct(storeDomain, accessToken, createdProduct.id, variants);
    console.log("Created variants in Shopify:", createdVariants);

    // Step 6: Fetch the store details
    const store = await storeModel.getStoreByDomain(storeDomain);
    if (!store) {
      console.error("Store not found in the database for domain:", storeDomain);
      return res.status(404).json({ error: "Store not found in the database" });
    }
    console.log("Fetched store details:", store);

    // Step 7: Save the product to `store_products` table
    console.log("Saving product to store_products...");
    await storeModel.saveProductToStoreProducts({
      store_id: store.store_id,
      product_id: product.product_id,
      external_product_id: createdProduct.id,
      price: product.variants[0]?.price || null, // Use the price of the first variant
      availability: true, // Default to available
    });
    console.log("Product saved to store_products successfully");

    res.status(201).json({
      message: "Product and variants created successfully in Shopify and saved to store_products",
      product: createdProduct,
      variants: createdVariants,
    });
  } catch (error) {
    console.error("Error creating product and variants:", error.message);
    res.status(500).json({ error: "Failed to create product and variants" });
  }
};




module.exports = {
    processBulkOrders,
};

module.exports = {
  exchangeToken,
  processBulkOrders,
  storeProducts,
  addProductToShopifyStore,
};
