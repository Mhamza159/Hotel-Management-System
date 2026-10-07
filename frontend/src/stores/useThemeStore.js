import { create } from 'zustand';

/**
 * ============================================================================
 * THEME STATE STORE (LIGHT & DARK MODE)
 * ============================================================================
 * 
 * [URDU / HINGLISH EXPLANATION]:
 * Yeh store application ke theme (light ya dark) ko manage karta hai.
 * 1. Initial State: Pehle check karta hai ke kya user ne localStorage mein koi
 *    preference save ki hui hai (e.g. 'gh_hotel_theme'). Agar nahi, toh default 'dark' rakhta hai.
 * 2. DOM Sync: Jab bhi theme toggle hota hai, yeh automatically HTML root element (`<html>`)
 *    par 'light' ya 'dark' class add/remove karta hai taake Tailwind CSS aur custom CSS
 *    variables turant update ho sakein.
 * 3. Persistence: Preference ko localStorage mein write karta hai taake page reload hone
 *    par bhi user ka select kiya hua theme barkaraar rahe.
 * 
 * [ENGLISH EXPLANATION]:
 * Global reactive Zustand store managing application-wide Light & Dark mode state.
 * Synchronizes with DOM root (`document.documentElement`), updates colorScheme,
 * and maintains persistent user preference across all roles (Guests, Staff, Admins).
 */

const STORAGE_KEY = 'gh_hotel_theme';

// Helper function: LocalStorage se saved theme parhna ya system/default 'dark' lena
// Reads initial theme from localStorage safely without throwing SSR/browser exceptions
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (err) {
    console.warn('[useThemeStore] Unable to access localStorage:', err);
  }
  return 'dark'; // Modern futuristic hospitality-tech default
};

// Helper function: HTML element par theme classes aur attributes set karna
// Applies the theme to the <html> tag and sets CSS color-scheme
const applyThemeToDOM = (theme) => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  }
};

// Application load hone par pehli dafa DOM par theme apply karna
// Immediately sync DOM on module evaluation
const initialTheme = getInitialTheme();
applyThemeToDOM(initialTheme);

export const useThemeStore = create((set, get) => ({
  // Active theme: 'dark' ya 'light'
  theme: initialTheme,

  // Theme toggle action (Dark <-> Light switch)
  // Agar abhi dark hai toh light banayega, agar light hai toh dark
  toggleTheme: () => {
    const currentTheme = get().theme;
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    // 1. Update DOM root
    applyThemeToDOM(nextTheme);

    // 2. Persist in localStorage
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (err) {
      console.warn('[useThemeStore] Failed to save theme in localStorage:', err);
    }

    // 3. Update Zustand reactive state
    set({ theme: nextTheme });
  },

  // Explicit theme setter (Directly set 'light' or 'dark')
  setTheme: (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') return;

    applyThemeToDOM(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn('[useThemeStore] Failed to save theme in localStorage:', err);
    }

    set({ theme: newTheme });
  },
}));

export default useThemeStore;
