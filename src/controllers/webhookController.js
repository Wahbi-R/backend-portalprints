const express = require('express');

module.exports = {
  /**
   * @param {express.Request} req 
   * @param {express.Response} res 
   */
  handleTracking: async (req, res) => {
    // Return tracking number
  },

  /**
   * @param {express.Request} req 
   * @param {express.Response} res 
   */
  handleFulfillment: async (req, res) => {
    console.log(req.body);
    // Reference: https://shopify.dev/docs/apps/build/orders-fulfillment/fulfillment-service-apps/build-for-fulfillment-services#webhooks
    // Loop through fulfillment items
    // Select products handled by Portal
    // Set fulfillment status on our end
    // Update Shopify with fulfillment status for fulfillment_line_item
  },

  /**
   * @param {express.Request} req 
   * @param {express.Response} res 
   */
  handleAppUninstall: async (req, res) => {
    // Remove products from the requested store where Portal is the vendor
    // Remove store information from database
  },
}