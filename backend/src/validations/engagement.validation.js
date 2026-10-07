const Joi = require('joi');
const { ROOM_TYPES } = require('../config/constants');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createReviewSchema = {
  body: Joi.object({
    roomId: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'roomId must be a valid MongoDB ObjectId',
    }),
    bookingId: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'bookingId must be a valid MongoDB ObjectId',
    }),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(1000).allow('', null).optional(),
  }),
};

const reviewIdParamSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for review id',
    }),
  }),
};

const joinWaitlistSchema = {
  body: Joi.object({
    roomType: Joi.string().valid(...Object.values(ROOM_TYPES)).required(),
    checkIn: Joi.date().iso().required(),
    checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required().messages({
      'date.greater': 'checkOut must be after checkIn',
    }),
  }),
};

const waitlistIdParamSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for waitlist id',
    }),
  }),
};

const roomIdParamSchema = {
  params: Joi.object({
    roomId: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for room id',
    }),
  }),
};

module.exports = {
  createReviewSchema,
  reviewIdParamSchema,
  joinWaitlistSchema,
  waitlistIdParamSchema,
  roomIdParamSchema,
};
