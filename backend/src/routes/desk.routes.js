const express = require("express");
const DeskController = require("../controllers/desk.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  requirePermission,
  requireAnyPermission,
} = require("../middlewares/permission.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  deskBookingIdParamSchema,
  deskAllotRoomsSchema,
  recordDeskPaymentSchema,
  deskOverviewQuerySchema,
  rejectCancellationSchema,
  deskRoomsAllotmentStatusSchema,
  createWalkInBookingSchema,
} = require("../validations/desk.validation");
const { PERMISSIONS } = require("../config/constants");

const router = express.Router();

/**
 * ============================================================================
 * FRONT DESK ROUTES (/api/v1/desk)
 * ============================================================================
 * 
 * Yeh routes Front Desk Staff (Receptionists) aur Hotel Administrators ke liye hain.
 * 
 * Security Architecture:
 * 1. `authenticate` Middleware:
 *    Tamam desk routes JWT token se protected hain. Unauthenticated guest ya visitor
 *    in endpoints tak access nahi kar sakta (401 Unauthorized).
 * 2. Granular Dynamic PBAC (Permission-Based Access Control):
 *    Role hardcode karne ke bajaye granular permissions check hoti hain. Agar kisi
 *    staff member ke paas specific action ki permission na ho toh 403 Forbidden return hoga.
 */

// Global Security Guard: Tamam desk routes ke liye user ka logged-in hona lazmi hai
router.use(authenticate);

// ----------------------------------------------------------------------------
// 0A. WALK-IN GUEST RESERVATION & LOBBY SETTLEMENT
// ----------------------------------------------------------------------------
// POST /api/v1/desk/walk-in
router.post(
  "/walk-in",
  requirePermission(PERMISSIONS.BOOKINGS_CREATE),
  validate(createWalkInBookingSchema),
  DeskController.createWalkInBooking
);

// ----------------------------------------------------------------------------
// 0B. ROOMS ALLOTMENT STATUS (Real-time Occupancy & Booked Indicators)
// ----------------------------------------------------------------------------
// GET /api/v1/desk/rooms-allotment-status?bookingId=...
router.get(
  "/rooms-allotment-status",
  requireAnyPermission([PERMISSIONS.CHECKIN_MANAGE, PERMISSIONS.ROOMS_VIEW]),
  validate(deskRoomsAllotmentStatusSchema),
  DeskController.getRoomsAllotmentStatus
);

// ----------------------------------------------------------------------------
// 1. ALLOT ROOMS ENDPOINT (Single or Multi-Room Selection)
// ----------------------------------------------------------------------------
// PATCH /api/v1/desk/bookings/:id/allot-rooms
router.patch(
  "/bookings/:id/allot-rooms",
  requirePermission(PERMISSIONS.CHECKIN_MANAGE),
  validate(deskAllotRoomsSchema),
  DeskController.allotRooms
);

// ----------------------------------------------------------------------------
// 2. GUEST CHECK-IN ENDPOINT
// ----------------------------------------------------------------------------
// PATCH /api/v1/desk/bookings/:id/check-in
router.patch(
  "/bookings/:id/check-in",
  requirePermission(PERMISSIONS.CHECKIN_MANAGE),
  validate(deskBookingIdParamSchema),
  DeskController.checkIn
);

// ----------------------------------------------------------------------------
// 2. GUEST CHECK-OUT ENDPOINT
// ----------------------------------------------------------------------------
// PATCH /api/v1/desk/bookings/:id/check-out
router.patch(
  "/bookings/:id/check-out",
  requirePermission(PERMISSIONS.CHECKOUT_MANAGE),
  validate(deskBookingIdParamSchema),
  DeskController.checkOut
);

// ----------------------------------------------------------------------------
// 3. RECORD IN-PERSON DESK PAYMENT (CASH / OFFLINE CARD)
// ----------------------------------------------------------------------------
// POST /api/v1/desk/bookings/:id/payments
router.post(
  "/bookings/:id/payments",
  requireAnyPermission([
    PERMISSIONS.PAYMENTS_RECORD_CASH,
    PERMISSIONS.PAYMENTS_RECORD_CARD,
  ]),
  validate(recordDeskPaymentSchema),
  DeskController.recordPayment
);

// ----------------------------------------------------------------------------
// 4. FRONT DESK OPERATIONAL OVERVIEW DASHBOARD
// ----------------------------------------------------------------------------
// GET /api/v1/desk/bookings?type=arrivals&date=2026-12-01&page=1&limit=10
router.get(
  "/bookings",
  requirePermission(PERMISSIONS.BOOKINGS_VIEW),
  validate(deskOverviewQuerySchema),
  DeskController.getOverview
);

// ----------------------------------------------------------------------------
// 5. LIST PENDING CANCELLATION REQUESTS
// ----------------------------------------------------------------------------
// GET /api/v1/desk/cancellation-requests?page=1&limit=10
router.get(
  "/cancellation-requests",
  requirePermission(PERMISSIONS.BOOKINGS_VIEW),
  DeskController.getCancellationRequests
);

// ----------------------------------------------------------------------------
// 6. CANCELLATION INSPECTION & POLICY REVIEW
// ----------------------------------------------------------------------------
// GET /api/v1/desk/bookings/:id/cancellation-review
router.get(
  "/bookings/:id/cancellation-review",
  requirePermission(PERMISSIONS.BOOKINGS_CANCEL),
  validate(deskBookingIdParamSchema),
  DeskController.getCancellationReview
);

// ----------------------------------------------------------------------------
// 7. APPROVE CANCELLATION
// ----------------------------------------------------------------------------
// PATCH /api/v1/desk/bookings/:id/cancel-approve
router.patch(
  "/bookings/:id/cancel-approve",
  requirePermission(PERMISSIONS.BOOKINGS_CANCEL),
  validate(deskBookingIdParamSchema),
  DeskController.approveCancellation
);

// ----------------------------------------------------------------------------
// 8. REJECT CANCELLATION
// ----------------------------------------------------------------------------
// PATCH /api/v1/desk/bookings/:id/cancel-reject
router.patch(
  "/bookings/:id/cancel-reject",
  requirePermission(PERMISSIONS.BOOKINGS_CANCEL),
  validate(rejectCancellationSchema),
  DeskController.rejectCancellation
);

module.exports = router;
