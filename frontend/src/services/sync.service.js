import api from './api';

/**
 * Hub <-> Cloud Sync Service (/api/v1/sync)
 */
export const syncService = {
  /**
   * Website: online booking abhi khuli hai? (hotel hub offline ho to band)
   * @returns {Promise<{ available: boolean, reason: string|null, lastHubContactAt: string|null }>}
   */
  async getAvailability() {
    return api.get('/sync/availability');
  },

  /**
   * Staff: hub par cloud sync ka haal + conflict wali bookings
   * @returns {Promise<{ node, enabled, online, lastSuccessAt, lastError, pendingChanges, conflictBookings }>}
   */
  async getStatus() {
    return api.get('/sync/status');
  },
};

export default syncService;
