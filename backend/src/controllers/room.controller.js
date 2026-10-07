const RoomService = require("../services/room.service");
const AuditService = require("../services/audit.service");
const ApiResponse = require("../utils/apiResponse");

/**
 * ============================================================================
 * ROOM CONTROLLER (HTTP Discovery Handler)
 * ============================================================================
 *
 * Yeh controller hotel rooms ki public discovery aur availability endpoints handle karta hai.
 * Guests bina login kiye bhi available rooms search kar sakte hain.
 */
class RoomController {
  /**
   * GET /api/v1/rooms/available
   * Date range aur filters ke mutabiq available kamron ki list return karta hai.
   * Query Parameters:
   *  - checkInDate (required)
   *  - checkOutDate (required)
   *  - type (optional: single, double, deluxe, suite)
   *  - minCapacity (optional: e.g. 2)
   *  - minPrice, maxPrice (optional budget bounds)
   */
  static async getAvailableRooms(req, res, next) {
    try {
      // 1. URL query string se search parameters extract karein
      const {
        checkInDate,
        checkOutDate,
        type,
        minCapacity,
        capacity,
        minPrice,
        maxPrice,
        excludeBookingId,
      } = req.query;

      // 2. RoomService ko call karein jo active overlapping bookings ko exclude karegi
      const availableRooms = await RoomService.findAvailableRooms({
        checkInDate,
        checkOutDate,
        type,
        minCapacity: minCapacity || capacity,
        minPrice,
        maxPrice,
        excludeBookingId,
      });

      // 3. Khush-gawar message ke sath available rooms ka array return karein
      return ApiResponse.success(
        res,
        200,
        availableRooms,
        `Found ${availableRooms.length} available room(s) for the selected dates`,
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/rooms/:id
   * Kisi aik specific kamre ki mukammal profile aur amenities dekhne ka endpoint.
   */
  static async getRoomDetails(req, res, next) {
    try {
      const { id } = req.params;
      const room = await RoomService.getRoomById(id);
      return ApiResponse.success(
        res,
        200,
        room,
        "Room details retrieved successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // SUPER-ADMIN ROOM CATALOG MANAGEMENT
  // ==========================================================================

  /**
   * POST /api/v1/rooms
   * Naya physical room catalog me create karne ka endpoint.
   * Gated: rooms:create
   */
  static async createRoom(req, res, next) {
    try {
      const room = await RoomService.createRoom(req.body);
      return ApiResponse.created(res, room, "Room created successfully in catalog.");
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/rooms/:id
   * Room rates, capacity, ya amenities update karne ka endpoint.
   * Gated: rooms:update
   */
  static async updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      const updatedRoom = await RoomService.updateRoom(id, req.body);
      return ApiResponse.success(
        res,
        200,
        updatedRoom,
        "Room details updated successfully."
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/rooms/:id
   * Room ko soft-delete karne ka endpoint.
   * Gated: rooms:delete
   */
  static async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      const result = await RoomService.softDeleteRoom(id);

      // Record immutable audit log
      await AuditService.logAction({
        actorId: req.user?._id,
        action: 'room:soft-delete',
        targetType: 'Room',
        targetId: id,
        beforeState: { isDeleted: false },
        afterState: { isDeleted: true },
        ipAddress: AuditService.getClientIp(req),
      });

      return ApiResponse.success(res, 200, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/rooms/admin/all
   * Super-Admin aur Staff ke liye hotel ke tamam rooms ki paginated list.
   * Query params: ?page=1&limit=10&type=deluxe&housekeepingStatus=dirty&search=101
   * Gated: rooms:view
   */
  static async getAdminRooms(req, res, next) {
    try {
      const result = await RoomService.getAdminRooms(req.query);
      return ApiResponse.success(
        res,
        200,
        result,
        "Admin rooms catalog retrieved successfully."
      );
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // HOUSEKEEPING WORKFLOW
  // ==========================================================================

  /**
   * PATCH /api/v1/rooms/:id/housekeeping
   * Housekeeping cleanliness status update karne ka endpoint (clean, dirty, cleaning, maintenance).
   * Gated: housekeeping:update
   */
  static async updateHousekeeping(req, res, next) {
    try {
      const { id } = req.params;
      const { housekeepingStatus, notes } = req.body;

      const result = await RoomService.updateHousekeepingStatus(id, {
        housekeepingStatus,
        notes,
      });

      return ApiResponse.success(res, 200, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // MEDIA MANAGEMENT
  // ==========================================================================

  /**
   * POST /api/v1/rooms/:id/images
   * Uploads photos to Cloudinary and attaches them to the room.
   * Gated: rooms:update
   */
  static async uploadImages(req, res, next) {
    try {
      const { id } = req.params;
      const updatedRoom = await RoomService.uploadRoomImages(id, req.files);
      return ApiResponse.success(
        res,
        200,
        updatedRoom,
        `Successfully uploaded ${req.files ? req.files.length : 0} image(s) to room.`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/rooms/:id/images
   * Body: { publicId }
   * Or DELETE /api/v1/rooms/:id/images/:publicId
   * Deletes a photo from Cloudinary remote CDN and removes from room.
   * Gated: rooms:update
   */
  static async deleteImage(req, res, next) {
    try {
      const { id } = req.params;
      const publicId = req.params.publicId || req.body.publicId || req.query.publicId;

      const result = await RoomService.deleteRoomImage(id, publicId);
      return ApiResponse.success(res, 200, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoomController;
