const Joi = require('joi');

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const deskBookingIdParamSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for booking id',
    }),
  }),
};

const recordDeskPaymentSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for booking id',
    }),
  }),
  body: Joi.object({
    amount: Joi.number().positive().required(),
    paymentMethod: Joi.string().valid('cash', 'offline-card', 'card').required(),
    paymentType: Joi.string().valid('full', 'partial', 'settlement').optional(),
    transactionReference: Joi.string().trim().allow('', null).optional(),
    notes: Joi.string().trim().allow('', null).optional(),
  }).unknown(true),
};

const deskOverviewQuerySchema = {
  query: Joi.object({
    type: Joi.string().valid('arrivals', 'departures', 'in-house').optional(),
    date: Joi.date().iso().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }).unknown(true),
};

const rejectCancellationSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for booking id',
    }),
  }),
  body: Joi.object({
    reason: Joi.string().trim().max(500).allow('', null).optional(),
    rejectionReason: Joi.string().trim().max(500).allow('', null).optional(),
  }),
};

const deskAllotRoomsSchema = {
  params: Joi.object({
    id: Joi.string().pattern(objectIdPattern).required().messages({
      'string.pattern.base': 'Invalid MongoDB ObjectId for booking id',
    }),
  }),
  body: Joi.object({
    allocations: Joi.array()
      .items(
        Joi.object({
          slotIndex: Joi.number().integer().min(0).default(0),
          allocatedRoomId: Joi.string().pattern(objectIdPattern).required().messages({
            'string.pattern.base': 'Invalid MongoDB ObjectId for allocatedRoomId',
          }),
          pricingPolicy: Joi.string().valid('recalculate', 'keep_original').optional(),
        })
      )
      .min(1)
      .required(),
  }),
};

const deskRoomsAllotmentStatusSchema = {
  query: Joi.object({
    bookingId: Joi.string().pattern(objectIdPattern).optional(),
    checkInDate: Joi.date().iso().optional(),
    checkOutDate: Joi.date().iso().optional(),
  }).unknown(true),
};

/**
 * [URDU / HINGLISH EXPLANATION]:
 * Front Desk Walk-In Guest Reservation Schema.
 * Receptionist ya Admin jab lobby mein anay walay walk-in guest ki taraf se booking
 * create karte hain toh ye validation ensure karti hai ke guest ka naam, phone,
 * rooms, aur valid check-in/out dates lazmi pass ki gayi hon.
 */
const createWalkInBookingSchema = {
  body: Joi.object({
    guestName: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'Walk-in guest full name is required',
    }),
    guestPhone: Joi.string().trim().min(7).max(20).required().messages({
      'any.required': 'Walk-in guest contact phone number is required',
    }),
    guestEmail: Joi.string().email().trim().lowercase().allow('', null).optional(),
    guestIdDocument: Joi.string().trim().max(50).allow('', null).optional(),
    roomIds: Joi.array()
      .items(Joi.string().pattern(objectIdPattern).messages({
        'string.pattern.base': 'Each roomId must be a valid 24-character hex ObjectId',
      }))
      .min(1)
      .required()
      .messages({
        'any.required': 'At least one valid room must be selected for walk-in booking',
      }),
    checkInDate: Joi.date().iso().required(),
    checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required().messages({
      'date.greater': 'Check-out date must be after check-in date',
    }),
    numberOfGuests: Joi.number().integer().min(1).default(1),
    specialRequests: Joi.string().trim().max(1000).allow('', null).optional(),
    paymentMethod: Joi.string()
      .valid('cash', 'offline-card', 'pay_later', 'stripe', 'card')
      .default('cash'),
    paymentAmount: Joi.number().min(0).optional(),
    instantCheckIn: Joi.boolean().default(true),
  }),
};

module.exports = {
  deskBookingIdParamSchema,
  deskAllotRoomsSchema,
  recordDeskPaymentSchema,
  deskOverviewQuerySchema,
  rejectCancellationSchema,
  deskRoomsAllotmentStatusSchema,
  createWalkInBookingSchema,
};


