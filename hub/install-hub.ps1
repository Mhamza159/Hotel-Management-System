#Requires -Version 5.1
<#
.SYNOPSIS
  Installs (or updates) the Grand Horizon hotel Hub on this PC.

.DESCRIPTION
  The Hub is the always-on hotel PC that every staff desktop app connects to over
  the LAN. This script:
    1. downloads pinned Node.js, MongoDB, MongoDB Database Tools and WinSW, and
       refuses any file whose SHA-256 differs from versions.json
    2. installs the backend (../backend) with production dependencies
    3. creates a private hub.env (local MongoDB, fresh random JWT secrets)
    4. runs MongoDB as a Windows service (single-node replica set rs0, localhost only)
    5. runs the backend as a Windows service on the LAN port (auto start, auto restart)
    6. opens the API port in Windows Firewall for Private/Domain networks only
    7. schedules a daily database backup
    8. creates the first super-admin account if the Hub has none

  Re-running it updates the code and runtimes and keeps the data, hub.env and accounts.

.PARAMETER DownloadOnly
  Only download and verify the runtimes into the cache, then stop.

.PARAMETER StageOnly
  Prepare all files (runtimes, app, config) but do not touch services, firewall,
  scheduled tasks or ACLs. Does not need Administrator. Used for testing.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\install-hub.ps1
#>
[CmdletBinding()]
param(
    [string]$InstallDir = (Join-Path $env:ProgramFiles 'GrandHorizonHub'),
    [string]$DataDir = (Join-Path $env:ProgramData 'GrandHorizonHub'),
    [string]$SourceDir = '',
    [string]$CacheDir = '',
    [ValidateRange(1, 65535)][int]$ApiPort = 5000,
    [ValidateRange(1, 65535)][int]$MongoPort = 27017,
    [string]$BackupMirrorDir = '',
    [ValidateRange(1, 365)][int]$BackupKeep = 14,
    [switch]$DownloadOnly,
    [switch]$StageOnly,
    [switch]$SkipAdmin
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\HubCommon.ps1')

# Windows PowerShell 5.1 leaves $PSScriptRoot empty inside param() defaults
if (-not $SourceDir) { $SourceDir = Join-Path $PSScriptRoot '..\backend' }
# Hotel setup package (hub\build-release.ps1) apne saath verified downloads laata hai
$bundledDownloads = Join-Path $PSScriptRoot '..\downloads'
if (-not $CacheDir -and (Test-Path -LiteralPath $bundledDownloads)) { $CacheDir = (Resolve-Path -LiteralPath $bundledDownloads).Path }
if (-not $CacheDir) { $CacheDir = Join-Path $DataDir 'downloads' }
$versions = Get-HubVersions (Join-Path $PSScriptRoot 'versions.json')

# ---------------------------------------------------------------------------
# 1. Downloads (pinned + checksum verified)
# ---------------------------------------------------------------------------
Write-HubStep 'Downloading pinned runtimes (SHA-256 verified)'
$downloads = @{
    node          = Get-HubVerifiedDownload -Artifact $versions.node -CacheDir $CacheDir
    mongodb       = Get-HubVerifiedDownload -Artifact $versions.mongodb -CacheDir $CacheDir
    databaseTools = Get-HubVerifiedDownload -Artifact $versions.databaseTools -CacheDir $CacheDir
    winsw         = Get-HubVerifiedDownload -Artifact $versions.winsw -CacheDir $CacheDir
}
if ($DownloadOnly) {
    Write-HubStep "Done. Verified downloads are in $CacheDir"
    return
}

if (-not $StageOnly -and -not (Test-HubAdministrator)) {
    throw 'Run this installer from an elevated PowerShell (Run as Administrator).'
}
if (-not (Test-Path -LiteralPath (Join-Path $SourceDir 'src\server.js'))) {
    throw "Backend source not found at $SourceDir (expected src\server.js)."
}
$SourceDir = (Resolve-Path -LiteralPath $SourceDir).Path

$paths = @{
    Runtime   = Join-Path $InstallDir 'runtime'
    NodeDir   = Join-Path $InstallDir 'runtime\node'
    MongoDir  = Join-Path $InstallDir 'runtime\mongodb'
    ToolsDir  = Join-Path $InstallDir 'runtime\tools'
    AppDir    = Join-Path $InstallDir 'app'
    Service   = Join-Path $InstallDir 'service'
    Scripts   = Join-Path $InstallDir 'scripts'
    DbDir     = Join-Path $DataDir 'db'
    LogDir    = Join-Path $DataDir 'logs'
    BackupDir = Join-Path $DataDir 'backups'
    EnvFile   = Join-Path $DataDir 'hub.env'
    MongoCfg  = Join-Path $DataDir 'mongod.cfg'
}
$nodeExe = Join-Path $paths.NodeDir 'node.exe'
$mongodExe = Join-Path $paths.MongoDir 'bin\mongod.exe'
$apiServiceExe = Join-Path $paths.Service "$($HubNames.ApiService).exe"

# ---------------------------------------------------------------------------
# 2. Stop running services before replacing their files (update case)
# ---------------------------------------------------------------------------
if (-not $StageOnly) {
    foreach ($name in @($HubNames.ApiService, $HubNames.MongoService)) {
        $service = Get-Service -Name $name -ErrorAction SilentlyContinue
        if ($service -and $service.Status -ne 'Stopped') {
            Write-HubStep "Stopping $name for update"
            Stop-Service -Name $name -Force
            $service.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(60))
        }
    }
}

# ---------------------------------------------------------------------------
# 3. Runtimes
# ---------------------------------------------------------------------------
Write-HubStep "Installing runtimes into $($paths.Runtime)"
foreach ($dir in @($paths.NodeDir, $paths.MongoDir, $paths.ToolsDir)) {
    if (Test-Path -LiteralPath $dir) { Remove-Item -LiteralPath $dir -Recurse -Force }
}
Expand-HubZip -ZipPath $downloads.node -Destination $paths.NodeDir
Expand-HubZip -ZipPath $downloads.mongodb -Destination $paths.MongoDir -Entries $versions.mongodb.extract
Expand-HubZip -ZipPath $downloads.databaseTools -Destination $paths.ToolsDir -Entries $versions.databaseTools.extract
New-Item -ItemType Directory -Force -Path $paths.Service | Out-Null
Copy-Item -LiteralPath $downloads.winsw -Destination $apiServiceExe -Force
Write-HubInfo "Node.js $($versions.node.version), MongoDB $($versions.mongodb.version), Database Tools $($versions.databaseTools.version), WinSW $($versions.winsw.version)"

if (-not $StageOnly) {
    # mongod.exe needs the Visual C++ 2015-2022 runtime; the installer is a no-op if present
    Write-HubStep 'Installing Microsoft Visual C++ runtime (needed by MongoDB)'
    $vcRedist = Join-Path $paths.MongoDir 'bin\vc_redist.x64.exe'
    $vc = Start-Process -FilePath $vcRedist -ArgumentList '/install', '/quiet', '/norestart' -Wait -PassThru
    if (@(0, 1638, 3010) -notcontains $vc.ExitCode) {
        throw "Visual C++ runtime installer failed with exit code $($vc.ExitCode)."
    }
    if ($vc.ExitCode -eq 3010) { Write-HubWarning 'Windows asks for a restart to finish the Visual C++ runtime.' }
}

$mongodVersion = & $mongodExe --version
if ($LASTEXITCODE -ne 0) { throw 'mongod.exe does not run on this PC.' }
Write-HubInfo ($mongodVersion | Select-Object -First 1)

# ---------------------------------------------------------------------------
# 4. Backend app (production dependencies only)
# ---------------------------------------------------------------------------
Write-HubStep "Installing backend into $($paths.AppDir)"
New-Item -ItemType Directory -Force -Path $paths.AppDir | Out-Null
$appSrc = Join-Path $paths.AppDir 'src'
if (Test-Path -LiteralPath $appSrc) { Remove-Item -LiteralPath $appSrc -Recurse -Force }
Copy-Item -LiteralPath (Join-Path $SourceDir 'src') -Destination $appSrc -Recurse
foreach ($file in @('package.json', 'package-lock.json')) {
    Copy-Item -LiteralPath (Join-Path $SourceDir $file) -Destination $paths.AppDir -Force
}
$appModules = Join-Path $paths.AppDir 'node_modules'
$bundledModules = Join-Path $SourceDir 'node_modules'
if (Test-Path -LiteralPath (Join-Path $bundledModules '.package-lock.json')) {
    # Hotel setup package apne saath production dependencies laata hai: internet ke baghair install
    Write-HubInfo 'Using bundled backend dependencies (no internet needed)'
    if (Test-Path -LiteralPath $appModules) { Remove-Item -LiteralPath $appModules -Recurse -Force }
    Copy-Item -LiteralPath $bundledModules -Destination $appModules -Recurse
}
else {
    $oldPath = $env:PATH
    $env:PATH = "$($paths.NodeDir);$env:PATH"
    Push-Location -LiteralPath $paths.AppDir
    try {
        & (Join-Path $paths.NodeDir 'npm.cmd') ci --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE." }
    }
    finally {
        Pop-Location
        $env:PATH = $oldPath
    }
}

# Hub scripts travel with the install so status/backup/uninstall work without the repo
New-Item -ItemType Directory -Force -Path (Join-Path $paths.Scripts 'lib') | Out-Null
foreach ($script in @('backup-hub.ps1', 'hub-status.ps1', 'uninstall-hub.ps1', 'configure-sync.ps1', 'versions.json')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $script) -Destination $paths.Scripts -Force
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'lib\HubCommon.ps1') -Destination (Join-Path $paths.Scripts 'lib') -Force

# ---------------------------------------------------------------------------
# 5. Data folders, hub.env, mongod.cfg
# ---------------------------------------------------------------------------
Write-HubStep "Preparing data folder $DataDir"
foreach ($dir in @($DataDir, $paths.DbDir, $paths.LogDir, $paths.BackupDir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

if (-not $StageOnly) {
    # Only Administrators/SYSTEM can read hub.env and the database; the services
    # (NetworkService) get read on the folder and write on db/ and logs/
    & icacls $DataDir /inheritance:r /grant:r "$($HubSids.Administrators):(OI)(CI)F" "$($HubSids.System):(OI)(CI)F" "$($HubSids.NetworkService):(OI)(CI)RX" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not set permissions on $DataDir." }
    foreach ($dir in @($paths.DbDir, $paths.LogDir)) {
        & icacls $dir /grant "$($HubSids.NetworkService):(OI)(CI)M" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Could not set permissions on $dir." }
    }
}

$mongoUri = "mongodb://127.0.0.1:$MongoPort/$($HubNames.DatabaseName)?replicaSet=$($HubNames.ReplSetName)"
if (Test-Path -LiteralPath $paths.EnvFile) {
    Write-HubInfo 'Keeping existing hub.env (JWT secrets and settings unchanged)'
    # Older installs: this server must always run as the hotel hub for cloud sync
    if ((Get-HubEnvValue -Path $paths.EnvFile -Name 'SYNC_NODE') -ne 'hub') {
        Set-HubEnvValue -Path $paths.EnvFile -Name 'SYNC_NODE' -Value 'hub'
        Write-HubInfo 'Added SYNC_NODE=hub to hub.env'
    }
}
else {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $newSecret = {
        $bytes = New-Object byte[] 48
        $rng.GetBytes($bytes)
        return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
    }
    $envContent = @(
        '# Grand Horizon Hub settings. Generated by install-hub.ps1 - keep this file private.'
        'NODE_ENV=production'
        "PORT=$ApiPort"
        "MONGO_URI=$mongoUri"
        "JWT_SECRET=$(& $newSecret)"
        "JWT_REFRESH_SECRET=$(& $newSecret)"
        'JWT_EXPIRES_IN=15m'
        'JWT_REFRESH_EXPIRES_IN=7d'
        '# All staff PCs share the LAN; allow more requests per PC than the public website'
        'RATE_LIMIT_MAX=5000'
        'AUTH_RATE_LIMIT_MAX=100'
        'CLIENT_URL='
        '# Cloud sync: set with scripts\configure-sync.ps1 (CLOUD_SYNC_URL + SYNC_SHARED_KEY)'
        'SYNC_NODE=hub'
        'CLOUD_SYNC_URL='
        'SYNC_SHARED_KEY='
        ''
    ) -join "`r`n"
    $rng.Dispose()
    Write-HubTextFile -Path $paths.EnvFile -Content $envContent
    Write-HubInfo 'Created hub.env with new random JWT secrets'
}

$mongoCfg = @(
    '# Grand Horizon Hub MongoDB. Generated by install-hub.ps1 (re-running it overwrites this file).'
    'systemLog:'
    '  destination: file'
    "  path: '$(Join-Path $paths.LogDir 'mongod.log')'"
    '  logAppend: true'
    '  logRotate: rename'
    'storage:'
    "  dbPath: '$($paths.DbDir)'"
    'net:'
    '  bindIp: 127.0.0.1'
    "  port: $MongoPort"
    'replication:'
    "  replSetName: $($HubNames.ReplSetName)"
    ''
) -join "`r`n"
Write-HubTextFile -Path $paths.MongoCfg -Content $mongoCfg

# ---------------------------------------------------------------------------
# 6. API service definition (WinSW)
# ---------------------------------------------------------------------------
$x = { param($value) [System.Security.SecurityElement]::Escape([string]$value) }
$serviceXml = @"
<service>
  <id>$($HubNames.ApiService)</id>
  <name>Grand Horizon Hub API</name>
  <description>Grand Horizon hotel Hub backend for the staff desktop apps on the LAN (port $ApiPort).</description>
  <executable>$(& $x $nodeExe)</executable>
  <arguments>src\server.js</arguments>
  <workingdirectory>$(& $x $paths.AppDir)</workingdirectory>
  <env name="HOTEL_ENV_FILE" value="$(& $x $paths.EnvFile)"/>
  <depend>$($HubNames.MongoService)</depend>
  <startmode>Automatic</startmode>
  <delayedAutoStart>true</delayedAutoStart>
  <onfailure action="restart" delay="10 sec"/>
  <onfailure action="restart" delay="30 sec"/>
  <resetfailure>1 hour</resetfailure>
  <stoptimeout>15 sec</stoptimeout>
  <logpath>$(& $x $paths.LogDir)</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>10</keepFiles>
  </log>
</service>
"@
Write-HubTextFile -Path (Join-Path $paths.Service "$($HubNames.ApiService).xml") -Content $serviceXml

$manifest = [ordered]@{
    installDir      = $InstallDir
    dataDir         = $DataDir
    apiPort         = $ApiPort
    mongoPort       = $MongoPort
    databaseName    = $HubNames.DatabaseName
    replSetName     = $HubNames.ReplSetName
    backupKeep      = $BackupKeep
    backupMirrorDir = $BackupMirrorDir
    versions        = [ordered]@{
        node          = $versions.node.version
        mongodb       = $versions.mongodb.version
        databaseTools = $versions.databaseTools.version
        winsw         = $versions.winsw.version
    }
    installedAt     = (Get-Date).ToString('o')
}
Write-HubTextFile -Path (Join-Path $InstallDir $HubNames.ManifestFile) -Content ($manifest | ConvertTo-Json -Depth 4)

if ($StageOnly) {
    Write-HubStep 'Staged. Services, firewall, backup task and admin account were NOT set up (-StageOnly).'
    Write-HubInfo "Install dir: $InstallDir"
    Write-HubInfo "Data dir:    $DataDir"
    return
}

# ---------------------------------------------------------------------------
# 7. MongoDB service + replica set
# ---------------------------------------------------------------------------
Write-HubStep 'Setting up the MongoDB service'
$mongoBinPath = "`"$mongodExe`" --config `"$($paths.MongoCfg)`" --service"
# sc.exe mangles quoted paths when called from Windows PowerShell 5.1, so a service
# whose command line changed (other install folder) is recreated instead of edited
if ((Get-HubServicePath $HubNames.MongoService) -and (Get-HubServicePath $HubNames.MongoService) -ne $mongoBinPath) {
    Remove-HubService $HubNames.MongoService
}
if (-not (Get-HubServicePath $HubNames.MongoService)) {
    New-Service -Name $HubNames.MongoService -BinaryPathName $mongoBinPath `
        -DisplayName 'Grand Horizon Hub Database' -StartupType Automatic `
        -Description 'MongoDB for the Grand Horizon hotel Hub (localhost only).' | Out-Null
}
& sc.exe config $HubNames.MongoService obj= 'NT AUTHORITY\NetworkService' start= delayed-auto | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not configure the MongoDB service account.' }
& sc.exe failure $HubNames.MongoService reset= 3600 actions= restart/10000/restart/30000/restart/60000 | Out-Null
Start-Service -Name $HubNames.MongoService

Write-HubInfo 'Initialising replica set rs0 (needed for transactions and cloud sync)'
$replSet = Invoke-HubCli -NodeExe $nodeExe -AppDir $paths.AppDir -EnvFile $paths.EnvFile `
    -Arguments @('init-replset', "--host=127.0.0.1:$MongoPort", "--name=$($HubNames.ReplSetName)")
if ($replSet.initiated) { Write-HubInfo 'Replica set created' } else { Write-HubInfo 'Replica set already set up' }

# ---------------------------------------------------------------------------
# 8. API service
# ---------------------------------------------------------------------------
Write-HubStep 'Setting up the Hub API service'
# WinSW re-reads its XML at every start; only a moved service exe needs re-registering
$apiServicePath = Get-HubServicePath $HubNames.ApiService
if ($apiServicePath -and $apiServicePath.Trim('"') -ne $apiServiceExe) {
    Remove-HubService $HubNames.ApiService
    $apiServicePath = $null
}
if (-not $apiServicePath) {
    & $apiServiceExe install
    if ($LASTEXITCODE -ne 0) { throw 'WinSW could not install the API service.' }
}
& sc.exe config $HubNames.ApiService obj= 'NT AUTHORITY\NetworkService' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not configure the API service account.' }
Start-Service -Name $HubNames.ApiService
if (-not (Wait-HubHealth -Port $ApiPort)) {
    throw "The Hub API did not become healthy on port $ApiPort. See logs in $($paths.LogDir)."
}
Write-HubInfo "API is up on port $ApiPort"

# ---------------------------------------------------------------------------
# 9. Firewall (LAN only)
# ---------------------------------------------------------------------------
Write-HubStep 'Opening the API port for the hotel LAN'
Get-NetFirewallRule -DisplayName $HubNames.FirewallRule -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $HubNames.FirewallRule -Direction Inbound -Action Allow `
    -Protocol TCP -LocalPort $ApiPort -Program $nodeExe -Profile Private, Domain `
    -Description 'Staff desktop apps reach the Grand Horizon Hub API.' | Out-Null
$publicNetworks = @(Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.NetworkCategory -eq 'Public' })
foreach ($network in $publicNetworks) {
    Write-HubWarning "Network '$($network.Name)' is set to Public, so staff PCs cannot reach the Hub through it. If this is the hotel LAN, run: Set-NetConnectionProfile -InterfaceIndex $($network.InterfaceIndex) -NetworkCategory Private"
}

# ---------------------------------------------------------------------------
# 10. Daily backup
# ---------------------------------------------------------------------------
Write-HubStep 'Scheduling the daily backup (02:00, or at next start if the PC was off)'
$backupScript = Join-Path $paths.Scripts 'backup-hub.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -InstallDir `"$InstallDir`""
$trigger = New-ScheduledTaskTrigger -Daily -At '02:00'
$principal = New-ScheduledTaskPrincipal -UserId 'S-1-5-18' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName $HubNames.BackupTask -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null

# ---------------------------------------------------------------------------
# 11. First super-admin
# ---------------------------------------------------------------------------
$status = Invoke-HubCli -NodeExe $nodeExe -AppDir $paths.AppDir -EnvFile $paths.EnvFile -Arguments @('status')
if ($status.superAdmins -gt 0) {
    Write-HubStep "Hub already has $($status.superAdmins) super-admin account(s)"
}
elseif ($SkipAdmin) {
    Write-HubWarning 'No super-admin exists. Re-run without -SkipAdmin to create one; nobody can log in until then.'
}
else {
    Write-HubStep 'Create the first super-admin (owner/manager) account'
    $adminName = Read-Host '    Full name'
    $adminEmail = Read-Host '    Email'
    for (;;) {
        $first = Read-Host '    Password (min 10 chars, letters and numbers)' -AsSecureString
        $second = Read-Host '    Repeat password' -AsSecureString
        $plainFirst = [System.Net.NetworkCredential]::new('', $first).Password
        $plainSecond = [System.Net.NetworkCredential]::new('', $second).Password
        # Wahi shart jo backend (createAdmin.js) lagata hai — pehle ghalat password par poora install ruk jata tha
        if ($plainFirst.Length -lt 10 -or $plainFirst -notmatch '[A-Za-z]' -or $plainFirst -notmatch '\d') {
            Write-HubWarning 'Password needs at least 10 characters with both letters and numbers (e.g. Hotel2026Admin). Try again.'
            continue
        }
        if ($plainFirst -ceq $plainSecond) { break }
        Write-HubWarning 'Passwords do not match, try again.'
    }
    $env:HUB_ADMIN_NAME = $adminName
    $env:HUB_ADMIN_EMAIL = $adminEmail
    $env:HUB_ADMIN_PASSWORD = $plainFirst
    try {
        $admin = Invoke-HubCli -NodeExe $nodeExe -AppDir $paths.AppDir -EnvFile $paths.EnvFile -Arguments @('create-admin')
    }
    finally {
        Remove-Item Env:HUB_ADMIN_NAME, Env:HUB_ADMIN_EMAIL, Env:HUB_ADMIN_PASSWORD -ErrorAction SilentlyContinue
        $plainFirst = $null
        $plainSecond = $null
    }
    if ($admin.created) { Write-HubInfo "Created super-admin $($admin.user.email)" } else { Write-HubWarning $admin.reason }
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-HubStep 'Grand Horizon Hub is installed'
# @() keeps a single IP as an array (PowerShell unrolls one-item results into a string)
$addresses = @(Get-HubLanAddresses)
if ($addresses.Count -gt 0) {
    Write-HubInfo 'In the staff desktop app (File > Hub Connection...) use one of:'
    foreach ($address in $addresses) { Write-HubInfo "  http://${address}:$ApiPort" }
    Write-HubInfo 'Tip: give this PC a fixed IP (DHCP reservation in the router) so the address never changes.'
}
Write-HubInfo "Status:    powershell -ExecutionPolicy Bypass -File `"$(Join-Path $paths.Scripts 'hub-status.ps1')`""
Write-HubInfo "Logs:      $($paths.LogDir)"
Write-HubInfo "Backups:   $($paths.BackupDir)"
