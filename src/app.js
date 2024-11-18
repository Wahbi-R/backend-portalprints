// src/app.js
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../docs/swagger-output.json');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const storeRoutes = require('./routes/storeRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// API documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Define routes
app.use('/api', userRoutes);
app.use('/api', orderRoutes);
app.use('/api', productRoutes);
app.use('/api', storeRoutes);

module.exports = app;
