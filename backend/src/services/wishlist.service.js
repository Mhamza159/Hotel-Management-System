const User = require('../models/User');
const Room = require('../models/Room');
const ApiError = require('../utils/apiError');

/**
 * ============================================================================
 * WISHLIST SERVICE (ENGAGE-04)
 * ============================================================================
 * 
 * Yeh service guest ke favorite rooms ko wishlist me bookmark karne aur
 * live details dekhne ki functionality provide karti hai.
 */
class WishlistService {
  /**
   * Adds a room to the guest's wishlist.
   * 
   * @param {string} userId - Guest ID
   * @param {string} roomId - Target room ID
   * @returns {Promise<Object>}
   */
  static async addToWishlist(userId, roomId) {
    const room = await Room.findById(roomId);
    if (!room || room.isDeleted) {
      throw ApiError.notFound('Room not found');
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { wishlist: room._id } },
      { new: true }
    ).populate('wishlist', 'roomNumber type description pricePerNight images averageRating totalReviews');

    return updatedUser.wishlist;
  }

  /**
   * Removes a room from the guest's wishlist.
   * 
   * @param {string} userId - Guest ID
   * @param {string} roomId - Target room ID
   * @returns {Promise<Object>}
   */
  static async removeFromWishlist(userId, roomId) {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { wishlist: roomId } },
      { new: true }
    ).populate('wishlist', 'roomNumber type description pricePerNight images averageRating totalReviews');

    return updatedUser.wishlist;
  }

  /**
   * Retrieves the guest's wishlist with populated room details and live pricing.
   * 
   * @param {string} userId - Guest ID
   * @returns {Promise<Array>}
   */
  static async getWishlist(userId) {
    const user = await User.findById(userId).populate({
      path: 'wishlist',
      match: { isDeleted: false },
      select: 'roomNumber type description pricePerNight images averageRating totalReviews housekeepingStatus isActive',
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user.wishlist || [];
  }
}

module.exports = WishlistService;
