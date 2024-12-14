const axios = require('axios');
const readline = require('readline');
const shopifyModel = require('../models/shopifyModel')

const getApiUrl = (storeDomain, version = "2024-01") =>
  `https://${storeDomain}/admin/api/${version}/graphql.json`;

/// For Orders
const initiateBulkOperation = async (storeDomain, accessToken) => {
    console.log(accessToken)
    const endpoint = `https://${storeDomain}/admin/api/2024-01/graphql.json`;
    const bulkOperationQuery = `
      mutation {
        bulkOperationRunQuery(
          query: """
          {
            orders {
              edges {
                node {
                  id
                  name
                  displayFulfillmentStatus
                  createdAt
                  cancelledAt
                  customer {
                    firstName
                    lastName
                  }
                  totalPriceSet {
                    shopMoney {
                        amount
                        currencyCode
                    }
                    }
                  shippingAddress {
                    firstName
                    lastName
                    address1
                    address2
                    city
                    country
                    zip
                  }
                  lineItems {
                    edges {
                      node {
                        id
                        title
                        quantity
                        vendor
                        product {
                          id
                        }
                          originalUnitPriceSet {
                            shopMoney {
                              amount
                              currencyCode
                            }
                          }
                        variant {
                          id
                          price
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          """
        ) {
          bulkOperation {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const response = await axios.post(endpoint, { query: bulkOperationQuery }, {
        headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
        },
    });

    const result = response.data;
    if (result.data.bulkOperationRunQuery.userErrors.length > 0) {
        throw new Error(`Bulk operation initiation failed: ${JSON.stringify(result.data.bulkOperationRunQuery.userErrors)}`);
    }

    return result.data.bulkOperationRunQuery.bulkOperation.id;
};

const pollBulkOperation = async (storeDomain, accessToken) => {
    const endpoint = `https://${storeDomain}/admin/api/2024-01/graphql.json`;
    let status = "CREATED";
    let downloadUrl = null;

    while (status !== "COMPLETED") {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls

        const statusQuery = `
          {
            currentBulkOperation {
              id
              status
              errorCode
              url
            }
          }
        `;

        const response = await axios.post(endpoint, { query: statusQuery }, {
            headers: {
                "X-Shopify-Access-Token": accessToken,
                "Content-Type": "application/json",
            },
        });

        const currentOperation = response.data.data.currentBulkOperation;
        status = currentOperation.status;
        downloadUrl = currentOperation.url;
        console.log(downloadUrl)

        if (status === "FAILED") {
            throw new Error(`Bulk operation failed with error: ${currentOperation.errorCode}`);
        }
    }

    return downloadUrl;
};



const processJsonlFile = async (downloadUrl) => {
    const orders = [];

    const response = await axios.get(downloadUrl, { responseType: "stream" });
    const rl = readline.createInterface({
        input: response.data,
        crlfDelay: Infinity,
    });
    

    return new Promise((resolve, reject) => {
        rl.on("line", (line) => {
            const entry = JSON.parse(line);

            if (entry.id && entry.id.includes("Order")) {
                orders.push(entry);
            }

            if (orders.length === 6) {
                const sixthOrder = orders[5];
                rl.close(); // Stop processing after the sixth order

                const sixthOrderDetails = {
                    id: sixthOrder.id,
                    name: sixthOrder.name,
                    fulfillmentStatus: sixthOrder.displayFulfillmentStatus,
                    shippingAddress: sixthOrder.shippingAddress,
                    lineItems: [], // To store line items of the sixth order
                };

                resolve(sixthOrderDetails);
            }
        });

        rl.on("error", (err) => {
            reject(err);
        });

        rl.on("close", () => {
            if (orders.length < 6) {
                reject(new Error("Less than six orders available in the file"));
            }
        });
    });
};


const processJsonlFileAndStore = async (downloadUrl, uid, storeDomain) => {
    const response = await axios.get(downloadUrl, { responseType: "stream" });
    const rl = readline.createInterface({
        input: response.data,
        crlfDelay: Infinity,
    });

    const ordersMap = {}; // Map to store orders and their line items

    return new Promise((resolve, reject) => {
        rl.on("line", async (line) => {
            const entry = JSON.parse(line);

            // Handle Order Entries
            if (entry.id && entry.id.includes("Order")) {
                const orderId = entry.id.split('/').pop(); // Extract Shopify order ID
                ordersMap[orderId] = {
                    external_order_id: orderId,
                    name: entry.name,
                    displayFulfillmentStatus: entry.displayFulfillmentStatus,
                    createdAt: entry.createdAt,
                    cancelledAt: entry.cancelledAt,
                    total_cost: entry.totalPriceSet?.shopMoney?.amount || null,
                    currency: entry.totalPriceSet?.shopMoney?.currencyCode || null,
                    customer: {
                        firstName: entry.customer?.firstName || null,
                        lastName: entry.customer?.lastName || null,
                    },
                    shippingAddress: entry.shippingAddress,
                    lineItems: [],
                };
            }

            // Handle Line Item Entries
            if (entry.id && entry.id.includes("LineItem")) {
                const parentId = entry.__parentId.split('/').pop(); // Get parent order ID
                if (ordersMap[parentId]) {
                    ordersMap[parentId].lineItems.push({
                        external_parent_id: parentId,
                        product_id: entry.product?.id?.split('/').pop() || null,
                        variant_id: entry.variant?.id?.split('/').pop() || null,
                        quantity: entry.quantity,
                        item_price: entry.originalUnitPriceSet?.shopMoney?.amount || null,
                        currency: entry.originalUnitPriceSet?.shopMoney?.currencyCode || null,
                    });
                }
            }
        });

        rl.on("close", async () => {
            try {
                await shopifyModel.storeOrdersAndItems(uid, storeDomain, ordersMap);
                resolve();
            } catch (error) {
                reject(error);
            }
        });

        rl.on("error", (err) => {
            reject(err);
        });
    });
};

const initiateBulkOperationForProducts = async (storeDomain, accessToken) => {
    const url = `https://${storeDomain}/admin/api/2024-10/graphql.json`;

    const query = `
        mutation {
            bulkOperationRunQuery(
                query: """
                {
                    products(query: "vendor:Portal") {
                        edges {
                            node {
                                id
                                title
                                description
                                vendor
                                media(first: 10) {
                            edges {
                              node {
                                ... on MediaImage {
                                  image {
                                    url
                                  }
                                }
                              }
                            }
        }
                                variants {
                                    edges {
                                        node {
                                            id
                                            title
                                            sku
                                            price
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                """
            ) {
                bulkOperation {
                    id
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    const response = await axios.post(url, { query }, {
        headers: { "X-Shopify-Access-Token": accessToken },
    });

    if (response.data.errors || response.data.data.bulkOperationRunQuery.userErrors.length > 0) {
        throw new Error(`Bulk operation initiation failed: ${JSON.stringify(response.data.errors || response.data.data.bulkOperationRunQuery.userErrors)}`);
    }

    return response.data.data.bulkOperationRunQuery.bulkOperation.id;
};

const processProductsJsonlFile = async (downloadUrl) => {
    const response = await axios.get(downloadUrl, { responseType: "stream" });
    const rl = readline.createInterface({ input: response.data });
  
    const products = {};
    const variants = [];
  
    return new Promise((resolve, reject) => {
      rl.on("line", (line) => {
        try {
          const entry = JSON.parse(line);
  
          if (entry.id?.includes("ProductVariant")) {
            // Process Product Variants
            variants.push({
              external_variant_id: entry.id,
              variant_name: entry.title,
              sku: entry.sku,
              price: entry.price,
              external_parent_id: entry.__parentId,
            });
          } else if (entry.id?.includes("Product")) {
            // Process Products
            products[entry.id] = {
              external_product_id: entry.id,
              name: entry.title,
              description: entry.description,
              vendor: entry.vendor,
              image_url: null, // Initialize image_url as null
            };
          } else if (entry.image?.url && entry.__parentId?.includes("Product")) {
            // Process Product Images
            const productId = entry.__parentId;
            if (products[productId]) {
              products[productId].image_url = entry.image.url; // Associate the image with the product
            }
          }
        } catch (err) {
          console.error("Error parsing line:", line, err);
        }
      });
  
      rl.on("close", () => {
        resolve({ products: Object.values(products), variants });
      });
  
      rl.on("error", (err) => reject(err));
    });
  };
  
const addProductToShopify = async (storeDomain, accessToken, productData) => {
  const url = getApiUrl(storeDomain, "2024-10");

  const mutation = `
    mutation {
      productCreate(
        product: {
          title: "${productData.name}",
          descriptionHtml: "${productData.description}",
          vendor: "Portal",
          productOptions: [
            ${productData.productOptions.map(opt => {
              return `
                {
                  name: "${opt.name}",
                  values: [
                    ${opt.values.map(v => `{ name: "${v.value}" }`).join(", ")}
                  ]
                }
              `
            })}
          ]
          # add status here if forwarding
        },
        media: [
          {
            alt: "Image of ${productData.name}",
            mediaContentType: IMAGE,
            originalSource: "${productData.imageUrl}"
          }
        ]
      ) {
          product {
            id
            title
            descriptionHtml
            status
          }
          userErrors {
            field
            message
          }
        }
    }
  `;

  try {
    const response = await axios.post(
      url,
      { query: mutation },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    console.log("Product creation response", data);
    if (data.errors || data.data.productCreate.userErrors.length > 0) {
      const errors = data.data.productCreate.userErrors.map(err => err.message).join(", ");
      throw new Error(`Product creation failed: ${errors}`);
    }

    return data.data.productCreate.product;
  } catch (error) {
    console.error("Error in addProductToShopify utility:", error.message);
    throw error;
  }
};

const updateProduct = async (storeDomain, accessToken, externalProductId, productData) => {
  const url = `https://${storeDomain}/admin/api/2024-01/graphql.json`;

  const mutation = `
    mutation {
      productCreate(input: {
        title: "${productData.name}",
        descriptionHtml: "${productData.description}",
        vendor: "Portal",
        images: [{
          src: "${productData.imageUrl}"
        }]
        # add status here if forwarding
      }) {
        product {
          id
          title
          descriptionHtml
          status
          images
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      url,
      { query: mutation },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    if (data.errors || data.data.productCreate.userErrors.length > 0) {
      const errors = data.data.productCreate.userErrors.map(err => err.message).join(", ");
      throw new Error(`Product creation failed: ${errors}`);
    }

    return data.data.productCreate.product;
  } catch (error) {
    console.error("Error in addProductToShopify utility:", error.message);
    throw error;
  }
};

const createProductWithVariants = async (storeDomain, accessToken, product) => {
  const url = `https://${storeDomain}/admin/api/2024-07/graphql.json`;

  const mutation = `
    mutation {
      productCreate(
        input: {
          title: "${product.name}",
          descriptionHtml: "${product.description}",
          vendor: "${product.vendor}",
          productOptions: [
            {
              name: "Style",
              values: [${product.variants.map((v) => `{ name: "${v.variant_name}" }`).join(", ")}]
            }
          ]
        },
        media: [
          {
            originalSource: "${product.image_url}",
            alt: "Image for ${product.name}",
            mediaContentType: IMAGE
          }
        ]
      ) {
        product {
          id
          title
          options {
            name
            values
          }
          variants(first: 5) {
            edges {
              node {
                id
                price
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          media(first: 1) {
            nodes {
              alt
              mediaContentType
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      url,
      { query: mutation },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    console.log("Shopify Response:", JSON.stringify(data, null, 2));

    if (data.errors || (data.data && data.data.productCreate.userErrors.length > 0)) {
      const errors = (data.data.productCreate.userErrors || [])
        .map((err) => err.message)
        .join(", ");
      throw new Error(`Product creation failed: ${errors}`);
    }

    return data.data.productCreate.product;
  } catch (error) {
    console.error("Error in createProductWithVariants utility:", error.message);
    throw error;
  }
};

const getProduct = async (storeDomain, accessToken, externalProductId) => {
  const url = getApiUrl(storeDomain, "2024-01");
  // fields can be removed here if it becomes too expensive
  const query = `
    query {
      product(id: "${externalProductId}") {
        id
        title
        description
        descriptionHtml
        published
        status
        onlineStoreUrl # determines whether it's published or not
        variants(first: 100) {
          edges {
            node {
              id
              availableForSale
              sku # required for fulfillment
              price
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      url,
      { query },
      { 
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json"
        }
      }
    );

    const data = response.data;
    console.log("Fetch product response", data);
    if (data.errors || data.data.product.userErrors.length > 0) {
      const errors = data.data.product.userErrors.map(err => err.message).join(", ");
      throw new Error(`Product fetch failed: ${errors}`);
    }

    return data.data.product.product;
  } catch (error) {
    console.error(`Failed to fetch product "${externalProductId}" from Shopify`, error);
    throw error;
  }
};

// Create the product with options and an image
const createProductWithImageAndOptions = async (storeDomain, accessToken, product) => {
  const url = `https://${storeDomain}/admin/api/2024-07/graphql.json`;

  const mutation = `
    mutation {
      productCreate(
        input: {
          title: "${product.name}",
          descriptionHtml: "${product.description}",
          vendor: "Portal",
          productOptions: [
            {
              name: "Options",
              values: [${product.variants.map((variant) => `{ name: "${variant.variant_name}" }`).join(", ")}]
            }
          ]
        },
        media: [
          {
            originalSource: "${product.image_url}",
            alt: "Image for ${product.name}",
            mediaContentType: IMAGE
          }
        ]
      ) {
        product {
          id
          title
          options {
            name
            values
          }
          media(first: 1) {
            nodes {
              alt
              mediaContentType
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      url,
      { query: mutation },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    console.log("Product Creation Response:", JSON.stringify(data, null, 2));

    if (data.errors || (data.data.productCreate.userErrors.length > 0)) {
      const errors = data.data.productCreate.userErrors.map((err) => err.message).join(", ");
      throw new Error(`Product creation failed: ${errors}`);
    }

    return data.data.productCreate.product; // Return the created product
  } catch (error) {
    console.error("Error in createProductWithImageAndOptions utility:", error.message);
    throw error;
  }
};

// Create all possible variants for the product
const addVariantsToProduct = async (storeDomain, accessToken, externalProductId, price, variants) => {
  const url = `https://${storeDomain}/admin/api/2024-07/graphql.json`;

  const mutation = `
    mutation {
      productVariantsBulkCreate(
        productId: "${externalProductId}",
        strategy: REMOVE_STANDALONE_VARIANT,
        variants: [
          ${variants.map(
              (variant) => `{
                price: ${price},
                inventoryItem: {
                  sku: "${variant.sku}",
                  tracked: false
                }
                optionValues: [
                  ${variant.optionValues.map(
                    o => `{ optionName: "${o.name}", name: "${o.value}"}`
                  )}
                ]
              }`
            )
            .join(", ")}
        ]
      ) {
        productVariants {
          id
          title
          sku
          availableForSale
          price
          selectedOptions {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  console.log(mutation);

  try {
    const response = await axios.post(
      url,
      { query: mutation },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    console.log("Variant Creation Response:", JSON.stringify(data, null, 2));

    if (data.errors || (data.data?.productVariantsBulkCreate?.userErrors?.length > 0)) {
      const errors = data.data.productVariantsBulkCreate.userErrors.map((err) => err.message).join(", ");
      throw new Error(`Variant creation failed: ${errors}`);
    }

    return data.data.productVariantsBulkCreate.productVariants; // Return the created variants
  } catch (error) {
    console.error("Error in addVariantsToProduct utility:", error.message);
    throw error;
  }
};

const generateVariants = (variants, defaultPrice) => {
  return variants.map((variant) => ({
    color: variant.variant_name,
    price: variant.price || defaultPrice,
  }));
};



module.exports = {
  createProductWithImageAndOptions,
  addVariantsToProduct,
  generateVariants,
  initiateBulkOperation,
  pollBulkOperation,
  processJsonlFile,
  initiateBulkOperationForProducts,
  processProductsJsonlFile,
  processJsonlFileAndStore,
  addProductToShopify,
  createProductWithVariants,
};

  