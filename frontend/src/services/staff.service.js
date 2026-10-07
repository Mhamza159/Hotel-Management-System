import api from './api';

/**
 * Staff Directory & Dynamic PBAC Service
 * Connects directly to Node.js / Express Backend (/api/v1/auth)
 */
export const staffService = {
  /**
   * Fetch staff accounts list
   * @param {{ role?: string, search?: string }} params
   * @returns {Promise<{ count: number, staff: Array }>}
   */
  async getStaff(params = {}) {
    return api.get('/auth/staff', { params });
  },

  /**
   * Create a new staff account (receptionist, housekeeping, etc.)
   * @param {{ name: string, email: string, password: string, phone?: string, role: string }} payload
   * @returns {Promise<{ user: Object, message: string }>}
   */
  async createStaff(payload) {
    return api.post('/auth/staff', payload);
  },

  /**
   * Fetch system permission taxonomy & default role templates
   * @returns {Promise<{ roles: Array, permissions: Array, roleDefaultPermissions: Object }>}
   */
  async getPermissionsMetadata() {
    return api.get('/auth/permissions');
  },

  /**
   * Dynamically update a staff member's permissions or role
   * @param {string} id - Staff User ObjectId
   * @param {{ role?: string, permissions?: Array<string>, resetToDefault?: boolean, isActive?: boolean }} payload
   * @returns {Promise<{ user: Object, message: string }>}
   */
  async updatePermissions(id, payload) {
    return api.patch(`/auth/users/${id}/permissions`, payload);
  },
};

export default staffService;
