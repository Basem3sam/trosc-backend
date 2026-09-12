const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const errorHandler = require('../src/controllers/error.controller');
const AppError = require('../src/utils/AppError');
const User = require('../src/models/user.model');

// Helper to create an Express app with a test route that throws errors
function createAppWithErrorRoute(errorToThrow, statusCode = 500) {
  const app = express();
  app.use(express.json());

  app.get('/test', (req, res, next) => {
    if (typeof errorToThrow === 'function') {
      errorToThrow(req, res, next);
    } else {
      next(errorToThrow);
    }
  });

  // A route that triggers a CastError (invalid ObjectId)
  app.get('/cast-error', (req, res, next) => {
    // This will trigger a CastError because the ID is invalid
    User.findById('invalid-id').catch(next);
  });

  // A route that triggers a duplicate key error
  app.post('/duplicate', async (req, res, next) => {
    try {
      await User.create({
        name: 'Duplicate',
        email: 'duplicate@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
      });
      // Second attempt will throw duplicate key error
      await User.create({
        name: 'Duplicate2',
        email: 'duplicate@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
      });
    } catch (err) {
      next(err);
    }
  });

  // A route that triggers a ValidationError
  app.post('/validation', async (req, res, next) => {
    try {
      await User.create({
        name: 'A', // too short
        email: 'invalid-email', // invalid
        password: '123', // too short
        passwordConfirm: '123',
      });
    } catch (err) {
      next(err);
    }
  });

  // A route that triggers a JWT error (invalid token)
  app.get('/jwt-error', (req, res, next) => {
    try {
      jwt.verify('invalid-token', 'secret');
    } catch (err) {
      next(err);
    }
  });

  // A route that throws a generic Error (non-operational)
  app.get('/generic-error', (req, res, next) => {
    throw new Error('Something went wrong');
  });

  app.use(errorHandler);

  return app;
}

describe('Error Controller', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  describe('Development environment', () => {
    it('sends full error details (stack trace) in development', async () => {
      process.env.NODE_ENV = 'development';
      const app = createAppWithErrorRoute(new AppError('Test error', 400));

      const res = await request(app).get('/test');
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Test error');
      expect(res.body.stack).toBeDefined();
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('sends operational error details (AppError) in production', async () => {
      const app = createAppWithErrorRoute(new AppError('User not found', 404));

      const res = await request(app).get('/test');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User not found');
      expect(res.body.stack).toBeUndefined();
      expect(res.body.error).toBeUndefined();
    });

    it('sends generic 500 for non-operational errors in production', async () => {
      const app = createAppWithErrorRoute(new Error('Some unexpected error'));

      const res = await request(app).get('/test');
      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe(
        'Something went wrong! Please try again later.',
      );
    });

    it('handles CastError (invalid ObjectId)', async () => {
      const app = createAppWithErrorRoute(null);
      const res = await request(app).get('/cast-error');
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Invalid .*: invalid-id/);
    });

    it('handles duplicate key error (11000)', async () => {
      // First, create a user to ensure duplicate
      await User.create({
        name: 'Duplicate Original',
        email: 'duplicate@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
      });

      const app = createAppWithErrorRoute(null);
      const res = await request(app).post('/duplicate').send({}); // body doesn't matter, the route does the creation

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(
        /Duplicate field value: "duplicate@example.com" for field "email"/,
      );
    });

    it('handles ValidationError', async () => {
      const app = createAppWithErrorRoute(null);
      const res = await request(app).post('/validation');
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Invalid Input data/);
    });

    it('handles JsonWebTokenError', async () => {
      const app = createAppWithErrorRoute(null);
      const res = await request(app).get('/jwt-error');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe(
        'Invalid authentication token. Please log in again.',
      );
    });

    it('handles TokenExpiredError', async () => {
      const app = createAppWithErrorRoute(null);
      const res = await request(app).get('/jwt-expired');
      // This test is timing‑sensitive; we can mock the error instead.
      // We'll create a route that directly throws a TokenExpiredError.
      // Directly trigger a TokenExpiredError via a dedicated route instead
      // of racing a real 1ms-expiring JWT.
      const app2 = express();
      app2.get('/token-expired', (req, res, next) => {
        const err = new jwt.TokenExpiredError('jwt expired', new Date());
        next(err);
      });
      app2.use(errorHandler);

      const res2 = await request(app2).get('/token-expired');
      expect(res2.status).toBe(401);
      expect(res2.body.status).toBe('fail');
      expect(res2.body.message).toBe(
        'Your authentication token has expired! Please log in again.',
      );
    });
  });
});
