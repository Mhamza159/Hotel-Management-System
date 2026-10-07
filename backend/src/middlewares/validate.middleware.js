const Joi = require('joi');
const ApiError = require('../utils/apiError');

/**
 * ============================================================================
 * JOI REQUEST VALIDATION MIDDLEWARE (POLISH-01)
 * ============================================================================
 * 
 * Inspects incoming request properties (body, query, params) against provided
 * Joi schemas. Rejects malformed requests with standard HTTP 422 (Unprocessable
 * Entity) and passes sanitized data down the middleware pipeline.
 *
 * @param {Object|Joi.Schema} schema - Object containing { body, query, params } or a raw Joi schema
 * @returns {Function} Express middleware function
 */
const validate = (schema) => (req, res, next) => {
  if (!schema) return next();

  let targets = {};

  if (Joi.isSchema(schema)) {
    targets.body = schema;
  } else {
    if (schema.params) targets.params = schema.params;
    if (schema.query) targets.query = schema.query;
    if (schema.body) targets.body = schema.body;
  }

  const errors = [];

  for (const [key, joiSchema] of Object.entries(targets)) {
    const dataToValidate = req[key] || {};

    const { error, value } = joiSchema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: key === 'query' || key === 'params', // Allow extra query/params by default if not strictly locked
      stripUnknown: false,
    });

    if (error) {
      const messages = error.details.map((detail) => detail.message.replace(/"/g, "'"));
      errors.push(...messages);
    } else {
      req[key] = value;
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest(errors[0] || 'Validation failed', errors));
  }

  return next();
};

module.exports = validate;
