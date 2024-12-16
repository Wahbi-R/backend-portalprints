// src/app.js
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../docs/swagger-output.json');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const storeRoutes = require('./routes/storeRoutes');
const shopifyRoutes = require('./routes/shopifyRoutes');
const webhookRoutes = require("./routes/webhookRoutes");

const fs = require('fs');
const path = require('path');

// Path to write the credentials file
const credentialsPath = path.join(__dirname, 'google-credentials.json');

// Check if the GOOGLE_CREDENTIALS_BASE64 environment variable exists
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  // Only write the file if it doesn't already exist
  if (!fs.existsSync(credentialsPath)) {
    // Decode the base64 string
    const credentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');

    // Write the JSON to a file
    fs.writeFileSync(credentialsPath, credentials);

    // Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to this file
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

    console.log('Google credentials file written successfully.');
  } else {
    console.log('Google credentials file already exists.');
  }
}


const app = express();
app.use((req, res, next) => {
  console.log(req.method, req.url, req.params);
  return next();
});

// Order of function calls matters here; needs to be called before parsing the body, 
// for HMAC verification
app.use("/webhooks", webhookRoutes);
// app.use("/hooks/fulfillment", fulfillmentRoutes);


app.use(cors());
app.use(express.json());
app.get("/", (req, res) => res.send({ message: "OK" }));


// API documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Define routes
app.use('/api', userRoutes);
app.use('/api', orderRoutes);
app.use('/api', productRoutes);
app.use('/api', storeRoutes);
app.use("/api", shopifyRoutes);
// app.use("/api", webhookRoutes);


module.exports = app;
