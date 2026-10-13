# Grand Horizon Hub — Installer

The **Hub** is one always-on PC in the hotel that runs the backend and its own MongoDB. Every staff PC runs the desktop app (`desktop/`) and connects to the Hub over the hotel LAN, so all counters see the same data even without internet. Cloud sync (Step 4) will later copy Hub data to the online system.

## Requirements

- Windows 10 (1803+) or 11, 64-bit, always on, wired to the hotel LAN
- Administrator account
- Internet **during installation only** (downloads ~900 MB once; interrupted downloads resume)
- Ideally a fixed IP (DHCP reservation in the router) so staff apps keep finding the Hub

## Hotel setup package (USB, no internet needed)

On a developer PC: `powershell -ExecutionPolicy Bypass -File .\hub\build-release.ps1` builds `release\GrandHorizon-Hotel-Setup-<version>\` (~1 GB) with `Install-Hub.cmd` (double-click, asks for Administrator), `START-HERE.txt`, the backend with its production dependencies, the verified runtime downloads and the staff app installer. Copy the folder to the Hub PC and follow START-HERE. `-SkipDesktopBuild` reuses the existing staff installer; `-Zip` also writes a zip.

## Install / update

From this repository, in an **elevated** PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\hub\install-hub.ps1
```

At the end it asks for the first super-admin (name, email, password ≥ 10 characters with letters and digits) and prints the Hub URL, e.g. `http://192.168.1.10:5000`. Enter that in each staff app under **File → Hub Connection…**.

Run the same command again to update code or runtimes. Data, `hub.env` (JWT secrets) and accounts are kept.

| Option | Meaning |
| --- | --- |
| `-ApiPort 5000` / `-MongoPort 27017` | Ports (MongoDB listens on 127.0.0.1 only) |
| `-InstallDir`, `-DataDir` | Defaults: `C:\Program Files\GrandHorizonHub`, `C:\ProgramData\GrandHorizonHub` |
| `-BackupMirrorDir D:\HubBackups` | Also copy each daily backup there (USB disk / NAS) |
| `-BackupKeep 14` | Number of daily backups to keep |
| `-DownloadOnly` | Only download and verify the runtimes |
| `-StageOnly` | Prepare files without services/firewall/tasks (no admin needed; for testing) |
| `-SkipAdmin` | Do not prompt for the first super-admin |

## What gets installed

| Piece | Details |
| --- | --- |
| Runtimes | Pinned Node.js, MongoDB, Database Tools, WinSW from `versions.json`; any SHA-256 mismatch aborts |
| `GrandHorizonMongo` service | `mongod`, single-node replica set `rs0`, bound to 127.0.0.1, runs as NetworkService, auto-restart |
| `GrandHorizonHubApi` service | `backend/src/server.js` (with the expiry cron) via WinSW, NetworkService, delayed auto-start, restart on failure, rolling logs |
| `hub.env` | In the data folder; `NODE_ENV=production`, local `MONGO_URI`, random JWT secrets, higher LAN rate limits. Readable only by Administrators, SYSTEM and the services |
| Firewall | Inbound TCP on the API port for `node.exe`, **Private/Domain networks only** |
| Backup task | Daily 02:00 (or at next boot) as SYSTEM: gzip `mongodump` to `<DataDir>\backups`, keeps the newest 14, rotates `mongod.log` |

The Hub starts with an **empty database** apart from the first super-admin; create staff accounts and rooms from the desktop app (or wait for Step 4 sync).

## Cloud sync (website ↔ Hub)

The Hub's sync agent (inside the API service) pushes Hub changes to the cloud and pulls website changes (online bookings, guest accounts, reviews…) every 15 s. Without internet the Hub keeps working; changes queue and upload later.

**Rules**

- The Hub is the inventory authority. While the Hub has not synced for 2 minutes, the website returns "online booking temporarily unavailable" (bookings and web walk-ins).
- Each record is "last writer wins" by its change time. Room locks (`reservedRanges`) are rebuilt on each side from bookings, never copied.
- If a website booking arrives for a room the hotel already sold for those dates, it is flagged as a **booking conflict** on both sides and holds no room. The desktop header shows a red "booking conflict" badge; allotting a free room at the front desk clears it.
- Duplicate unique values (same email, room number or coupon code created separately on both sides) are skipped and listed under recent conflicts.
- Room photos uploaded on the Hub are stored on the Hub and shown from there at once (no internet needed). When online, the agent gets a signed upload from the cloud and sends them to Cloudinary (no Cloudinary secret on the Hub); the website only ever sees the final Cloudinary link.

**One-time setup** (needs the sync version of the backend deployed to the cloud):

1. On the Hub: `scripts\configure-sync.ps1 -GenerateKey` and copy the printed key.
2. Cloud backend environment (Vercel → backend project → Settings → Environment Variables): `SYNC_SHARED_KEY=<key>`, then redeploy.
3. Once, against the cloud database, stamp existing records so they reach the Hub: `node src/hub/cli.js sync-backfill` with the cloud `MONGO_URI` (`SYNC_NODE` unset = cloud).
4. On the Hub (elevated): `scripts\configure-sync.ps1 -CloudUrl https://<backend-domain>`, paste the key. It verifies the key, saves it in `hub.env`, prepares existing Hub data and restarts the API.
5. `hub-status.ps1` → "Cloud sync" shows the last successful sync.

Use a **fresh Hub** (uninstall with `-RemoveData`, install again) before connecting it to the real cloud if it contains test rooms or bookings — otherwise they upload to the website.

`configure-sync.ps1 -Disable` turns sync off again (the website then keeps online booking closed while `SYNC_SHARED_KEY` is set in the cloud).

## Day-to-day

```powershell
# Health, services, last backup, LAN URLs (run as Administrator for the DB check)
powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\hub-status.ps1"

# Backup now
powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\backup-hub.ps1"

# Restore a backup (stop the API service first; --drop replaces current data)
Stop-Service GrandHorizonHubApi
& "C:\Program Files\GrandHorizonHub\runtime\tools\bin\mongorestore.exe" --uri="mongodb://127.0.0.1:27017/?directConnection=true" --gzip --archive="C:\ProgramData\GrandHorizonHub\backups\hub-YYYYMMDD-HHMMSS.archive.gz" --drop
Start-Service GrandHorizonHubApi

# Uninstall (keeps data unless -RemoveData)
powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\uninstall-hub.ps1"
```

Logs: `C:\ProgramData\GrandHorizonHub\logs` (`GrandHorizonHubApi.*.log`, `mongod.log`, `backup.log`).

## Troubleshooting

- **Staff PCs cannot connect:** the Hub's network may be set to *Public*. `hub-status.ps1` shows it; the installer prints the `Set-NetConnectionProfile … -NetworkCategory Private` command.
- **API service keeps restarting:** check `GrandHorizonHubApi.err.log`; it exits on purpose if MongoDB is unreachable and WinSW restarts it.
- **"marked for deletion" during update:** close the Services window (`services.msc`) and run the installer again.

## Files

| File | Role |
| --- | --- |
| `install-hub.ps1` | Install / update |
| `versions.json` | Pinned download URLs and SHA-256 checksums |
| `backup-hub.ps1`, `hub-status.ps1`, `uninstall-hub.ps1`, `configure-sync.ps1` | Copied to `<InstallDir>\scripts` |
| `lib/HubCommon.ps1` | Shared helpers (verified download, safe unzip, service helpers) |
| `backend/src/hub/` | Node side: `cli.js` (`init-replset`, `create-admin`, `status`, `rotate-logs`, `sync-backfill`), `replicaSet.js`, `createAdmin.js` |
| `backend/src/sync/` | Sync engine: `syncPlugin.js` (change stamps + tombstones), `syncStore.js` (collect/apply), `bookingRanges.js` (room locks), `hubAgent.js` (push/pull loop) |
