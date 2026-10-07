const swaggerUi = require('swagger-ui-express');

/**
 * ============================================================================
 * OPENAPI / SWAGGER DOCUMENTATION CONFIGURATION
 * ============================================================================
 * 
 * Provides interactive API exploration and live testing at `/api-docs`.
 */

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Grand Horizon Hotel Management System API',
    version: '1.0.0',
    description:
      'Production-grade RESTful API for Hotel Reservation, Dynamic PBAC Administration, ACID Concurrency Control, Authoritative Refunds, and AI Concierge.',
    contact: {
      name: 'API Support Team',
      email: 'admin@hotel.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token (Bearer <token>)',
      },
      idempotencyKey: {
        type: 'apiKey',
        in: 'header',
        name: 'Idempotency-Key',
        description: 'Unique UUID v4 string for network retry protection',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: { type: 'string' },
            example: ['email must be a valid email'],
          },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'System health probe and uptime checks' },
    { name: 'Auth', description: 'Authentication, registration, and staff permission directory' },
    { name: 'Rooms', description: 'Physical room discovery, administrative CRUD, and housekeeping' },
    { name: 'Bookings', description: 'Atomic reservations, cancellation requests, and PDF invoices' },
    { name: 'Front Desk', description: 'Guest check-in, check-out, cash ledger intake, and cancellation approvals' },
    { name: 'Engagement', description: 'Verified reviews, loyalty points, waitlists, and wishlists' },
    { name: 'Admin & Analytics', description: 'Immutable audit trails, revenue metrics, ADR, RevPAR, and occupancy' },
    { name: 'AI Assistant', description: 'Role-scoped concierge tools and 2-step confirmation challenges' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'System health and uptime probe',
        responses: {
          200: { description: 'Server is healthy' },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new guest account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Hamza Guest' },
                  email: { type: 'string', example: 'hamza@hotel.com' },
                  password: { type: 'string', example: 'Password123!' },
                  phone: { type: 'string', example: '+923001234567' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate credentials and obtain JWT tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@hotel.com' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'guest@hotel.com' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Reset instructions dispatched' },
        },
      },
    },
    '/api/v1/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                  token: { type: 'string' },
                  newPassword: { type: 'string', example: 'NewPassword123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset successfully' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/api/v1/rooms/available': {
      get: {
        tags: ['Rooms'],
        summary: 'Search available rooms by date range and criteria',
        parameters: [
          { name: 'checkInDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'checkOutDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['single', 'double', 'deluxe', 'suite', 'presidential'] } },
        ],
        responses: {
          200: { description: 'Available rooms list' },
        },
      },
    },
    '/api/v1/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Atomic reservation creation with zero double-booking guarantee',
        security: [{ bearerAuth: [] }, { idempotencyKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['roomIds', 'checkInDate', 'checkOutDate'],
                properties: {
                  roomIds: { type: 'array', items: { type: 'string' } },
                  checkInDate: { type: 'string', format: 'date' },
                  checkOutDate: { type: 'string', format: 'date' },
                  numberOfGuests: { type: 'integer', default: 1 },
                  paymentMethod: { type: 'string', enum: ['stripe', 'cash', 'card', 'pay_at_desk'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Reservation created' },
          409: { description: 'Double-booking conflict prevented' },
        },
      },
    },
    '/api/v1/admin/bookings': {
      get: {
        tags: ['Admin & Analytics'],
        summary: 'Global administrative bookings directory with query filters',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: { description: 'Paginated bookings list' },
        },
      },
    },
    '/api/v1/admin/analytics/revenue': {
      get: {
        tags: ['Admin & Analytics'],
        summary: 'Calculate Total Revenue, ADR, and RevPAR',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Aggregated revenue metrics' },
        },
      },
    },
    '/api/v1/chat/user': {
      post: {
        tags: ['AI Assistant'],
        summary: 'Guest concierge chat with availability & booking tools',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Are there any deluxe rooms available tomorrow?' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Assistant response' },
        },
      },
    },
  },
};

const setupSwagger = (app) => {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'Hotel Management System API Docs',
    })
  );
};

module.exports = {
  setupSwagger,
  swaggerDocument,
};
