import api from './api';

/**
 * Housekeeping Operations Service
 * Connects directly to Node.js / Express Backend (/api/v1/rooms)
 */
export const housekeepingService = {
  /**
   * Fetch physical rooms for housekeeping board
   * @param {{ page?: number, limit?: number, housekeepingStatus?: string, type?: string, search?: string }} params
   * @returns {Promise<{ rooms: Array, pagination: Object }>}
   */
  async getRooms(params = {}) {
    return api.get('/rooms/admin/all', { params });
  },

  /**
   * Transition room cleanliness state
   * @param {string} id - Room ObjectId
   * @param {{ housekeepingStatus: 'clean' | 'dirty' | 'cleaning' | 'maintenance', notes?: string }} payload
   * @returns {Promise<{ room: Object, message: string }>}
   */
  async updateStatus(id, payload) {
    return api.patch(`/rooms/${id}/housekeeping`, payload);
  },
};

export default housekeepingService;
