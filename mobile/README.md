# Grand Horizon Staff — Android app

The staff app for Android phones. It is the same React frontend as the website and the desktop app, packaged with [Capacitor 7](https://capacitorjs.com/) into an APK. Like the desktop app it only talks to the hotel **Hub** over the hotel WiFi (no internet needed) and shows staff screens only.

- First start asks for the Hub address (`frontend/src/pages/public/HubSetupPage.jsx`), tests `GET <hub>/health` and saves it on the phone. The login page shows the Hub with a **Change** link.
- `frontend/src/config/runtime.js` detects the app through `window.Capacitor` and switches to staff-only mode with the saved Hub as API base.
- The WebView origin is `http://localhost` (`capacitor.config.json`: `androidScheme: http`), allowed by the backend CORS list. HTTP to the LAN Hub needs `android:usesCleartextTraffic="true"` (AndroidManifest).

## Build

Needs JDK 21 and the Android SDK (platform 35, build-tools 35). The script finds them in `JAVA_HOME` / `ANDROID_HOME`, or in `%LOCALAPPDATA%\GrandHorizonBuild\jdk\jdk-21*` and `%LOCALAPPDATA%\Android\Sdk`.

```powershell
cd mobile
npm install
npm run apk        # -> dist\GrandHorizonStaff-<version>.apk
```

`npm run apk` builds the frontend into `web/`, runs `cap sync android` and `gradlew assembleRelease`. The first build downloads Gradle and the Android libraries (several hundred MB).

**Signing key:** the first build creates `signing/` (key + passwords, git-ignored). **Back this folder up.** Every later version must be signed with the same key, otherwise Android refuses to install it over the existing app (staff would have to uninstall first and log in again).

Version: `version` in `mobile/package.json` (versionCode = major·10000 + minor·100 + patch). Raise it for every release.

## Install on a phone

1. Copy `GrandHorizonStaff-<version>.apk` to the phone (USB, WhatsApp to yourself, Drive…).
2. Open it. Android asks to allow "Install unknown apps" for that app (Files/WhatsApp/Chrome) → allow → **Install**. Play Protect may warn about an unknown developer → **Install anyway**.
3. Open **Grand Horizon Staff**, enter the Hub address (e.g. `http://192.168.18.140:5100`), **Test**, **Save**, log in.

The phone must be on the hotel WiFi (same router as the Hub). The Hub must run a backend version that allows the `http://localhost` origin.
