const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");
const config = require("../config/env");

/**
 * Catches 404 routes and forwards to error handler.
 */
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

/**
 * Centralized Express error handling middleware.
 * Normalizes Mongoose, JWT, and generic errors into ApiError envelopes.
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Normalize non-ApiError instances
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    let message = error.message || "Internal Server Error";

    // Handle Mongoose Bad ObjectId (CastError)
    if (error.name === "CastError") {
      message = `Invalid format for resource field: ${error.path}`;
      error = new ApiError(400, message);
    }
    // Handle Mongoose duplicate key error (code 11000)
    else if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || "field";
      message = `Duplicate value entered for ${field}. It must be unique.`;
      error = new ApiError(409, message);
    }
    // Handle Mongoose schema validation errors
    else if (error.name === "ValidationError") {
      const errors = Object.values(error.errors || {}).map((val) => val.message);
      message = errors.length > 0 ? errors.join(', ') : "Validation failed on database constraints";
      error = new ApiError(400, message, errors);
    }
    // Handle JWT errors
    else if (error.name === "JsonWebTokenError") {
      message = "Invalid authentication token. Please log in again.";
      error = new ApiError(401, message);
    } else if (error.name === "TokenExpiredError") {
      message = "Authentication token expired. Please refresh your session.";
      error = new ApiError(401, message);
    } else {
      error = new ApiError(statusCode, message, [], err.stack);
    }
  }

  // Log operational and unexpected errors
  if (error.statusCode >= 500) {
    logger.error(`[CRITICAL] ${error.message} - Stack: ${error.stack}`);
  } else {
    logger.warn(`[WARN] ${error.statusCode} - ${error.message}`);
  }

  const responsePayload = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(config.env === "development" && { stack: error.stack }),
  };

  res.status(error.statusCode).json(responsePayload);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
