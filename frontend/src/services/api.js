import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Auth token and Idempotency Key
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Attach Idempotency-Key on booking creation requests
    if (config.url === '/bookings' && config.method?.toLowerCase() === 'post') {
      if (!config.headers['Idempotency-Key']) {
        config.headers['Idempotency-Key'] = crypto.randomUUID();
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Unwrap envelopes and handle 401 silent token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // If response is raw binary/blob (e.g. PDF invoice download), return response directly
    if (response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer') {
      return response;
    }
    // Unwrap standard backend envelope: { success: true, data: { ... } }
    if (response.data && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized with silent JWT refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Do not attempt refresh on auth endpoints (login, refresh-token itself)
      if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh-token')) {
        return Promise.reject(error.response?.data || error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState();

        if (!refreshToken) {
          logout();
          window.location.href = '/login';
          return Promise.reject(new Error('No refresh token available.'));
        }

        // Call refresh token endpoint using a clean axios call (bypassing interceptors)
        const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const resData = refreshResponse.data.data;
        const tokens = resData?.tokens || resData;
        setTokens(tokens);

        processQueue(null, tokens.accessToken);

        originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Standardize error payload
    const formattedError = {
      statusCode: error.response?.status || 500,
      message: error.response?.data?.message || error.message || 'An unexpected error occurred.',
      errors: error.response?.data?.errors || [],
    };

    return Promise.reject(formattedError);
  }
);

export default api;
