import { api } from './api';
import { ROLES } from '../config/constants';

/**
 * Multi-Role AI Assistant & Administrative Copilot Service
 */
export const chatService = {
  /**
   * Dispatches chat message or tool execution to role-scoped endpoint
   * @param {Object} payload - { message, toolCallName, toolCallArgs }
   * @param {string} userRole - 'super-admin' | 'receptionist' | 'housekeeping' | 'guest'
   */
  async sendMessage(payload, userRole) {
    if (userRole === ROLES.SUPER_ADMIN) {
      return api.post('/chat/admin', payload);
    }
    if (userRole === ROLES.RECEPTIONIST) {
      return api.post('/chat/staff', payload);
    }
    // Default to Guest AI Assistant
    return api.post('/chat/user', payload);
  },

  /**
   * Guest AI Assistant: strictly read-only tools scoped to caller
   * @param {Object} payload - { message, toolCallName, toolCallArgs }
   */
  async sendGuestMessage(payload) {
    return api.post('/chat/user', payload);
  },

  /**
   * Staff AI Assistant: operational lookups (arrivals, statuses, occupancy)
   * @param {Object} payload - { message, toolCallName, toolCallArgs }
   */
  async sendStaffMessage(payload) {
    return api.post('/chat/staff', payload);
  },

  /**
   * Super-Admin AI Assistant: full operational queries and prepare-mutation protocol
   * @param {Object} payload - { message, toolCallName, toolCallArgs }
   */
  async sendAdminMessage(payload) {
    return api.post('/chat/admin', payload);
  },

  /**
   * Executes two-phase dry-run mutation using signed JWT confirmationToken
   * @param {string} confirmationToken
   */
  async confirmAdminAction(confirmationToken) {
    return api.post('/chat/admin/confirm', { confirmationToken });
  },
};

export default chatService;
