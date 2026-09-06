const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const getBaseUrl = () => {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  const port = process.env.PORT || 5000;
  return process.env.NODE_ENV === 'production'
    ? process.env.BASE_URL || 'https://your-production-domain.com'
    : `http://localhost:${port}`;
};

// Fix Windows backslashes in glob patterns
const globPath = (rel) => path.join(__dirname, rel).replace(/\\/g, '/');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trosc API Documentation',
      version: '1.0.0',
      description: 'Official API documentation for the Trosc platform.',
      contact: { name: 'Basem Esam', url: 'https://github.com/basem3sam' },
    },
    servers: [
      { url: `${getBaseUrl()}/v1`, description: 'API server' },
      { url: getBaseUrl(), description: 'Root server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication, registration & password management',
      },
      { name: 'Users', description: 'User profiles & admin management' },
      {
        name: 'Tracks',
        description:
          'Learning tracks, content organization & enrollment approvals',
      },
      {
        name: 'Courses',
        description: 'Courses within tracks & student enrollment',
      },
      { name: 'Sessions', description: 'Learning sessions & video content' },
      { name: 'Events', description: 'Club events, workshops & RSVP' },
      { name: 'Announcements', description: 'Pinned posts & targeted news' },
      {
        name: 'Reviews',
        description: 'Track feedback & ratings from enrolled students',
      },
      { name: 'Contact', description: 'Public contact form submission' },
      {
        name: 'Weekly Tasks',
        description: 'Per-item completion tracking and task deletion',
      },
      {
        name: 'Feed',
        description: 'Dashboard announcements + upcoming events',
      },
      { name: 'Health', description: 'Server & database health checks' },
    ],
  },
  apis: [
    globPath('../app.js'),
    globPath('../routes/*.js'),
    globPath('../models/*.js'),
  ],
};

module.exports = swaggerJsdoc(options);
