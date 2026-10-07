const User = require('../models/User');
const ApiError = require('../utils/apiError');

/**
 * ============================================================================
 * LOYALTY SERVICE (ENGAGE-01)
 * ============================================================================
 * 
 * Yeh service Hotel guests ke loyalty reward points system ko govern karti hai.
 * 
 * Key Rules:
 * 1. Accrual on Checkout: Har completed stay par $10 spent = 1 point earn hota hai.
 * 2. Balance Query: Guest apna live loyalty balance aur discount value check kar sakta hai.
 * 3. Checkout Redemption: 100 points = $10 discount ($0.10 per point) authoritative checkout par apply hota hai.
 */
class LoyaltyService {
  /**
   * Accrues loyalty points upon completed stay or checkout.
   * Rate: $10 spent = 1 loyalty point.
   * 
   * @param {Object} booking - Booking document
   * @returns {Promise<{ pointsAccrued: number, totalBalance: number }>}
   */
  static async accruePoints(booking) {
    if (!booking || !booking.userId) {
      return { pointsAccrued: 0, totalBalance: 0 };
    }

    const amount = Number(booking.totalPrice || booking.totalAmount || 0);
    const pointsAccrued = Math.floor(amount / 10);

    if (pointsAccrued <= 0) {
      const user = await User.findById(booking.userId).select('loyaltyPoints');
      return { pointsAccrued: 0, totalBalance: user ? user.loyaltyPoints : 0 };
    }

    const updatedUser = await User.findByIdAndUpdate(
      booking.userId,
      { $inc: { loyaltyPoints: pointsAccrued } },
      { new: true }
    );

    return {
      pointsAccrued,
      totalBalance: updatedUser ? updatedUser.loyaltyPoints : pointsAccrued,
    };
  }

  /**
   * Retrieves the current loyalty points balance and corresponding dollar value for a user.
   * 
   * @param {string} userId - User ObjectId
   * @returns {Promise<{ loyaltyPoints: number, discountValue: number }>}
   */
  static async getLoyaltyBalance(userId) {
    const user = await User.findById(userId).select('loyaltyPoints name email');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const loyaltyPoints = user.loyaltyPoints || 0;
    // 100 points = $10 ($0.10 per point)
    const discountValue = Number((loyaltyPoints * 0.1).toFixed(2));

    return {
      loyaltyPoints,
      discountValue,
    };
  }

  /**
   * Authoritatively redeems loyalty points for a checkout discount.
   * 
   * @param {string} userId - User ObjectId
   * @param {number} pointsToRedeem - Positive integer of points to spend
   * @param {Object} [session=null] - Optional MongoDB transaction session
   * @returns {Promise<{ redeemedPoints: number, discountAmount: number, remainingBalance: number }>}
   */
  static async redeemPoints(userId, pointsToRedeem, session = null) {
    const points = parseInt(pointsToRedeem, 10);
    if (isNaN(points) || points <= 0) {
      throw ApiError.badRequest('Points to redeem must be a positive number');
    }

    // Atomically ensure user has enough points before deducting (prevents race condition)
    const options = { new: true };
    if (session) {
      options.session = session;
    }

    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        loyaltyPoints: { $gte: points },
      },
      {
        $inc: { loyaltyPoints: -points },
      },
      options
    );

    if (!user) {
      throw ApiError.badRequest('Insufficient loyalty points balance');
    }

    // 100 points = $10 discount
    const discountAmount = Number(((points / 100) * 10).toFixed(2));

    return {
      redeemedPoints: points,
      discountAmount,
      remainingBalance: user.loyaltyPoints,
    };
  }
}

module.exports = LoyaltyService;
