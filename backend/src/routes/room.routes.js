const express = require("express");
const RoomController = require("../controllers/room.controller");
const EngagementController = require("../controllers/engagement.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { requirePermission, requireAnyPermission } = require("../middlewares/permission.middleware");
const { handleUploadImages } = require("../middlewares/upload.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  getAvailableRoomsSchema,
  createRoomSchema,
  updateRoomSchema,
  updateHousekeepingSchema,
  roomIdParamSchema,
} = require("../validations/room.validation");
const { PERMISSIONS } = require("../config/constants");

const router = express.Router();

/**
 * ============================================================================
 * ROOM ROUTES (/api/v1/rooms)
 * ============================================================================
 *
 * Yeh routes Hotel ke physical rooms ki public discovery, administrative CRUD,
 * aur Housekeeping cleanliness status ko manage karte hain.
 */

// ============================================================================
// 1. PUBLIC ENDPOINTS (No Login Required)
// ============================================================================

// 1.1 Available rooms ki search (Date overlap exclusion ke mutabiq)
// GET /api/v1/rooms/available?checkInDate=YYYY-MM-DD&checkOutDate=YYYY-MM-DD
router.get("/available", validate(getAvailableRoomsSchema), RoomController.getAvailableRooms);

// ============================================================================
// 2. ADMINISTRATIVE & STAFF MANAGEMENT ENDPOINTS (PBAC Protected)
// ============================================================================

// 2.1 Super-Admin & Staff All Rooms Directory (With Filters & Pagination)
// Note: Isko `/:id` se pehle mount karna lazmi hai taake 'admin' ko ID na samjha jaye.
// GET /api/v1/rooms/admin/all?page=1&limit=10&type=deluxe&housekeepingStatus=dirty
router.get(
  "/admin/all",
  authenticate,
  requireAnyPermission([PERMISSIONS.ROOMS_VIEW, PERMISSIONS.HOUSEKEEPING_UPDATE]),
  RoomController.getAdminRooms
);

// 2.2 Super-Admin Create New Physical Room Definition
// POST /api/v1/rooms
// Body: { roomNumber, type, pricePerNight, capacity, description, amenities }
router.post(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_CREATE),
  validate(createRoomSchema),
  RoomController.createRoom
);

// 2.3 Housekeeping Staff Cleanliness Status Transition
// PATCH /api/v1/rooms/:id/housekeeping
// Body: { housekeepingStatus: 'clean' | 'dirty' | 'cleaning' | 'maintenance', notes }
router.patch(
  "/:id/housekeeping",
  authenticate,
  requirePermission(PERMISSIONS.HOUSEKEEPING_UPDATE),
  validate(updateHousekeepingSchema),
  RoomController.updateHousekeeping
);

// 2.4 Super-Admin Update Room Specifications / Pricing
// PATCH /api/v1/rooms/:id
// Body: { pricePerNight, capacity, type, amenities, isActive }
router.patch(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_UPDATE),
  validate(updateRoomSchema),
  RoomController.updateRoom
);

// 2.5 Super-Admin Soft-Delete Room (Safeguarded against active bookings)
// DELETE /api/v1/rooms/:id
router.delete(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_DELETE),
  validate(roomIdParamSchema),
  RoomController.deleteRoom
);

// 2.6 Super-Admin Upload Room Photos (Multer In-Memory + Cloudinary Stream)
// POST /api/v1/rooms/:id/images
router.post(
  "/:id/images",
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_UPDATE),
  handleUploadImages("images", 5),
  RoomController.uploadImages
);

// 2.7 Super-Admin Delete Room Photo from Cloudinary & Database
// DELETE /api/v1/rooms/:id/images
router.delete(
  "/:id/images",
  authenticate,
  requirePermission(PERMISSIONS.ROOMS_UPDATE),
  RoomController.deleteImage
);

// ============================================================================
// 3. PUBLIC SINGLE ROOM DETAIL
// ============================================================================

// 3.1 Single active room details (Amenities, pictures, pricing)
// GET /api/v1/rooms/:id
router.get("/:id", RoomController.getRoomDetails);

// 3.2 Public paginated reviews for a room (ENGAGE-02)
// GET /api/v1/rooms/:id/reviews
router.get("/:id/reviews", EngagementController.getRoomReviews);

module.exports = router;
