const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes a minimal, read-only desktop runtime to the React app.
 * The frontend reads `window.hotelDesktop` to switch into staff-only desktop mode
 * and to send API calls to the hotel Hub instead of the cloud.
 */
const { hubUrl, appVersion } = ipcRenderer.sendSync('desktop:get-runtime-config');

contextBridge.exposeInMainWorld('hotelDesktop', {
  isDesktop: true,
  hubUrl,
  apiBaseUrl: hubUrl ? `${hubUrl}/api/v1` : null,
  appVersion,
  openHubSettings: () => ipcRenderer.send('desktop:open-hub-settings'),
});
