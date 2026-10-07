const Joi = require('joi');
const { ROLES, PERMISSIONS } = require('../config/constants');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const registerSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).max(128).required(),
    phone: Joi.string().trim().allow('', null).optional(),
    role: Joi.string().valid(...Object.values(ROLES)).optional(),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().required(),
  }),
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const createStaffSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid(...Object.values(ROLES)).required(),
    phone: Joi.string().trim().allow('', null).optional(),
    permissions: Joi.array().items(Joi.string().valid(...Object.values(PERMISSIONS))).optional(),
    customPermissions: Joi.array().items(Joi.string().valid(...Object.values(PERMISSIONS))).optional(),
  }),
};

const updatePermissionsSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for user id',
    }),
  }),
  body: Joi.object({
    role: Joi.string().valid(...Object.values(ROLES)).optional(),
    permissions: Joi.array().items(Joi.string().valid(...Object.values(PERMISSIONS))).optional(),
    customPermissions: Joi.array().items(Joi.string().valid(...Object.values(PERMISSIONS))).optional(),
    resetToDefault: Joi.boolean().optional(),
  }),
};

const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().trim().email().required(),
  }),
};

const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  createStaffSchema,
  updatePermissionsSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
