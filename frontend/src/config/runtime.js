/**
 * ============================================================================
 * RUNTIME ENVIRONMENT (WEB vs STAFF DESKTOP vs STAFF ANDROID)
 * ============================================================================
 *
 * Electron staff desktop app preload script `window.hotelDesktop` expose karta hai.
 * Android staff app (Capacitor, `mobile/`) me `window.Capacitor` native bridge hota hai;
 * wahan Hub ka address phone ke andar (localStorage) save hota hai.
 *
 * Dono staff apps (desktop + Android) me:
 * - API calls hotel Hub (LAN) par jati hain, cloud par nahi.
 * - Sirf staff routes available hain (guest portal aur registration band).
 */

const HUB_URL_KEY = 'grand_horizon_hub_url';

const readStoredHubUrl = () => {
  try {
    return window.localStorage.getItem(HUB_URL_KEY) || null;
  } catch {
    return null;
  }
};

/**
 * "192.168.1.10:5000" ya "http://192.168.1.10:5000/" -> "http://192.168.1.10:5000"
 * @returns {string|null} null agar address sahi nahi
 */
export const normalizeHubUrl = (value) => {
  let text = String(value || '').trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`;
  try {
    const url = new URL(text);
    if (url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
};

export const saveMobileHubUrl = (hubUrl) => {
  window.localStorage.setItem(HUB_URL_KEY, hubUrl);
};

const isNativeMobile =
  typeof window !== 'undefined' &&
  Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

const createMobileRuntime = () => {
  const hubUrl = readStoredHubUrl();
  return {
    isDesktop: true,
    isMobile: true,
    hubUrl,
    apiBaseUrl: hubUrl ? `${hubUrl}/api/v1` : null,
  };
};

export const desktopRuntime =
  typeof window !== 'undefined' && window.hotelDesktop?.isDesktop
    ? window.hotelDesktop
    : isNativeMobile
      ? createMobileRuntime()
      : null;

// Staff-only app (desktop ya Android)
export const isDesktop = Boolean(desktopRuntime);

export const isMobileApp = Boolean(desktopRuntime?.isMobile);

// Android app jis me abhi Hub ka address set nahi hua
export const needsHubSetup = isMobileApp && !desktopRuntime.hubUrl;

export const API_BASE_URL =
  desktopRuntime?.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || '/api/v1';
