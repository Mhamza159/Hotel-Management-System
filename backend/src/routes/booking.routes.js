const express = require('express');
const BookingController = require('../controllers/booking.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const idempotency = require('../middlewares/idempotency.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createBookingSchema,
  cancelBookingSchema,
  bookingIdParamSchema,
} = require('../validations/booking.validation');

const router = express.Router();

/**
 * ============================================================================
 * BOOKING ROUTES (/api/v1/bookings)
 * ============================================================================
 * 
 * Security Guard:
 * Tamam booking endpoints ko `authenticate` middleware ke peechhe rakha gaya hai.
 * Kisi bhi unauthenticated (bina login kiye hue) user ko 401 Unauthorized return hoga.
 */
router.use(authenticate);

// 1. Nayi reservation create karna (Idempotency Key protected)
// POST /api/v1/bookings
// Headers: Authorization: Bearer <token>, Idempotency-Key: <unique-uuid>
// Body: { roomIds: [...], checkInDate, checkOutDate, numberOfGuests, paymentMethod }
router.post('/', idempotency({ required: false }), validate(createBookingSchema), BookingController.createBooking);

// 2. Guest ki apni personal booking history dekhna
// GET /api/v1/bookings/my?page=1&limit=10
router.get('/my', BookingController.getMyBookings);

// 3. Kisi aik specific booking ki details dekhna
// GET /api/v1/bookings/:id
// Note: Controller ke andar check hota hai ke ya to ye is guest ki apni booking ho, ya phir user hotel staff ho.
router.get('/:id', validate(bookingIdParamSchema), BookingController.getBookingById);

// 4. Guest cancellation request submit karna
// POST /api/v1/bookings/:id/cancel-request
// Body: { reason: "Need to cancel due to unforeseen circumstances" }
router.post('/:id/cancel-request', validate(cancelBookingSchema), BookingController.requestCancellation);

// 5. Booking PDF Tax Invoice download/stream karna
// GET /api/v1/bookings/:id/invoice
// Returns: Content-Type: application/pdf binary stream
router.get('/:id/invoice', validate(bookingIdParamSchema), BookingController.downloadInvoice);

module.exports = router;
