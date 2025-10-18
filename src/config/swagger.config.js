const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trosc API Documentation',
      version: '1.0.0',
      description: 'Official API documentation for the Trosc platform.',
      contact: {
        name: 'Basem Esam',
        url: 'https://github.com/basem3sam',
      },
    },
    servers: [
      {
        url: `http://127.0.0.1:5000/api/v1`,
        description: `${process.env.NODE_ENV} server`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'], // Auto-loads docs
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
