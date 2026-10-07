const { errorHandler, notFoundHandler } = require('../../src/middlewares/error.middleware');
const ApiError = require('../../src/utils/apiError');

describe('Error Middleware Verification', () => {
  let req, res, next;

  beforeEach(() => {
    req = { originalUrl: '/api/v1/invalid-route' };
    res = {
      statusCode: 200,
      status: jest.fn().mockImplementation(function (code) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn().mockImplementation(function (body) {
        this.body = body;
        return this;
      }),
    };
    next = jest.fn();
  });

  it('notFoundHandler forwards a 404 ApiError to next', () => {
    notFoundHandler(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('/api/v1/invalid-route');
  });

  it('errorHandler formats ApiError instances properly', () => {
    const error = new ApiError(403, 'Forbidden action', ['Missing permission']);
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 403,
        message: 'Forbidden action',
        errors: ['Missing permission'],
      })
    );
  });

  it('errorHandler converts Mongoose duplicate key error (code 11000) to 409', () => {
    const duplicateError = new Error('E11000 duplicate key');
    duplicateError.code = 11000;
    duplicateError.keyValue = { email: 'guest@hotel.com' };

    errorHandler(duplicateError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: expect.stringContaining('email'),
      })
    );
  });

  it('errorHandler converts JWT TokenExpiredError to 401', () => {
    const jwtError = new Error('jwt expired');
    jwtError.name = 'TokenExpiredError';

    errorHandler(jwtError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 401,
        message: expect.stringContaining('expired'),
      })
    );
  });
});
