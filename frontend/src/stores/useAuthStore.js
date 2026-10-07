import { create } from 'zustand';

const STORAGE_KEY = 'grand_horizon_auth';

// Read initial state from localStorage
const getSavedAuth = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse saved auth session:', e);
  }
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
  };
};

const initialData = getSavedAuth();

export const useAuthStore = create((set, get) => ({
  user: initialData.user,
  accessToken: initialData.accessToken,
  refreshToken: initialData.refreshToken,
  isAuthenticated: Boolean(initialData.accessToken),

  setAuth: (user, tokens) => {
    const authData = {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    } catch (e) {
      console.error('Failed to persist auth session:', e);
    }
    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
    });
  },

  setTokens: (tokens) => {
    const currentUser = get().user;
    const authData = {
      user: currentUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || get().refreshToken,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    } catch (e) {
      console.error('Failed to persist token refresh:', e);
    }
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || get().refreshToken,
      isAuthenticated: true,
    });
  },

  updateUser: (userUpdates) => {
    const updatedUser = { ...get().user, ...userUpdates };
    const authData = {
      user: updatedUser,
      accessToken: get().accessToken,
      refreshToken: get().refreshToken,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    } catch (e) {
      console.error('Failed to persist user update:', e);
    }
    set({ user: updatedUser });
  },

  logout: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear auth session:', e);
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
