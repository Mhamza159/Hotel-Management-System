import { api } from './api';

/**
 * Administrative, Managerial Analytics, and Security Audit Service
 */
export const adminService = {
  /**
   * Fetch Revenue metrics, ADR, RevPAR, and financial breakdowns
   * @param {Object} [params] - { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
   */
  async getRevenueAnalytics(params = {}) {
    return api.get('/admin/analytics/revenue', { params });
  },

  /**
   * Fetch Occupancy rate and room utilization for a specific date
   * @param {Object} [params] - { date: 'YYYY-MM-DD' }
   */
  async getOccupancyAnalytics(params = {}) {
    return api.get('/admin/analytics/occupancy', { params });
  },

  /**
   * Search payment transactions by Payment ID (_id), Booking reference (GH-XXXXX), or POS Slip
   * @param {string} query - Identifier or reference string
   */
  async searchPayment(query) {
    return api.get('/admin/analytics/payments/search', { params: { query } });
  },

  /**
   * Fetch immutable security audit logs with pagination and filters
   * @param {Object} [params] - { page, limit, action, targetType, fromDate, toDate, actorId }
   */
  async getAuditLogs(params = {}) {
    return api.get('/admin/audit-log', { params });
  },

  /**
   * Fetch global reservations directory with multi-filters and pagination
   * @param {Object} [params] - { page, limit, status, paymentStatus, fromDate, toDate, search }
   */
  async getAllBookings(params = {}) {
    return api.get('/admin/bookings', { params });
  },

  /**
   * Fetch all rooms including inactive and dirty rooms for admin management
   * @param {Object} [params] - { page, limit, type, housekeepingStatus, search }
   */
  async getAdminRooms(params = {}) {
    return api.get('/rooms/admin/all', { params });
  },

  /**
   * Create a new physical room specification
   * @param {Object} data - { roomNumber, type, pricePerNight, capacity, description, amenities, isActive }
   */
  async createRoom(data) {
    return api.post('/rooms', data);
  },

  /**
   * Update existing room specification
   * @param {string} id - Room ObjectId
   * @param {Object} data - { pricePerNight, capacity, type, amenities, isActive, description }
   */
  async updateRoom(id, data) {
    return api.patch(`/rooms/${id}`, data);
  },

  /**
   * Soft-delete a room (safeguarded against active reservations)
   * @param {string} id - Room ObjectId
   */
  async deleteRoom(id) {
    return api.delete(`/rooms/${id}`);
  },

  /**
   * Upload room gallery photos to Cloudinary
   * @param {string} id - Room ObjectId
   * @param {FormData} formData - Contains 'images' files
   */
  async uploadRoomImages(id, formData) {
    return api.post(`/rooms/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Delete specific photo from room gallery and Cloudinary
   * @param {string} id - Room ObjectId
   * @param {string} publicId - Cloudinary asset public ID
   */
  async deleteRoomImage(id, publicId) {
    return api.delete(`/rooms/${id}/images`, { data: { publicId } });
  },
};

export default adminService;
