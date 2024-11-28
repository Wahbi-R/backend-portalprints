const axios = require('axios');
const readline = require('readline');
const shopifyModel = require('../models/shopifyModel')

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
  


module.exports = {
    initiateBulkOperation,
    pollBulkOperation,
    processJsonlFile,
    initiateBulkOperationForProducts,
    processProductsJsonlFile,
    processJsonlFileAndStore,
};
  