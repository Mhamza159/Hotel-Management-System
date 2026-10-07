const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const { BOOKING_STATUS, ROLES } = require('../config/constants');
const ApiError = require('../utils/apiError');

/**
 * ============================================================================
 * REVIEW SERVICE (ENGAGE-02)
 * ============================================================================
 * 
 * Yeh service Hotel rooms ke verified reviews ki business logic sambhalti hai.
 * 
 * Key Principles:
 * 1. Zero Fake Reviews: Review sirf tab submit ho sakta hai jab guest ka booking
 *    status 'checked-out' ya 'completed' ho.
 * 2. Authenticity Check: Guest sirf un rooms ka review de sakta hai jo uski
 *    apni booking me waqayi shamil thay.
 * 3. 1 Review per Stay: Ek booking ke against sirf aik bar review allow hota hai.
 */
class ReviewService {
  /**
   * Submits a verified stay review.
   * 
   * @param {Object} params
   * @param {string} params.guestId - Logged-in guest user ID
   * @param {string} params.roomId - Target room ID
   * @param {string} params.bookingId - Associated booking ID
   * @param {number} params.rating - Rating from 1 to 5
   * @param {string} params.comment - Review feedback text
   * @returns {Promise<Object>} Created review document
   */
  static async createReview({ guestId, roomId, bookingId, rating, comment }) {
    if (!rating || rating < 1 || rating > 5) {
      throw ApiError.badRequest('Rating must be an integer between 1 and 5');
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      throw ApiError.badRequest('Review comment is required');
    }

    // 1. Check if room exists and is active
    const room = await Room.findById(roomId);
    if (!room || room.isDeleted) {
      throw ApiError.notFound('Room not found');
    }

    // 2. Find booking by ID
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    // 3. Verify that the booking belongs to this guest
    if (booking.userId.toString() !== guestId.toString()) {
      throw ApiError.forbidden('You can only review bookings made by your own account');
    }

    // 4. Verify that the room was part of this booking
    const hasRoom = booking.rooms.some(
      (r) => r.roomId.toString() === roomId.toString()
    );
    if (!hasRoom) {
      throw ApiError.badRequest('This room was not part of the specified booking');
    }

    // 5. Verify stay completion (Strictly checked-out or completed)
    const allowedStatuses = [BOOKING_STATUS.CHECKED_OUT, BOOKING_STATUS.COMPLETED];
    const currentStatus = booking.status || booking.bookingStatus;
    if (!allowedStatuses.includes(currentStatus)) {
      throw ApiError.forbidden(
        'Reviews are only permitted after completing a verified stay (checked-out or completed)'
      );
    }

    // 6. Check if review already exists for this booking
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      throw ApiError.conflict('A review has already been submitted for this booking');
    }

    // 7. Create review (triggers post-save hook for Room rating recalculation)
    const review = await Review.create({
      guestId,
      roomId,
      bookingId,
      rating,
      comment: comment.trim(),
      verifiedStay: true,
    });

    return review;
  }

  /**
   * Retrieves paginated reviews for a specific room.
   * 
   * @param {string} roomId
   * @param {Object} queryOptions
   * @param {number} [queryOptions.page=1]
   * @param {number} [queryOptions.limit=10]
   * @returns {Promise<Object>} Paginated review list with metadata
   */
  static async getRoomReviews(roomId, { page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find({ roomId })
        .populate('guestId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments({ roomId }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Deletes a review and atomically triggers rating recalculation.
   * 
   * @param {string} reviewId
   * @param {Object} user - Logged-in user document
   * @returns {Promise<Object>}
   */
  static async deleteReview(reviewId, user) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw ApiError.notFound('Review not found');
    }

    // Check ownership or super-admin privilege
    const isOwner = review.guestId.toString() === user._id.toString();
    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

    if (!isOwner && !isSuperAdmin) {
      throw ApiError.forbidden('You are not authorized to delete this review');
    }

    await Review.findOneAndDelete({ _id: reviewId });

    return { message: 'Review deleted successfully' };
  }
}

module.exports = ReviewService;
