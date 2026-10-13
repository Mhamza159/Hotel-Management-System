# Grand Horizon — zaroori commands (ek jagah)

**Hub commands kahan chalani hain:** Start → "PowerShell" → right-click → **Run as administrator**.

**Copy-paste ka tareeqa:** har command **ek hi line** hai. Agar `>>` aa jaye to **Ctrl + C** dabayein aur dobara paste karein.

Is laptop wale Hub ke ports: **API 5100**, **MongoDB 27100**. Hotel ki asal Hub PC par default ports **5000 / 27017** hote hain.

---

## 1. Rozana / jab zaroorat ho (Hub PC)

| Kaam | Command |
|---|---|
| Hub ka haal (services, backup, LAN address, cloud sync) | `powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\hub-status.ps1"` |
| Abhi backup lo | `powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\backup-hub.ps1"` |
| Hub API restart | `Restart-Service GrandHorizonHubApi` |
| Database restart | `Restart-Service GrandHorizonMongo` |
| Dono services ka haal | `Get-Service GrandHorizonMongo, GrandHorizonHubApi` |
| Network Private karna (staff PCs Hub tak na pohnch rahe hon) | `Get-NetConnectionProfile \| Set-NetConnectionProfile -NetworkCategory Private` |

**Folders:**
- **Backups:** `C:\ProgramData\GrandHorizonHub\backups`. Har raat 02:00 baje banta hai, aur aakhri 14 backups rehte hain.
- **Logs:** `C:\ProgramData\GrandHorizonHub\logs`. Masla ho to `GrandHorizonHubApi.err.log` dekhein.
- **Settings:** `C:\ProgramData\GrandHorizonHub\hub.env`. Is mein secret keys hain, is liye ise kisi ko na bhejein.

---

## 2. Cloud sync (website ↔ Hub)

| Kaam | Command |
|---|---|
| Nayi sync key banana | `powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\configure-sync.ps1" -GenerateKey` |
| Hub ko website se jorna (key maangega, right-click se paste kar ke Enter dabayein) | `powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\configure-sync.ps1" -CloudUrl https://hotel-backend-api-zeta.vercel.app` |
| Sync band karna (Hub offline chalta rahega) | `powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\configure-sync.ps1" -Disable` |
| Website ko Hub dikh raha hai? (`hubOnline: true` aana chahiye) | `curl.exe -s https://hotel-backend-api-zeta.vercel.app/api/v1/sync/availability` |

**Key bhool jayein ya leak ho jaye to:**
1. `-GenerateKey` se nayi key banayein.
2. Vercel par hotel-backend-api → Settings → Environment Variables → `SYNC_SHARED_KEY` → **Edit** → Value mein nayi key → Save.
3. Deployments → **Redeploy**.
4. Hub par `-CloudUrl` wali command dobara chalayein.

Key ko Notepad file mein mehfooz rakhein, aur kabhi screenshot ya chat mein na bhejein.

**Vercel (backend project) ke sync settings:**
- `SYNC_SHARED_KEY`: Hub wali key.
- `HUB_OFFLINE_BOOKING_GATE`: na lagayein (default false), taake Hub offline ho tab bhi website booking chalti rahe. `true` lagane se Hub offline hone par website booking band ho jayegi.

---

## 3. Hub install / update / hatana

Yeh commands setup package ke folder se chalayein (USB wala `GrandHorizon-Hotel-Setup-<version>` folder). Pehle us folder mein jayein:

```
cd "C:\GrandHorizon-Setup"
```

| Kaam | Command |
|---|---|
| Hotel ki Hub PC par pehli dafa install | `Install-Hub.cmd` par double-click karein |
| **Is laptop wale Hub ka code update (data rehta hai)** | `powershell -ExecutionPolicy Bypass -File .\hub\install-hub.ps1 -ApiPort 5100 -MongoPort 27100 -SkipAdmin` |
| Hotel Hub PC ka code update (data rehta hai) | `powershell -ExecutionPolicy Bypass -File .\hub\install-hub.ps1 -SkipAdmin` |
| Hub hatana (data rehta hai) | `powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\uninstall-hub.ps1"` |
| Hub hatana **aur saara data mitana** (DELETE likhna padta hai) | `powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\uninstall-hub.ps1" -RemoveData` |

> **Khabardar:** `Setup-This-Laptop-As-Hub.cmd` purane Hub ko **data samait mita** deta hai. Ab jab yeh laptop asal Hub hai aur sync on hai, isay **dobara na chalayein**. Update ke liye upar wali "data rehta hai" command use karein.

**Backup se data wapis lana (restore):**

Restore abhi ki sari Hub data ko purane backup se badal deta hai. Sync on ho to pehle developer se baat karein.

```
Stop-Service GrandHorizonHubApi
& "C:\Program Files\GrandHorizonHub\runtime\tools\bin\mongorestore.exe" --uri="mongodb://127.0.0.1:27100/?directConnection=true" --gzip --archive="C:\ProgramData\GrandHorizonHub\backups\hub-YYYYMMDD-HHMMSS.archive.gz" --drop
Start-Service GrandHorizonHubApi
```

Asal hotel Hub PC par `27100` ki jagah `27017` likhein. `hub-YYYYMMDD-HHMMSS` ki jagah backups folder se asal file ka naam daalein.

---

## 4. Staff app (har staff PC)

- **Install:** setup package ke `staff-app\GrandHorizonStaff-Setup-<version>.exe` par double-click karein. "Unknown publisher" aaye to **More info → Run anyway** dabayein.
- **Pehli dafa:** Hub ka address daalein, jaise `http://192.168.18.140:5100`, phir **Test** → **Save**.
- **Hub ka address badalna ho** to app mein upar **File → Hub Connection…** kholein.
- **Staff PC Hub tak na pohnche to:**
  - check karein ke dono ek hi WiFi/router par hain
  - Hub par `hub-status.ps1` chalayein
  - Hub ka network Private hona chahiye (section 1)

---

## 5. Developer (project folder: `Hotel-Management-System`)

| Kaam | Command |
|---|---|
| Backend chalana (port 5000) | `cd backend; npm run dev` |
| Frontend chalana (port 5173) | `cd frontend; npm run dev` |
| Backend tests (~2.5 min) | `cd backend; npm test` |
| Staff app ka installer banana | `cd desktop; npm run dist` (installer `desktop\dist\` mein banta hai) |
| Hotel setup package banana (USB ke liye, `release\` mein) | `powershell -ExecutionPolicy Bypass -File .\hub\build-release.ps1` |
| Production database par sync backfill (sirf zaroorat par, ek dafa) | `cd backend; node src/hub/cli.js sync-backfill` |

**Live (production) karna.** `main` par push hote hi website aur backend dono live ho jate hain:

```
git push origin <branch-name>:main
```

Pehle hamesha feature branch par kaam karein aur tests pass karein. Phir hi push karein.

**UI ya code badalne ke baad yeh tarteeb follow karein:**
1. Tests chalayein.
2. Push to main karein (website update ho jati hai).
3. `build-release.ps1` se naya package banayein.
4. Hub ko "data rehta hai" wali update command se update karein.
5. Staff PCs par naya staff app install karein.
