import api from './api';

/**
 * Guest Booking & Reservation Service
 * Connects directly to Node.js / Express Backend (/api/v1/bookings)
 */
export const bookingService = {
  /**
   * Atomic reservation creation (Protected with Idempotency-Key)
   * @param {{ rooms: Array<{ roomId, pricePerNight }>, checkInDate, checkOutDate, numberOfGuests, specialRequests, paymentMethod }} payload
   * @returns {Promise<{ booking: Object }>}
   */
  async createBooking(payload) {
    return api.post('/bookings', payload);
  },

  /**
   * Retrieve logged-in guest's personal booking history
   * @param {{ page, limit }} params
   * @returns {Promise<{ bookings: Array, pagination: Object }>}
   */
  async getMyBookings(params = {}) {
    return api.get('/bookings/my', { params });
  },

  /**
   * Retrieve single booking details
   * @param {string} id
   * @returns {Promise<{ booking: Object }>}
   */
  async getBookingById(id) {
    return api.get(`/bookings/${id}`);
  },

  /**
   * Submit guest cancellation request
   * @param {string} id
   * @param {{ reason }} payload
   * @returns {Promise<{ booking: Object }>}
   */
  async requestCancellation(id, payload) {
    return api.post(`/bookings/${id}/cancel-request`, payload);
  },

  /**
   * Stream / download dynamic PDF Tax Invoice
   * @param {string} id
   * @param {string} bookingReference
   */
  async downloadInvoice(id, bookingReference = 'invoice') {
    const response = await api.get(`/bookings/${id}/invoice`, {
      responseType: 'blob',
    });

    // Create a temporary anchor to trigger browser file download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Invoice-${bookingReference}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Alias for downloadInvoice for backward compatibility
   */
  async downloadReceiptPdf(id, bookingReference = 'invoice') {
    return this.downloadInvoice(id, bookingReference);
  },
};

export default bookingService;
