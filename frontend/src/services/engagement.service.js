import api from './api';

/**
 * Guest Engagement Service: Loyalty, Wishlist, Waitlist, and Verified Reviews
 * Connects directly to Node.js / Express Backend
 */
export const engagementService = {
  /**
   * Get authenticated guest's loyalty points balance & cash value
   * @returns {Promise<{ loyaltyPoints: number, discountValue: number }>}
   */
  async getLoyaltyBalance() {
    return api.get('/loyalty/balance');
  },

  /**
   * Get guest's saved wishlist of rooms
   * Backend returns a bare array of rooms; always resolves to an array.
   * @returns {Promise<Array>}
   */
  async getWishlist() {
    const data = await api.get('/wishlist');
    return Array.isArray(data) ? data : data?.wishlist || [];
  },

  /**
   * Add a room to wishlist
   * @param {string} roomId
   * @returns {Promise<{ message: string, wishlist: Array }>}
   */
  async addToWishlist(roomId) {
    return api.post(`/wishlist/${roomId}`);
  },

  /**
   * Remove a room from wishlist
   * @param {string} roomId
   * @returns {Promise<{ message: string, wishlist: Array }>}
   */
  async removeFromWishlist(roomId) {
    return api.delete(`/wishlist/${roomId}`);
  },

  /**
   * Get guest's active date waitlist subscriptions
   * Backend returns a bare array of entries; always resolves to an array.
   * @returns {Promise<Array>}
   */
  async getWaitlists() {
    const data = await api.get('/waitlist');
    return Array.isArray(data) ? data : data?.waitlists || [];
  },

  /**
   * Subscribe to sold-out date availability notifications
   * @param {{ roomType: string, checkIn: string, checkOut: string }} payload
   * @returns {Promise<{ waitlist: Object, message: string }>}
   */
  async joinWaitlist(payload) {
    return api.post('/waitlist', payload);
  },

  /**
   * Cancel waitlist subscription
   * @param {string} id
   * @returns {Promise<{ message: string }>}
   */
  async cancelWaitlist(id) {
    return api.delete(`/waitlist/${id}`);
  },

  /**
   * Submit a verified stay review on a checked-out booking
   * @param {{ bookingId: string, roomId: string, rating: number, comment: string }} payload
   * @returns {Promise<{ review: Object, message: string }>}
   */
  async createReview(payload) {
    return api.post('/reviews', payload);
  },

  /**
   * Delete a previously written review
   * @param {string} id
   * @returns {Promise<{ message: string }>}
   */
  async deleteReview(id) {
    return api.delete(`/reviews/${id}`);
  },
};

export default engagementService;
