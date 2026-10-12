const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const ApiError = require("../utils/apiError");
const User = require("../models/User");

/**
 * Generates short-lived JWT access token.
 * @param {string} userId
 * @returns {string} Signed JWT access token
 */
// tv = user.tokenVersion: badalne par (password reset / logout-all) purane tokens bekaar
const generateAccessToken = (userId, tokenVersion = 0) => {
  return jwt.sign({ id: userId, tv: tokenVersion }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn || "15m",
  });
};

/**
 * Generates long-lived JWT refresh token.
 * @param {string} userId
 * @returns {string} Signed JWT refresh token
 */
// jti: har refresh token ki apni ID — logout / rotation par RevokedToken me jati hai
const generateRefreshToken = (userId, tokenVersion = 0) => {
  return jwt.sign({ id: userId, tv: tokenVersion, jti: crypto.randomUUID() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn || "7d",
  });
};

/**
 * Verifies a JWT token with the provided secret.
 * @param {string} token
 * @param {string} secret
 * @returns {object} Decoded payload
 */
const verifyToken = (token, secret) => {
  return jwt.verify(token, secret);
};

/**
 * Express middleware to authenticate requests via Bearer JWT token.
 * Validates token signature, expiration, and user account status.
 * Attaches authenticated user document to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        401,
        "Authentication required. Please provide a valid Bearer token in Authorization header."
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new ApiError(401, "Bearer token is missing or malformed.");
    }

    // Verify token signature and expiration
    const decoded = verifyToken(token, config.jwt.secret);

    // Fetch user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(
        401,
        "User belonging to this token does not exist."
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        401,
        "User account has been deactivated. Please contact support."
      );
    }

    // Password reset / "sab devices se logout" ke baad purane tokens nahi chalte
    if ((decoded.tv || 0) !== (user.tokenVersion || 0)) {
      throw new ApiError(401, "Your session has ended. Please log in again.");
    }

    // Attach authenticated user to request context
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
};
