const ReviewService = require('../services/review.service');
const LoyaltyService = require('../services/loyalty.service');
const WaitlistService = require('../services/waitlist.service');
const WishlistService = require('../services/wishlist.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * ============================================================================
 * ENGAGEMENT CONTROLLER (Phase 7: Loyalty, Reviews, Wishlists & Waitlists)
 * ============================================================================
 */
class EngagementController {
  // --------------------------------------------------------------------------
  // 1. REVIEWS
  // --------------------------------------------------------------------------

  /**
   * POST /api/v1/reviews
   * Submits a verified stay review.
   */
  static async createReview(req, res, next) {
    try {
      const { roomId, bookingId, rating, comment } = req.body;
      const guestId = req.user._id;

      const review = await ReviewService.createReview({
        guestId,
        roomId,
        bookingId,
        rating,
        comment,
      });

      return ApiResponse.success(res, 201, review, 'Review submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/rooms/:id/reviews
   * Public paginated reviews for a room.
   */
  static async getRoomReviews(req, res, next) {
    try {
      const { id: roomId } = req.params;
      const { page, limit } = req.query;

      const result = await ReviewService.getRoomReviews(roomId, { page, limit });

      return ApiResponse.success(res, 200, result, 'Room reviews fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/reviews/:id
   * Deletes a review.
   */
  static async deleteReview(req, res, next) {
    try {
      const { id: reviewId } = req.params;
      const result = await ReviewService.deleteReview(reviewId, req.user);

      return ApiResponse.success(res, 200, result, 'Review deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------------------------
  // 2. LOYALTY POINTS
  // --------------------------------------------------------------------------

  /**
   * GET /api/v1/loyalty/balance
   * Returns current guest's loyalty points balance and discount cash value.
   */
  static async getLoyaltyBalance(req, res, next) {
    try {
      const result = await LoyaltyService.getLoyaltyBalance(req.user._id);

      return ApiResponse.success(res, 200, result, 'Loyalty points balance retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------------------------
  // 3. WAITLIST
  // --------------------------------------------------------------------------

  /**
   * POST /api/v1/waitlist
   * Joins availability waitlist for a sold-out room type.
   */
  static async joinWaitlist(req, res, next) {
    try {
      const { roomType, checkIn, checkOut } = req.body;
      const guestId = req.user._id;

      const entry = await WaitlistService.joinWaitlist({
        guestId,
        roomType,
        checkIn,
        checkOut,
      });

      return ApiResponse.success(res, 201, entry, 'Joined waitlist successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/waitlist
   * Retrieves all waitlist entries of current guest.
   */
  static async getGuestWaitlists(req, res, next) {
    try {
      const entries = await WaitlistService.getGuestWaitlists(req.user._id);

      return ApiResponse.success(res, 200, entries, 'Waitlist entries retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/waitlist/:id
   * Cancels a guest's active waitlist entry.
   */
  static async cancelWaitlist(req, res, next) {
    try {
      const { id: waitlistId } = req.params;
      const entry = await WaitlistService.cancelWaitlist(waitlistId, req.user._id);

      return ApiResponse.success(res, 200, entry, 'Waitlist entry cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------------------------------
  // 4. WISHLIST
  // --------------------------------------------------------------------------

  /**
   * GET /api/v1/wishlist
   * Retrieves current guest's bookmarked rooms.
   */
  static async getWishlist(req, res, next) {
    try {
      const wishlist = await WishlistService.getWishlist(req.user._id);

      return ApiResponse.success(res, 200, wishlist, 'Wishlist retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/wishlist/:roomId
   * Adds a room to guest's wishlist.
   */
  static async addToWishlist(req, res, next) {
    try {
      const { roomId } = req.params;
      const wishlist = await WishlistService.addToWishlist(req.user._id, roomId);

      return ApiResponse.success(res, 200, wishlist, 'Room added to wishlist successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/wishlist/:roomId
   * Removes a room from guest's wishlist.
   */
  static async removeFromWishlist(req, res, next) {
    try {
      const { roomId } = req.params;
      const wishlist = await WishlistService.removeFromWishlist(req.user._id, roomId);

      return ApiResponse.success(res, 200, wishlist, 'Room removed from wishlist successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EngagementController;
