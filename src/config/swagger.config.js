const swaggerJsdoc = require('swagger-jsdoc');

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
        url: `${getBaseUrl()}/api/v1`,
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
      schemas: {
        // ============ USER SCHEMAS ============
        UserBase: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Basem Esam' },
            email: {
              type: 'string',
              format: 'email',
              example: 'basem@example.com',
            },
            photo: { type: 'string', example: 'default.jpg' },
            bio: {
              type: 'string',
              example: 'Backend Engineer | ICPC Competitor',
            },
            role: {
              type: 'string',
              enum: ['student', 'admin', 'instructor'],
              example: 'student',
            },
            enrolledTracks: {
              type: 'array',
              items: { type: 'string' },
              example: ['507f1f77bcf86cd799439012'],
            },
            active: { type: 'boolean', example: true },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-18T15:00:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-18T14:30:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-18T14:31:00.000Z',
            },
          },
        },
        UserCreate: {
          type: 'object',
          required: ['name', 'email', 'password', 'passwordConfirm'],
          properties: {
            name: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              example: 'Basem Esam',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'basem@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              example: 'StrongP@ssw0rd123',
            },
            passwordConfirm: {
              type: 'string',
              format: 'password',
              example: 'StrongP@ssw0rd123',
            },
            photo: { type: 'string', example: 'profile.jpg' },
            bio: {
              type: 'string',
              maxLength: 200,
              example: 'Backend Engineer | ICPC Competitor',
            },
          },
        },
        AuthLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'basem@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'StrongP@ssw0rd123',
            },
          },
        },

        // ============ TRACK SCHEMAS ============
        Track: {
          type: 'object',
          description:
            'Represents a learning track/course in the Trosc platform',
          required: ['title', 'description', 'instructor'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated MongoDB ObjectId',
              example: '507f1f77bcf86cd799439021',
            },
            title: {
              type: 'string',
              description: 'Unique title of the track',
              example: 'Full Stack Web Development',
              minLength: 3,
              maxLength: 100,
            },
            description: {
              type: 'string',
              description:
                'Detailed description of the track content and objectives',
              example:
                'Learn modern web development with JavaScript, React, Node.js and MongoDB',
            },
            instructor: {
              type: 'string',
              description: 'Reference to the User who instructs this track',
              example: '507f1f77bcf86cd799439011',
            },
            sessions: {
              type: 'array',
              description: 'List of sessions belonging to this track',
              items: { type: 'string', example: '507f1f77bcf86cd799439031' },
            },
            level: {
              type: 'string',
              description: 'Difficulty level suitable for this track',
              enum: ['beginner', 'intermediate', 'advanced', 'all'],
              default: 'all',
              example: 'beginner',
            },
            coverImage: {
              type: 'string',
              description: 'URL or filename for the track cover image',
              default: 'default-track.jpg',
              example: 'web-dev-cover.jpg',
            },
            published: {
              type: 'boolean',
              description: 'Whether the track is publicly available',
              default: false,
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the track was created',
              example: '2025-10-18T10:30:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the track was last updated',
              example: '2025-10-18T14:45:00.000Z',
            },
          },
        },
        TrackCreate: {
          type: 'object',
          description: 'Data required to create a new track',
          required: ['title', 'description', 'instructor'],
          properties: {
            title: { type: 'string', example: 'Full Stack Web Development' },
            description: {
              type: 'string',
              example:
                'Learn modern web development with JavaScript, React, Node.js and MongoDB',
            },
            instructor: { type: 'string', example: '507f1f77bcf86cd799439011' },
            level: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'all'],
              example: 'beginner',
            },
            coverImage: { type: 'string', example: 'web-dev-cover.jpg' },
            published: { type: 'boolean', example: true },
          },
        },
        TrackUpdate: {
          type: 'object',
          description: 'Data that can be updated for a track',
          properties: {
            title: { type: 'string', example: 'Updated Track Title' },
            description: {
              type: 'string',
              example: 'Updated track description',
            },
            instructor: { type: 'string', example: '507f1f77bcf86cd799439012' },
            level: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'all'],
              example: 'intermediate',
            },
            coverImage: { type: 'string', example: 'new-cover-image.jpg' },
            published: { type: 'boolean', example: false },
          },
        },
        TrackResponse: {
          type: 'object',
          description: 'Standard response format for track operations',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                track: { $ref: '#/components/schemas/Track' },
              },
            },
          },
        },
        TracksResponse: {
          type: 'object',
          description: 'Response format for multiple tracks',
          properties: {
            status: { type: 'string', example: 'success' },
            results: { type: 'integer', example: 5 },
            data: {
              type: 'object',
              properties: {
                tracks: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Track' },
                },
              },
            },
          },
        },

        // ============ SESSION SCHEMAS ============
        Resource: {
          type: 'object',
          description: 'Learning resource attached to a session',
          required: ['title', 'url'],
          properties: {
            title: {
              type: 'string',
              description: 'Title of the resource',
              example: 'JavaScript Arrays Cheat Sheet',
            },
            url: {
              type: 'string',
              description: 'URL to access the resource',
              format: 'uri',
              example: 'https://example.com/arrays-cheatsheet.pdf',
            },
          },
        },
        Session: {
          type: 'object',
          description:
            'Represents a learning session/class in the Trosc platform',
          required: ['title', 'instructor'],
          properties: {
            _id: {
              type: 'string',
              description: 'Auto-generated MongoDB ObjectId',
              example: '507f1f77bcf86cd799439031',
            },
            title: {
              type: 'string',
              description: 'Title of the session',
              example: 'JavaScript Functions Deep Dive',
            },
            description: {
              type: 'string',
              description: 'Detailed description of session content',
              example:
                'Learn about function declarations, expressions, arrow functions, and closures',
            },
            instructor: {
              type: 'string',
              description: 'User ID of the session instructor',
              example: '507f1f77bcf86cd799439011',
            },
            students: {
              type: 'array',
              description: 'List of enrolled students',
              items: { type: 'string', example: '507f1f77bcf86cd799439012' },
            },
            track: {
              type: 'string',
              description: 'Parent track ID (optional for standalone sessions)',
              example: '507f1f77bcf86cd799439021',
            },
            isStandalone: {
              type: 'boolean',
              description: 'Whether session exists independently of a track',
              default: false,
              example: true,
            },
            duration: {
              type: 'integer',
              description: 'Session duration in minutes',
              minimum: 1,
              example: 90,
            },
            level: {
              type: 'string',
              description: 'Difficulty level of the session',
              enum: ['beginner', 'intermediate', 'advanced'],
              default: 'beginner',
              example: 'intermediate',
            },
            coverImage: {
              type: 'string',
              description: 'Session cover image URL',
              example: 'functions-session-cover.jpg',
            },
            resources: {
              type: 'array',
              description: 'Learning resources for this session',
              items: { $ref: '#/components/schemas/Resource' },
            },
            published: {
              type: 'boolean',
              description: 'Whether session is publicly available',
              default: false,
              example: true,
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled start date/time for live sessions',
              example: '2025-10-20T14:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled end date/time for live sessions',
              example: '2025-10-20T15:30:00.000Z',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the session was created',
              example: '2025-10-18T09:15:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the session was last updated',
              example: '2025-10-19T16:45:00.000Z',
            },
          },
        },
        SessionCreate: {
          type: 'object',
          description: 'Data required to create a new session',
          required: ['title', 'instructor'],
          properties: {
            title: {
              type: 'string',
              example: 'JavaScript Functions Deep Dive',
            },
            description: {
              type: 'string',
              example:
                'Learn about function declarations, expressions, arrow functions, and closures',
            },
            instructor: { type: 'string', example: '507f1f77bcf86cd799439011' },
            track: { type: 'string', example: '507f1f77bcf86cd799439021' },
            isStandalone: { type: 'boolean', example: false },
            duration: { type: 'integer', example: 90 },
            level: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
              example: 'intermediate',
            },
            coverImage: {
              type: 'string',
              example: 'functions-session-cover.jpg',
            },
            resources: {
              type: 'array',
              items: { $ref: '#/components/schemas/Resource' },
            },
            published: { type: 'boolean', example: true },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-20T14:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-20T15:30:00.000Z',
            },
          },
        },
        SessionUpdate: {
          type: 'object',
          description: 'Data that can be updated for a session',
          properties: {
            title: { type: 'string', example: 'Updated Session Title' },
            description: {
              type: 'string',
              example: 'Updated session description',
            },
            instructor: { type: 'string', example: '507f1f77bcf86cd799439012' },
            track: { type: 'string', example: '507f1f77bcf86cd799439022' },
            isStandalone: { type: 'boolean', example: true },
            duration: { type: 'integer', example: 120 },
            level: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced'],
              example: 'advanced',
            },
            coverImage: { type: 'string', example: 'new-cover-image.jpg' },
            resources: {
              type: 'array',
              items: { $ref: '#/components/schemas/Resource' },
            },
            published: { type: 'boolean', example: false },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-25T10:00:00.000Z',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-10-25T12:00:00.000Z',
            },
          },
        },
        SessionResponse: {
          type: 'object',
          description: 'Standard response format for session operations',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                session: { $ref: '#/components/schemas/Session' },
              },
            },
          },
        },
        SessionsResponse: {
          type: 'object',
          description: 'Response format for multiple sessions',
          properties: {
            status: { type: 'string', example: 'success' },
            results: { type: 'integer', example: 8 },
            data: {
              type: 'object',
              properties: {
                sessions: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Session' },
                },
              },
            },
          },
        },

        // ============ COMMON SCHEMAS ============
        TokenResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/UserBase' },
              },
            },
          },
        },
        StandardError: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'fail' },
            message: { type: 'string', example: 'Error description here' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StandardError' },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StandardError' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StandardError' },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StandardError' },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
