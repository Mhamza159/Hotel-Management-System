import api from './api';
import { useAuthStore } from '../stores/useAuthStore';

/**
 * Authentication & Identity Service
 * Connects directly to Node.js / Express Backend (/api/v1/auth)
 */
export const authService = {
  /**
   * User login (Guest or Staff)
   * @param {{ email, password }} credentials
   * @returns {Promise<{ user, tokens: { accessToken, refreshToken } }>}
   */
  async login(credentials) {
    const data = await api.post('/auth/login', credentials);
    if (data?.user && data?.tokens) {
      useAuthStore.getState().setAuth(data.user, data.tokens);
    }
    return data;
  },

  /**
   * Guest registration
   * @param {{ name, email, password, phone }} payload
   * @returns {Promise<{ user, tokens: { accessToken, refreshToken } }>}
   */
  async register(payload) {
    const data = await api.post('/auth/register', payload);
    if (data?.user && data?.tokens) {
      useAuthStore.getState().setAuth(data.user, data.tokens);
    }
    return data;
  },

  /**
   * Fetch current authenticated user profile
   * @returns {Promise<{ user }>}
   */
  async getMe() {
    const data = await api.get('/auth/me');
    if (data?.user) {
      useAuthStore.getState().updateUser(data.user);
    }
    return data;
  },

  /**
   * Request password reset token via email
   * @param {{ email }} payload
   * @returns {Promise<{ message }>}
   */
  async forgotPassword(payload) {
    return api.post('/auth/forgot-password', payload);
  },

  /**
   * Set new password using reset token
   * @param {{ token, password }} payload
   * @returns {Promise<{ message }>}
   */
  async resetPassword(payload) {
    return api.post('/auth/reset-password', payload);
  },

  /**
   * Terminate active user session
   */
  logout() {
    useAuthStore.getState().logout();
  },
};

export default authService;
