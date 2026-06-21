const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const getBaseUrl = () => {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  const port = process.env.PORT || 5000;
  return process.env.NODE_ENV === 'production'
    ? `https://your-production-domain.com`
    : `http://localhost:${port}`;
};

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
        url: `${getBaseUrl()}/v1`,
        description: `${process.env.NODE_ENV || 'development'} server`,
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
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../models/*.js'),
    path.join(__dirname, '../validations/*.js'),
  ], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
