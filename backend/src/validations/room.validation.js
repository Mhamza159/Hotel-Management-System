const Joi = require('joi');
const { ROOM_TYPES, HOUSEKEEPING_STATUS } = require('../config/constants');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const getAvailableRoomsSchema = {
  query: Joi.object({
    checkInDate: Joi.date().iso().optional(),
    checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).optional(),
    type: Joi.string().valid(...Object.values(ROOM_TYPES)).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    capacity: Joi.number().integer().min(1).optional(),
  }).unknown(true),
};

const createRoomSchema = {
  body: Joi.object({
    roomNumber: Joi.string().trim().required(),
    type: Joi.string().valid(...Object.values(ROOM_TYPES)).required(),
    pricePerNight: Joi.number().positive().required(),
    capacity: Joi.number().integer().min(1).required(),
    description: Joi.string().trim().allow('', null).optional(),
    amenities: Joi.array().items(Joi.string().trim()).optional(),
    housekeepingStatus: Joi.string().valid(...Object.values(HOUSEKEEPING_STATUS)).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

const updateRoomSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for room id',
    }),
  }),
  body: Joi.object({
    roomNumber: Joi.string().trim().optional(),
    type: Joi.string().valid(...Object.values(ROOM_TYPES)).optional(),
    pricePerNight: Joi.number().positive().optional(),
    capacity: Joi.number().integer().min(1).optional(),
    description: Joi.string().trim().allow('', null).optional(),
    amenities: Joi.array().items(Joi.string().trim()).optional(),
    housekeepingStatus: Joi.string().valid(...Object.values(HOUSEKEEPING_STATUS)).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

const updateHousekeepingSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for room id',
    }),
  }),
  body: Joi.object({
    housekeepingStatus: Joi.string().valid(...Object.values(HOUSEKEEPING_STATUS)).required().messages({
      'any.only': 'Invalid housekeeping status. Allowed: clean, dirty, cleaning, maintenance',
    }),
    notes: Joi.string().trim().allow('', null).optional(),
  }),
};

const roomIdParamSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for room id',
    }),
  }),
};

module.exports = {
  getAvailableRoomsSchema,
  createRoomSchema,
  updateRoomSchema,
  updateHousekeepingSchema,
  roomIdParamSchema,
};
