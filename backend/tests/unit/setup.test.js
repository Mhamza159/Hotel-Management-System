const mongoose = require('mongoose');
const ApiError = require('../../src/utils/apiError');
const ApiResponse = require('../../src/utils/apiResponse');
const config = require('../../src/config/env');
const dbHelper = require('../fixtures/db-helper');

describe('Phase 1 Baseline Setup Verification', () => {
  describe('ApiError Utility', () => {
    it('should correctly format operational API errors with status code', () => {
      const error = new ApiError(404, 'Resource not found', ['Invalid ID']);

      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.errors).toEqual(['Invalid ID']);
      expect(error.isOperational).toBe(true);
      expect(error.success).toBe(false);
      expect(error.stack).toBeDefined();
    });

    it('should default to status code 500 when called with default params', () => {
      const error = new ApiError(500);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Something went wrong');
    });
  });

  describe('ApiResponse Utility', () => {
    it('should format standard success responses with success=true for 2xx', () => {
      const payload = { roomNumber: '101', price: 150 };
      const response = new ApiResponse(200, payload, 'Room details fetched');

      expect(response.statusCode).toBe(200);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Room details fetched');
      expect(response.data).toEqual(payload);
    });

    it('should mark success=false for status codes >= 400', () => {
      const response = new ApiResponse(400, null, 'Bad Request');
      expect(response.statusCode).toBe(400);
      expect(response.success).toBe(false);
    });
  });

  describe('Environment Config Validation', () => {
    it('should load validated environment configuration', () => {
      expect(config.port).toBeDefined();
      expect(config.env).toBeDefined();
      expect(config.mongoUri).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
      expect(config.jwt.refreshSecret).toBeDefined();
    });
  });

  describe('MongoMemoryServer Test Harness', () => {
    beforeAll(async () => {
      await dbHelper.connect();
    });

    afterAll(async () => {
      await dbHelper.disconnect();
    });

    afterEach(async () => {
      await dbHelper.clearDatabase();
    });

    it('should successfully write and retrieve documents from in-memory MongoDB', async () => {
      const TestSchema = new mongoose.Schema({ name: String, active: Boolean });
      const TestModel = mongoose.model('TestEntity', TestSchema);

      const created = await TestModel.create({ name: 'Suite 301', active: true });
      expect(created._id).toBeDefined();

      const found = await TestModel.findOne({ name: 'Suite 301' });
      expect(found).not.toBeNull();
      expect(found.name).toBe('Suite 301');
      expect(found.active).toBe(true);
    });
  });
});
