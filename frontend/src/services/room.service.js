import api from './api';

/**
 * Room Catalog & Public Discovery Service
 * Connects directly to Node.js / Express Backend (/api/v1/rooms)
 */
export const roomService = {
  /**
   * Search available rooms with date overlap exclusion
   * @param {{ checkInDate, checkOutDate, type, capacity, minPrice, maxPrice, page, limit }} params
   * @returns {Promise<{ rooms: Array, pagination: Object }>}
   */
  async getAvailableRooms(params = {}) {
    const data = await api.get('/rooms/available', { params });
    if (Array.isArray(data)) {
      return { rooms: data, count: data.length };
    }
    return {
      rooms: data?.rooms || [],
      count: data?.count || data?.rooms?.length || 0,
    };
  },

  /**
   * Fetch single active room details
   * @param {string} id
   * @returns {Promise<{ room: Object }>}
   */
  async getRoomDetails(id) {
    return api.get(`/rooms/${id}`);
  },

  /**
   * Fetch paginated verified reviews for a room
   * @param {string} roomId
   * @param {{ page, limit }} params
   * @returns {Promise<{ reviews: Array, pagination: Object }>}
   */
  async getRoomReviews(roomId, params = {}) {
    return api.get(`/rooms/${roomId}/reviews`, { params });
  },
};

export default roomService;
