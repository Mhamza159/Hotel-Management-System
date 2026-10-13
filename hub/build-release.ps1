#Requires -Version 5.1
<#
.SYNOPSIS
  Builds the "Hotel Setup" package to copy onto a USB stick for the hotel.

.DESCRIPTION
  Creates release\GrandHorizon-Hotel-Setup-<version>\ containing:
    Install-Hub.cmd       double-click on the Hub PC (asks for Administrator)
    START-HERE.txt        step-by-step instructions
    hub\                  installer + maintenance scripts
    backend\              backend code with its production dependencies
    downloads\            Node.js, MongoDB, tools, WinSW (SHA-256 verified)
    staff-app\            GrandHorizonStaff-Setup-<version>.exe for staff PCs
  With the bundled downloads and dependencies the Hub installs without internet.

.PARAMETER CacheDir
  Folder that already holds the verified downloads (missing ones are downloaded).

.PARAMETER SkipDesktopBuild
  Reuse desktop\dist\GrandHorizonStaff-Setup-<version>.exe instead of rebuilding it.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\hub\build-release.ps1
#>
[CmdletBinding()]
param(
    [string]$CacheDir = '',
    [string]$OutDir = '',
    [switch]$SkipDesktopBuild,
    [switch]$Zip
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\HubCommon.ps1')

$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not $OutDir) { $OutDir = Join-Path $repo 'release' }
if (-not $CacheDir) { $CacheDir = Join-Path $env:ProgramData 'GrandHorizonHub\downloads' }

$version = (Get-Content -LiteralPath (Join-Path $repo 'desktop\package.json') -Raw | ConvertFrom-Json).version
$packageName = "GrandHorizon-Hotel-Setup-$version"
$target = Join-Path $OutDir $packageName
$setupExe = Join-Path $repo "desktop\dist\GrandHorizonStaff-Setup-$version.exe"

# ---------------------------------------------------------------------------
Write-HubStep "Staff desktop app $version"
if (-not $SkipDesktopBuild) {
    Push-Location -LiteralPath (Join-Path $repo 'desktop')
    try {
        # Electron ko plain Node ki tarah chalne se rokta hai (kuch shells me set hota hai)
        Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
        & npm.cmd run dist
        if ($LASTEXITCODE -ne 0) { throw "npm run dist failed with exit code $LASTEXITCODE." }
    }
    finally {
        Pop-Location
    }
}
if (-not (Test-Path -LiteralPath $setupExe)) { throw "Staff installer not found: $setupExe" }

# ---------------------------------------------------------------------------
Write-HubStep "Preparing $target"
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
foreach ($dir in @('hub\lib', 'backend', 'downloads', 'staff-app')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $target $dir) | Out-Null
}

foreach ($file in @('install-hub.ps1', 'uninstall-hub.ps1', 'hub-status.ps1', 'backup-hub.ps1', 'configure-sync.ps1', 'versions.json', 'README.md')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $target 'hub') -Force
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'lib\HubCommon.ps1') -Destination (Join-Path $target 'hub\lib') -Force
Copy-Item -LiteralPath $setupExe -Destination (Join-Path $target 'staff-app') -Force

# Backend + production dependencies (Hub install ko internet nahi chahiye)
$backend = Join-Path $target 'backend'
Copy-Item -LiteralPath (Join-Path $repo 'backend\src') -Destination (Join-Path $backend 'src') -Recurse
foreach ($file in @('package.json', 'package-lock.json')) {
    Copy-Item -LiteralPath (Join-Path $repo "backend\$file") -Destination $backend -Force
}
Write-HubInfo 'Installing backend production dependencies into the package'
Push-Location -LiteralPath $backend
try {
    & npm.cmd ci --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE." }
}
finally {
    Pop-Location
}

# Verified downloads
Write-HubStep 'Adding verified runtime downloads'
$versions = Get-HubVersions (Join-Path $PSScriptRoot 'versions.json')
foreach ($name in @('node', 'mongodb', 'databaseTools', 'winsw')) {
    $file = Get-HubVerifiedDownload -Artifact $versions.$name -CacheDir $CacheDir
    Copy-Item -LiteralPath $file -Destination (Join-Path $target 'downloads') -Force
}

# ---------------------------------------------------------------------------
# Double-click launcher: Administrator maang kar installer chalata hai (window khuli rehti hai)
$launcher = @'
@echo off
echo Starting the Grand Horizon Hub installer (Windows will ask for Administrator permission)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File','\"%~dp0hub\install-hub.ps1\"'"
'@
Write-HubTextFile -Path (Join-Path $target 'Install-Hub.cmd') -Content ($launcher -replace "`r?`n", "`r`n")

$guide = @"
GRAND HORIZON - HOTEL SETUP ($version)
=====================================

A. HUB PC (one always-on computer, with UPS, connected to the router by cable)
   1. In the router, give this PC a fixed IP (DHCP reservation).
   2. Copy this whole folder to the Hub PC (for example C:\GrandHorizon-Setup).
   3. Double-click  Install-Hub.cmd  and click "Yes" when Windows asks for permission.
      No internet is needed: everything is in this folder.
   4. At the end, create the first super-admin (name, email, password with 10+ letters and numbers).
   5. Write down the Hub address it prints, for example  http://192.168.1.10:5000
   6. If it warns that the network is "Public", run the command it shows (makes it Private).

B. EACH STAFF PC (reception, housekeeping, manager)
   1. Run  staff-app\GrandHorizonStaff-Setup-$version.exe
      Windows may say "unknown publisher": click  More info  ->  Run anyway.
   2. Open "Grand Horizon Staff", enter the Hub address from A5, click Test, then Save.
   3. Log in.

C. FIRST DAY (super-admin, in the staff app)
   1. Room Inventory: add every room (number, type, price, capacity, photos).
   2. Staff & Roles: create one account per staff member (receptionist / housekeeping).
   3. PBAC Matrix: check each person's permissions, then Save.

D. DAILY
   - Keep the Hub PC on. Backups run every night at 02:00 into
     C:\ProgramData\GrandHorizonHub\backups
   - Health check (as Administrator):
     powershell -ExecutionPolicy Bypass -File "C:\Program Files\GrandHorizonHub\scripts\hub-status.ps1"

Cloud sync with the website is switched on later with hub\configure-sync.ps1
(see hub\README.md, section "Cloud sync").
"@
Write-HubTextFile -Path (Join-Path $target 'START-HERE.txt') -Content ($guide -replace "`r?`n", "`r`n")

if ($Zip) {
    Write-HubStep 'Creating zip'
    $zipPath = "$target.zip"
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($target, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $true)
    Write-HubInfo "Zip: $zipPath"
}

$sizeMb = [math]::Round(((Get-ChildItem -LiteralPath $target -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB)
Write-HubStep "Hotel setup package ready ($sizeMb MB)"
Write-HubInfo $target
