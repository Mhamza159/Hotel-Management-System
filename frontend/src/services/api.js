import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { API_BASE_URL } from '../config/runtime';

// Web: VITE_API_BASE_URL ya '/api/v1'. Staff desktop: hotel Hub ka address.
const BASE_URL = API_BASE_URL;

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
    const statusCode = error.response?.status || 500;
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    const formattedError = {
      statusCode,
      message,
      errors: error.response?.data?.errors || [],
      // ~40 components `err?.response?.data?.message` parhte hain (axios style). Ye shape
      // na hone se server ka asal message ("room occupied", "balance due") kho jata tha
      // aur generic text dikhta tha (H9). Naye code me `err.message` parhein.
      response: { status: statusCode, data: { ...(error.response?.data || {}), message } },
    };

    return Promise.reject(formattedError);
  }
);

export default api;
