/**
 * ============================================================================
 * RUNTIME ENVIRONMENT (WEB vs STAFF DESKTOP)
 * ============================================================================
 *
 * Electron staff desktop app preload script `window.hotelDesktop` expose karta hai.
 * Desktop mode me:
 * - API calls hotel Hub (LAN) par jati hain, cloud par nahi.
 * - Sirf staff routes available hain (guest portal aur registration band).
 */

export const desktopRuntime =
  typeof window !== 'undefined' && window.hotelDesktop?.isDesktop ? window.hotelDesktop : null;

export const isDesktop = Boolean(desktopRuntime);

export const API_BASE_URL =
  desktopRuntime?.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '/api/v1';
