// swaggerAutogen.js
const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'API Documentation',
        description: 'Auto-generated documentation for the API',
    },
    host: 'localhost:5000',
    schemes: ['http'],
};

const outputFile = './docs/swagger-output.json'; // Path to output the generated file
const endpointsFiles = ['./src/routes/productRoutes.js', './src/routes/userRoutes.js', './src/routes/userRoutes.js']; // List your route files here

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log("Swagger documentation generated!");
});
