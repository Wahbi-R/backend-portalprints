const fetch = require("node-fetch");
const storeModel = require("../models/storeModels"); 
const shopifyUtils = require("../utils/shopifyUtils");
const shopifyModel = require("../models/shopifyModel");
const productModel = require("../models/productModel");

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

const addOrUpdateProduct = async (req, res) => {
  const { uid, storeDomain, product_id } = req.body;

  if (!storeDomain || !uid || !product_id) {
    return res.status(400).json({ error: "storeDomain, uid, and product_id are required" });
  }

  try {
    // fetch the store information
    let store = await storeModel.getStoreByDomain(storeDomain);
    if (!store || !store.store_id) { // we specifically need store_id for everything else
      const errMsg = `Store "${storeDomain}" not found`;
      return res.status(400).send({ message: errMsg });
    }

    const accessToken = store.store_access_key;
    
    // Create the fulfillment service if it doesn't exist
    if (!store.fulfillment_service_id) {
      const fulfillmentSvc = await shopifyUtils.createFulfillmentService(storeDomain, accessToken);
      console.log(fulfillmentSvc);
      store = storeModel.setFulfillmentServiceId(storeDomain, fulfillmentSvc.id, fulfillmentSvc.location.id);
    }
    console.log("Current store", store);


    // fetch the internal product
    const product = await productModel.getProductByIdWithStoreMeta(product_id, store.store_id);
    if (!product) {
      const errMsg = `Product ID "${product_id}" does not exist`; 
      return res.status(400).send({ message: errMsg });
    }
    console.log("Product", JSON.stringify(product, null, 2));
    // Either a list of options or empty - either is fine
    const productOptions = await productModel.getProductOptions(product_id);

    // TODO: Filter variants down to the requested ones
    // TODO: Also need to handle deleted variants at some point
    if (req.body.variant_ids instanceof Array) {
      if (req.body.variant_ids.length === 0) {
        return res.status(400).send({ message: "Need at least one variant" });
      }
      product.variants = product.variants.filter(
        v => req.body.variant_ids.indexOf(v.variant_id)
      );
    }

    let productRes = undefined;
    const productPayload = {
      name: req.body.name ?? product.name,
      description: req.body.description ?? product.description,
      imageUrl: product.image_url,

      // TODO: Does Shopify dedupe product options? Or do we need to provide an ID
      productOptions,

      // if forwarding product status to Shopify, do it here
      // status: "ACTIVE" | "ARCHIVED" | "DRAFT",
    };
    console.log("Product payload", productPayload);

    // If the product already exists, we're updating
    // TODO: Verify that the product actually exists in Shopify, and wasn't deleted - ideally at refresh, and not here
    if (product.external_product_id) {
      throw new Error("Not implemented");
      productRes = shopifyUtils.updateProduct(storeDomain, accessToken, product.external_product_id, productPayload);
    } else {
      // otherwise create the product and store the ID for later
      productRes = await shopifyUtils.addProductToShopify(
        storeDomain, 
        accessToken, 
        productPayload
      );
    }
    
    console.log("Shopify product response", productRes);
    const externalProductId = productRes.id;

    // Batch the requests for variants, as recommended
    const variantsPayload = product.variants.map(v => {
      // TODO: Clean this up
      const selectedOptions = productOptions.map(({ name, values }) => {
        const selectedValue = values.find(({ variantId }) => variantId === v.variant_id);
        return { name, value: selectedValue.value };
      });
      return {
        id: v.external_variant_id ?? undefined,
        sku: v.sku,
        optionValues: selectedOptions.map(o => {
          return {
            name: o.name,
            value: o.value,
          }
        })
      }
    });
    const variantsRes = await shopifyUtils.addVariantsToProduct(
      storeDomain, 
      accessToken, 
      externalProductId, 
      store.location_id,
      product.price, 
      variantsPayload,
    );
    console.log("Variants res", JSON.stringify(variantsRes, null, 2));

    // Store the variant IDs
    const dbResult = await productModel.saveStoreVariants(
      store.store_id,
      product_id,
      externalProductId,
      variantsRes.map(({ id: externalVariantId, sku }) => {
        return {
          variant_id: product.variants.find(v => v.sku === sku).variant_id,
          external_variant_id: externalVariantId
        }
      })
    );
    console.log("DB result", dbResult);

    // TODO: Handle publishing to Shopify Online Store - right now user has to publish manually from Shopify admin

    return res.status(201).send({ });
  } catch (error) {
    console.error("Error adding product", error);
    return res.status(500).send({ message: "Failed to add product to Shopify" });
  }
};

module.exports = {
  processBulkOrders,
  exchangeToken,
  processBulkOrders,
  storeProducts,
  addOrUpdateProduct
};
