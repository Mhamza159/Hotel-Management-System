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
| Hub ka IP address (neeche "Hub ka IP address check karna" bhi dekhein) | `ipconfig \| findstr IPv4` |

**Folders:**
- **Backups:** `C:\ProgramData\GrandHorizonHub\backups`. Har raat 02:00 baje banta hai, aur aakhri 14 backups rehte hain.
- **Logs:** `C:\ProgramData\GrandHorizonHub\logs`. Masla ho to `GrandHorizonHubApi.err.log` dekhein.
- **Settings:** `C:\ProgramData\GrandHorizonHub\hub.env`. Is mein secret keys hain, is liye ise kisi ko na bhejein.

### Hub ka IP address check karna

Router kabhi Hub ka IP badal deta hai. Tab staff app "Hub tak nahi pohnch saka" dikhati hai.

**Hub laptop par** (koi bhi PowerShell):

| Kaam | Command |
|---|---|
| Hub ka poora address, jo staff app mein daalna hai ("Staff app Hub URL" wali line) | `powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\hub-status.ps1"` |
| Sirf IP address (WiFi wali `IPv4 Address` line) | `ipconfig \| findstr IPv4` |
| IP aur WiFi ka naam ek saath | `Get-NetIPConfiguration \| Select-Object InterfaceAlias, @{n='IP';e={$_.IPv4Address.IPAddress}}, @{n='WiFi';e={$_.NetProfile.Name}}` |

**Address bana kar staff app mein daalein:** `http://<IP>:<port>`
- Is laptop wala Hub: `http://192.168.18.140:5100` (port **5100**)
- Alag Hub PC: `http://<IP>:5000` (port **5000**)

**Staff laptop se check karein ke Hub tak pohnch hai:**

| Kaam | Command / tareeqa |
|---|---|
| Browser mein kholein. `{"status":"ok",...}` jaisa jawab aaye to Hub mil gaya | `http://192.168.18.140:5100/health` |
| PowerShell se check. `TcpTestSucceeded : True` aana chahiye | `Test-NetConnection 192.168.18.140 -Port 5100` |
| Hub ka laptop network par hai ya nahi | `ping 192.168.18.140` |

IP aur port apne Hub ke hisaab se badlein.

**IP badal gaya ho to:** har staff laptop par app mein **File → Hub Connection…** kholein, naya address daalein, phir **Test → Save**.

**IP ko mustaqil fix karna (behtar):**
1. Hub laptop par `ipconfig /all` chalayein. WiFi adapter ka **Physical Address** (MAC, jaise `A1-B2-C3-...`) note karein.
2. Browser mein router ka page kholein (aam taur par `192.168.1.1` ya `192.168.18.1`; `ipconfig` mein "Default Gateway" dekhein) aur login karein.
3. Router mein **DHCP Reservation** / **Address Reservation** / **Static Lease** dhoondein. Is MAC ke liye abhi wala IP (jaise `192.168.18.140`) reserve kar ke Save karein.

Router ka menu har company ka alag hota hai. Mushkil ho to router ka model likh kar "DHCP reservation" search karein.

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

## 4. Naye laptop par staff app lagana

Staff laptop par sirf app install hoti hai. Data Hub par rehta hai, is liye yahan database ya koi aur setup nahi chahiye.

**Zaroori shart:** staff laptop aur Hub **ek hi WiFi/router** par hon.

1. **Installer le jayein.** Setup package ke folder mein `staff-app\GrandHorizonStaff-Setup-<version>.exe` hai. Isay USB mein copy kar ke naye laptop par le jayein. Developer laptop par yahi file `desktop\dist\` mein bhi milti hai.
2. **Install karein.** File par double-click karein. "Windows protected your PC" ya "Unknown publisher" aaye to **More info → Run anyway** dabayein.
3. **Hub ka address daalein.** App pehli dafa khulegi to Hub ka address maangegi:
   - Is laptop wala Hub: `http://192.168.18.140:5100`
   - Hotel ki asal Hub PC: jo address install ke aakhir mein print hua tha, jaise `http://192.168.1.10:5000`

   **Test** dabayein. "Connected" aaye to **Save** dabayein.
4. **Staff ka account banayein.** Super-admin staff app mein **Staff & Roles** mein ja kar naye staff ka account banaye (receptionist ya housekeeping). Phir **PBAC Matrix** mein us ki permissions check kar ke **Save** kare.
5. **Login.** Staff apne email aur password se login kare.

**Hub ka address baad mein badalna ho** to app mein upar **File → Hub Connection…** kholein, naya address daalein, phir **Test → Save**.

**Agar Test fail ho:**
- Dono laptop ek hi WiFi/router par hain?
- Hub laptop on hai, aur so to nahi raha?
- Hub par admin PowerShell mein `hub-status.ps1` chalayein. Network **Private** hona chahiye. Agar Public ho to yeh chalayein:
  ```
  Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private
  ```
- Address mein `http://` aur sahi port (`:5100` ya `:5000`) likha hai?
- Hub par services chal rahi hain? `Get-Service GrandHorizonMongo, GrandHorizonHubApi` mein dono **Running** honi chahiye.

**Staff laptop hatana ho** to Windows Settings → Apps → "Grand Horizon Staff" → **Uninstall** karein. Data Hub par mehfooz rehta hai. Us staff ka account Staff & Roles se band ya delete kar dein.

---

## 5. Hub ko kisi aur laptop/PC par shift karna

Is ka matlab hai asal data purane Hub se naye Hub par le jana.

> **Sab se zaroori qaida:** purana aur naya Hub **kabhi ek saath** cloud se jure na hon. Neeche di gayi tarteeb bilkul isi tarah follow karein.

**Pehle yeh cheezein tayyar rakhein:**
- Setup package ka folder (USB mein)
- Sync key wali Notepad file
- Ek USB jis mein backup copy ho sake
- Naya PC, jo ho sake to router se **cable** par jura ho, **charger/UPS** par ho, aur jis ko router mein **fixed IP** di gayi ho (DHCP reservation)

### Step 1: Purane Hub par (admin PowerShell)

1. **Staff ko kaam rokne ka bolein.** Sab staff apps band kar dein. Is ke baad purane Hub par koi booking na ho.
2. **Check karein ke sync poora ho chuka hai.** "Cloud sync" mein last sync haal hi ka hona chahiye:
   ```
   powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\hub-status.ps1"
   ```
3. **Taaza backup lein:**
   ```
   powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\backup-hub.ps1"
   ```
4. **Backup copy karein.** `C:\ProgramData\GrandHorizonHub\backups` mein sab se naya `hub-YYYYMMDD-HHMMSS.archive.gz` USB par copy kar lein.
5. **Purane Hub par cloud sync band karein:**
   ```
   powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\configure-sync.ps1" -Disable
   ```
6. **Purane Hub ki services rokein:**
   ```
   Stop-Service GrandHorizonHubApi, GrandHorizonMongo
   ```

### Step 2: Naye PC par Hub install karein (admin PowerShell)

1. Setup package ka folder naye PC par copy karein, jaise `C:\GrandHorizon-Setup`.
2. Us folder mein jayein:
   ```
   cd "C:\GrandHorizon-Setup"
   ```
3. Hub install karein. `-SkipAdmin` is liye hai ke admin account backup ke saath aa jayega:
   ```
   powershell -ExecutionPolicy Bypass -File .\hub\install-hub.ps1 -SkipAdmin
   ```
   Naye PC par default ports **5000 / 27017** use hote hain.
4. Aakhir mein jo **Hub address** print ho (jaise `http://192.168.1.10:5000`), woh likh lein.

### Step 3: Backup se data naye Hub mein daalein (admin PowerShell, ek ek line)

USB wala backup naye PC par copy karein, jaise `C:\GrandHorizon-Setup\hub-YYYYMMDD-HHMMSS.archive.gz`. Phir:

```
Stop-Service GrandHorizonHubApi
```
```
& "C:\Program Files\GrandHorizonHub\runtime\tools\bin\mongorestore.exe" --uri="mongodb://127.0.0.1:27017/?directConnection=true" --gzip --archive="C:\GrandHorizon-Setup\hub-YYYYMMDD-HHMMSS.archive.gz" --drop
```
```
Start-Service GrandHorizonHubApi
```

`hub-YYYYMMDD-HHMMSS` ki jagah apni backup file ka asal naam likhein.

Backup ke saath sync ka record (kahan tak data ja chuka hai) bhi aa jata hai. Is liye naya Hub wahin se aage chalta hai jahan purana ruka tha.

### Step 4: Naye Hub ko cloud se jorein

```
powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\configure-sync.ps1" -CloudUrl https://hotel-backend-api-zeta.vercel.app
```

Key wohi Notepad wali paste karein (right-click, phir Enter). Nayi key banane ki zaroorat nahi.

### Step 5: Network, power aur check

- Network Private karein:
  ```
  Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private
  ```
- Agar naya Hub laptop hai to charger par sleep band karein:
  ```
  powercfg /change standby-timeout-ac 0
  ```
  ```
  powercfg /change hibernate-timeout-ac 0
  ```
- Haal check karein. Services **Running** aur cloud sync **on** honi chahiye:
  ```
  powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\hub-status.ps1"
  ```
- Website ko naya Hub dikh raha hai? Jawab mein `hubOnline: true` aana chahiye:
  ```
  curl.exe -s https://hotel-backend-api-zeta.vercel.app/api/v1/sync/availability
  ```

### Step 6: Staff apps ka address badlein

Har staff laptop par **File → Hub Connection…** mein naye Hub ka address daalein (jaise `http://192.168.1.10:5000`), phir **Test → Save**.

Sab staff ko **ek dafa dobara login** karna hoga, kyunki naye Hub ki security keys nayi hain. Email aur password wohi rehte hain.

### Step 7: Purana Hub hatayein (sab theek chal jane ke 1–2 din baad)

Is command se program hat jata hai lekin data rehta hai, jo emergency backup ka kaam deta hai:
```
powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\uninstall-hub.ps1"
```

Bilkul saaf karna ho to yeh chalayein. Is mein **DELETE** likhna padta hai:
```
powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\uninstall-hub.ps1" -RemoveData
```

### Dhyan rakhne wali baatein

- Step 1 mein `-Disable` zaroor karein. Do Hub ek saath cloud se jure hon to data kharab ho sakta hai.
- Restore ke baad purane Hub par koi booking na karein. Woh data naye Hub mein nahi jayega.
- Kuch ghalat ho jaye to purane Hub par services dobara start kar lein:
  ```
  Start-Service GrandHorizonMongo, GrandHorizonHubApi
  ```
  Phir `-CloudUrl` se usay dobara jor lein. Data wahan mehfooz hai. Pehle naye Hub par `configure-sync.ps1 -Disable` zaroor karein.

---

## 6. Developer (project folder: `Hotel-Management-System`)

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
