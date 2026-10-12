# Grand Horizon Staff — Desktop App

Electron desktop client for hotel staff (front desk, housekeeping, admin). It runs the existing React frontend in staff-only mode and talks to the **hotel Hub** — the PC on the hotel LAN that runs the backend and MongoDB — so every staff PC sees the same data without internet.

Guests keep using the website; the desktop app blocks guest accounts and hides guest pages.

## Requirements

- Windows 10/11
- Node.js 20+ (for building only)
- A reachable Hub running the backend, e.g. `http://192.168.1.10:5000` — install it with `hub/install-hub.ps1` (see `hub/README.md`)

## Commands (run inside `desktop/`)

```bash
npm install          # Electron + electron-builder
npm run build:web    # builds ../frontend into desktop/web
npm start            # run the app (first launch asks for the Hub address)
npm run dev          # load the Vite dev server (start `npm run dev` in ../frontend first)
npm run dist         # build web + Windows installer into desktop/dist
npm run smoke -- --hub-url=http://<hub>:5000   # headless check; prints SMOKE_RESULT JSON and exits
```

From the repository root: `npm run desktop`, `npm run desktop:build-web`, `npm run desktop:dist`.

Useful flags: `--hub-url=<url>` overrides the saved Hub for one run; `--dev-url=<url>` loads a dev server.

> If Electron behaves like plain Node (e.g. `Cannot read properties of undefined (reading 'registerSchemesAsPrivileged')`), the environment variable `ELECTRON_RUN_AS_NODE` is set. Unset it before running.

## How it works

| Piece | File | Role |
| --- | --- | --- |
| Main process | `src/main.js` | Serves `web/` on the secure custom origin `app://hotel` (SPA fallback), window and menu, navigation hardening, Hub health check |
| Hub settings | `src/config.js`, `src/settings/*` | Stores the Hub URL in `%APPDATA%/grand-horizon-staff-desktop/config.json`; "File → Hub Connection…" changes it |
| App preload | `src/app-preload.js` | Exposes `window.hotelDesktop` (`isDesktop`, `hubUrl`, `apiBaseUrl`) to React |
| Frontend switch | `frontend/src/config/runtime.js` | Uses the Hub as the API base URL and enables staff-only routing |
| Backend CORS | `backend/src/app.js` | Allows origin `app://hotel` |

Security: `contextIsolation` and `sandbox` are on, Node integration is off, external links open in the system browser, and navigation outside the app is blocked. `allowRunningInsecureContent` is enabled because the Hub serves plain HTTP on the LAN.

## Not in this step

Cloud sync (Step 4), offline fonts/images (Google Fonts and Unsplash fallbacks still need internet), code signing, and auto-update.
