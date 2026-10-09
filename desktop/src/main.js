const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  net,
  protocol,
  shell,
} = require('electron');
const { loadConfig, saveConfig, normalizeHubUrl } = require('./config');

/**
 * ============================================================================
 * GRAND HORIZON STAFF DESKTOP — ELECTRON MAIN PROCESS
 * ============================================================================
 *
 * 1. Built React frontend (`desktop/web`) ko secure custom origin `app://hotel`
 *    se serve karta hai (SPA fallback ke sath, taake BrowserRouter chale).
 * 2. Hub (hotel LAN backend) ka address settings window se leta hai aur
 *    preload ke zariye renderer ko `window.hotelDesktop.apiBaseUrl` deta hai.
 * 3. External links system browser me kholta hai; app ke bahar navigation block.
 *
 * CLI flags:
 *   --dev-url=<url>      Vite dev server load karein (default web build ke bajaye)
 *   --hub-url=<url>      Saved Hub address ko is run ke liye override karein
 *   --smoke-test         Window load karke runtime info stdout par print karein aur exit
 *   --smoke-fetch=<url>  Smoke test me renderer se is URL ko fetch karke result print karein
 */

const APP_SCHEME = 'app';
const APP_HOST = 'hotel';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const WEB_DIR = path.join(__dirname, '..', 'web');
const HUB_CHECK_TIMEOUT_MS = 5000;

const readFlag = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
};

const flags = {
  devUrl: readFlag('dev-url'),
  hubUrl: readFlag('hub-url'),
  smokeTest: process.argv.includes('--smoke-test'),
  smokeFetch: readFlag('smoke-fetch'),
};

let mainWindow = null;
let settingsWindow = null;

// Custom scheme ko "standard + secure" register karna zaroori hai taake
// localStorage, crypto.randomUUID aur clipboard jaise secure-context APIs chalein.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

/**
 * Current Hub URL: CLI override first, then the saved config.
 * @returns {string|null}
 */
const getHubUrl = () => {
  if (flags.hubUrl) {
    return normalizeHubUrl(flags.hubUrl);
  }
  return loadConfig().hubUrl;
};

/**
 * Calls `GET <hub>/health` to verify the Hub backend is reachable.
 * @param {string} hubUrl
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
const checkHub = async (hubUrl) => {
  let normalized;
  try {
    normalized = normalizeHubUrl(hubUrl);
  } catch (error) {
    return { ok: false, message: error.message };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HUB_CHECK_TIMEOUT_MS);

  try {
    const response = await net.fetch(`${normalized}/health`, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, message: `Hub responded with HTTP ${response.status}.` };
    }
    const body = await response.json().catch(() => null);
    if (body?.status !== 'ok') {
      return { ok: false, message: 'Address responded, but it is not a Grand Horizon Hub.' };
    }
    return { ok: true, message: `Connected to Hub at ${normalized}.` };
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'timed out' : error.message;
    return { ok: false, message: `Could not reach Hub (${reason}).` };
  } finally {
    clearTimeout(timer);
  }
};

const isInsideWebDir = (filePath) => {
  const relative = path.relative(WEB_DIR, filePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};

/**
 * Serves `desktop/web` on app://hotel with an index.html fallback for SPA routes.
 */
const registerAppProtocol = () => {
  protocol.handle(APP_SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    const requested = path.normalize(path.join(WEB_DIR, decodeURIComponent(pathname)));

    let filePath = path.join(WEB_DIR, 'index.html');
    if (isInsideWebDir(requested) && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
      filePath = requested;
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
};

const isAllowedAppUrl = (url) => {
  if (url.startsWith(`${APP_ORIGIN}/`) || url === APP_ORIGIN) {
    return true;
  }
  return Boolean(flags.devUrl && url.startsWith(flags.devUrl));
};

/**
 * Keeps the window on the app; opens http(s) links in the system browser.
 * @param {BrowserWindow} window
 */
const hardenNavigation = (window) => {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedAppUrl(url)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) {
        shell.openExternal(url);
      }
    }
  });
};

const runSmokeTest = async (window) => {
  const report = await window.webContents.executeJavaScript(`
    (async () => {
      const result = {
        location: window.location.href,
        isDesktop: Boolean(window.hotelDesktop && window.hotelDesktop.isDesktop),
        apiBaseUrl: window.hotelDesktop ? window.hotelDesktop.apiBaseUrl : null,
        secureContext: window.isSecureContext,
        hasRandomUUID: typeof crypto.randomUUID === 'function',
        rootRendered: Boolean(document.getElementById('root')?.children.length),
      };
      const target = ${JSON.stringify(flags.smokeFetch)};
      if (target) {
        try {
          const response = await fetch(target);
          result.fetch = { ok: response.ok, status: response.status, body: await response.text() };
        } catch (error) {
          result.fetch = { ok: false, error: String(error) };
        }
      }
      return result;
    })()
  `);
  process.stdout.write(`SMOKE_RESULT ${JSON.stringify(report)}\n`);
  app.exit(0);
};

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Grand Horizon Staff',
    show: !flags.smokeTest,
    backgroundColor: '#0A0F1A',
    webPreferences: {
      preload: path.join(__dirname, 'app-preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Hub hotel LAN par plain http chalata hai; secure app:// page se http API
      // calls (mixed content) allow karne ke liye zaroori hai.
      allowRunningInsecureContent: true,
    },
  });

  hardenNavigation(mainWindow);

  if (flags.smokeTest) {
    mainWindow.webContents.once('did-finish-load', () => {
      // React ko render hone ka mauqa dein
      setTimeout(() => runSmokeTest(mainWindow), 1500);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (flags.devUrl) {
    mainWindow.loadURL(flags.devUrl);
  } else {
    mainWindow.loadURL(`${APP_ORIGIN}/`);
  }
};

const createSettingsWindow = () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 520,
    resizable: false,
    title: 'Hub Connection',
    parent: mainWindow || undefined,
    modal: Boolean(mainWindow),
    backgroundColor: '#0A0F1A',
    webPreferences: {
      preload: path.join(__dirname, 'settings', 'settings-preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  settingsWindow.setMenuBarVisibility(false);
  hardenNavigation(settingsWindow);
  settingsWindow.loadFile(path.join(__dirname, 'settings', 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    // Pehli dafa setup me agar Hub save kiye baghair band kiya to app band karein
    if (!mainWindow && !getHubUrl()) {
      app.quit();
    }
  });
};

const buildMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Hub Connection…', click: () => createSettingsWindow() },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const registerIpc = () => {
  // Preload (sandboxed) runtime config synchronously maangta hai, taake React
  // app load hone se pehle API base URL tay ho
  ipcMain.on('desktop:get-runtime-config', (event) => {
    let hubUrl = null;
    try {
      hubUrl = getHubUrl();
    } catch {
      hubUrl = null;
    }
    event.returnValue = { hubUrl, appVersion: app.getVersion() };
  });

  ipcMain.on('desktop:open-hub-settings', () => createSettingsWindow());

  ipcMain.handle('hub:get', () => ({ hubUrl: getHubUrl() }));

  ipcMain.handle('hub:test', (_event, hubUrl) => checkHub(hubUrl));

  ipcMain.handle('hub:save', async (_event, hubUrl) => {
    const result = await checkHub(hubUrl);
    if (!result.ok) {
      return result;
    }

    saveConfig({ hubUrl });

    if (mainWindow) {
      // Naya Hub address renderer tak pohanchane ka sab se saaf tareeqa relaunch hai
      app.relaunch();
      app.exit(0);
      return result;
    }

    settingsWindow?.close();
    createMainWindow();
    return result;
  });
};

const ensureWebBuild = () => {
  if (flags.devUrl || fs.existsSync(path.join(WEB_DIR, 'index.html'))) {
    return true;
  }
  dialog.showErrorBox(
    'Frontend build missing',
    'The staff web build was not found in desktop/web.\nRun "npm run build:web" inside the desktop folder and try again.'
  );
  return false;
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const target = mainWindow || settingsWindow;
    if (target) {
      if (target.isMinimized()) target.restore();
      target.focus();
    }
  });

  app.whenReady().then(() => {
    registerAppProtocol();
    registerIpc();
    buildMenu();

    if (!ensureWebBuild()) {
      app.exit(1);
      return;
    }

    if (getHubUrl() || flags.smokeTest) {
      createMainWindow();
    } else {
      createSettingsWindow();
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
