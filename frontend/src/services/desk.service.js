import api from './api';

/**
 * Front Desk Operations Service
 * Connects directly to Node.js / Express Backend (/api/v1/desk)
 */
export const deskService = {
  /**
   * Fetch front desk operational bookings (arrivals, departures, or in-house)
   * @param {{ type: 'arrivals' | 'departures' | 'in-house', date?: string, page?: number, limit?: number }} params
   * @returns {Promise<{ bookings: Array, pagination: Object }>}
   */
  async getOverview(params = {}) {
    return api.get('/desk/bookings', { params });
  },

  /**
   * Fetch live room inventory with allotment status (occupied, booked, clean available)
   * @param {{ bookingId?: string, checkInDate?: string, checkOutDate?: string }} params
   * @returns {Promise<Array>}
   */
  async getRoomsAllotmentStatus(params = {}) {
    return api.get('/desk/rooms-allotment-status', { params });
  },

  /**
   * Allot physical room(s) to booking slots (recalculates dynamic pricing)
   * @param {string} id
   * @param {{ allocations: Array<{ slotIndex: number, allocatedRoomId: string, pricingPolicy?: string }> }} payload
   * @returns {Promise<{ booking: Object }>}
   */
  async allotRooms(id, payload) {
    return api.patch(`/desk/bookings/${id}/allot-rooms`, payload);
  },

  /**
   * Execute guest check-in (Validates assigned room is clean & payment verified)
   * @param {string} id
   * @param {{ allocatedRoomId?: string }} [payload]
   * @returns {Promise<{ booking: Object }>}
   */
  async checkIn(id, payload = {}) {
    return api.patch(`/desk/bookings/${id}/check-in`, payload);
  },

  /**
   * Execute guest check-out (Auto-flips room to dirty)
   * @param {string} id
   * @returns {Promise<{ booking: Object }>}
   */
  async checkOut(id) {
    return api.patch(`/desk/bookings/${id}/check-out`);
  },

  /**
   * Record in-person cash or offline POS card payment (partial or full)
   * @param {string} id
   * @param {{ amount: number, paymentMethod: 'cash' | 'offline-card', transactionReference?: string, paymentType?: 'partial' | 'full' | 'settlement', notes?: string }} payload
   * @returns {Promise<{ payment: Object, booking: Object }>}
   */
  async recordPayment(id, payload) {
    return api.post(`/desk/bookings/${id}/payments`, payload);
  },

  /**
   * Fetch pending cancellation requests waiting for front desk audit
   * @param {{ page?: number, limit?: number }} params
   * @returns {Promise<{ requests: Array, pagination: Object }>}
   */
  async getCancellationRequests(params = {}) {
    return api.get('/desk/cancellation-requests', { params });
  },

  /**
   * Fetch authoritative cancellation review & refund calculation breakdown
   * @param {string} id
   * @returns {Promise<{ bookingId, bookingReference, hoursUntilCheckIn, tier, refundPercentage, totalPaid, refundAmount, cancellationFee }>}
   */
  async getCancellationReview(id) {
    return api.get(`/desk/bookings/${id}/cancellation-review`);
  },

  /**
   * Approve cancellation, void reservation, and release room inventory
   * @param {string} id
   * @returns {Promise<{ message: string, booking: Object }>}
   */
  async approveCancellation(id) {
    return api.patch(`/desk/bookings/${id}/cancel-approve`);
  },

  /**
   * Reject cancellation and restore booking to confirmed status
   * @param {string} id
   * @param {{ rejectionReason: string }} payload
   * @returns {Promise<{ message: string, booking: Object }>}
   */
  async rejectCancellation(id, payload) {
    return api.patch(`/desk/bookings/${id}/cancel-reject`, payload);
  },

  /**
   * Create a walk-in guest reservation directly from front desk
   * [URDU / HINGLISH]: Receptionist counter par aane walay walk-in guest ke liye direct booking
   * with instant check-in and payment options.
   * @param {Object} payload - { guestName, guestPhone, guestEmail, guestIdDocument, roomIds, checkInDate, checkOutDate, numberOfGuests, paymentMethod, paymentAmount, instantCheckIn, specialRequests }
   * @returns {Promise<{ data: Object }>}
   */
  async createWalkInBooking(payload) {
    return api.post('/desk/walk-in', payload);
  },
};

export default deskService;

