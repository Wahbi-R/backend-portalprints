const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Verify requests before the body is parsed
router.use(async (req, res, next) => {
  // Shopify drops a connection after 5 seconds with no 200 OK, so send response ASAP
  res.status(200).send(); 

  // TODO: VERIFY SHOPIFY SIGNATURE!!! (easier to use the ShopifyApp from the @shopify/shopify-app-remix library)
  // https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-2-validate-the-origin-of-your-webhook-to-ensure-its-coming-from-shopify
  // TODO: Use Shopify's abstraction instead, otherwise need to retain rawBody (as string buffer, not parsed)
  const hmac = req.headers["X-Shopify-Hmac-SHA256"];
  console.log("Body", req.body);
  console.log("Verify HMAC", hmac);
  
  // validate store; maybe use storeDomain in path params?
  const store = undefined;

  // signature is OK
  if (true) {
    return next();
  } else {
    // call cannot be verified as coming from Shopify
    console.warn("HMAC could not be verified");
  }
});


// It is now safe to parse the body
router.use(express.json());

// Fulfillment routes
router.post("/fulfillment/fetch_tracking_numbers", webhookController.handleTracking);
// router.post("/fetch_stock", webhookController.handleInventory);
router.post("/fulfillment/fulfillment_order_notification", webhookController.handleFulfillment);

// Add other Shopify webhook routes as defined in shopify.app*.toml
router.post("/app/uninstalled", webhookController.handleAppUninstall);

module.exports = router;
