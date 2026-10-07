const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const createBookingSchema = {
  body: Joi.object({
    roomIds: Joi.array()
      .items(
        Joi.string().pattern(objectIdPattern).messages({
          'string.pattern.base': 'Each roomId must be a valid 24-character hex ObjectId',
        })
      )
      .min(1)
      .optional(),
    rooms: Joi.array()
      .items(
        Joi.alternatives().try(
          Joi.string().pattern(objectIdPattern),
          Joi.object({
            roomId: Joi.string().pattern(objectIdPattern).required(),
            pricePerNight: Joi.number().optional(),
          })
        )
      )
      .min(1)
      .optional(),
    checkInDate: Joi.date().iso().required(),
    checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required().messages({
      'date.greater': 'checkOutDate must be after checkInDate',
    }),
    numberOfGuests: Joi.number().integer().min(1).default(1),
    specialRequests: Joi.string().trim().max(1000).allow('', null).optional(),
    paymentMethod: Joi.string().valid('stripe', 'cash', 'card', 'pay_at_desk', 'pay_now_stripe', 'offline-card', 'online').optional(),
    idempotencyKey: Joi.string().trim().allow('', null).optional(),
    couponCode: Joi.string().trim().uppercase().allow('', null).optional(),
    redeemLoyaltyPoints: Joi.boolean().optional(),
  }).or('roomIds', 'rooms'),
};

const cancelBookingSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for booking id',
    }),
  }),
  body: Joi.object({
    reason: Joi.string().trim().max(500).allow('', null).optional(),
  }),
};

const bookingIdParamSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for booking id',
    }),
  }),
};

module.exports = {
  createBookingSchema,
  cancelBookingSchema,
  bookingIdParamSchema,
};
