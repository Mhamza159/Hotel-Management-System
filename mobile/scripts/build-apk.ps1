#Requires -Version 5.1
<#
.SYNOPSIS
  Builds the Grand Horizon Staff Android app: dist\GrandHorizonStaff-<version>.apk

.DESCRIPTION
  1. Frontend build -> mobile\web, then "cap sync android"
  2. Pehli dafa release signing key banata hai: mobile\signing\ (git-ignored).
     Is folder ka BACKUP rakhein — har update isi key se sign hona chahiye, warna
     phone purani app ke upar naya version install nahi karta.
  3. Gradle assembleRelease, signed APK dist\ me copy.

  JDK 21: JAVA_HOME, warna %LOCALAPPDATA%\GrandHorizonBuild\jdk\jdk-21*
  Android SDK (platform 35, build-tools 35): ANDROID_HOME, warna %LOCALAPPDATA%\Android\Sdk

.EXAMPLE
  cd mobile; npm run apk
#>
[CmdletBinding()]
param(
    [switch]$SkipWebBuild
)

$ErrorActionPreference = 'Stop'
$mobile = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$android = Join-Path $mobile 'android'
$signing = Join-Path $mobile 'signing'
$version = (Get-Content -LiteralPath (Join-Path $mobile 'package.json') -Raw | ConvertFrom-Json).version

function Write-Step([string]$text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }

# ---------------------------------------------------------------- tools
$javaHome = $env:JAVA_HOME
if (-not $javaHome -or -not (Test-Path -LiteralPath (Join-Path $javaHome 'bin\java.exe'))) {
    $bundled = Get-ChildItem -Path (Join-Path $env:LOCALAPPDATA 'GrandHorizonBuild\jdk') -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if (-not $bundled) { throw 'JDK 21 not found. Set JAVA_HOME or unpack Temurin 21 into %LOCALAPPDATA%\GrandHorizonBuild\jdk.' }
    $javaHome = $bundled.FullName
}
$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"
# Gradle wrapper download: kuch networks par Java IPv6 se atak jata hai
$env:JAVA_TOOL_OPTIONS = '-Djava.net.preferIPv4Stack=true'

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path -LiteralPath (Join-Path $sdk 'platforms\android-35'))) {
    throw "Android SDK platform 35 not found in $sdk (sdkmanager `"platforms;android-35`" `"build-tools;35.0.0`")."
}
$env:ANDROID_HOME = $sdk
# Gradle ko SDK ka rasta (local.properties git-ignored hai)
Set-Content -LiteralPath (Join-Path $android 'local.properties') -Encoding ascii -Value ('sdk.dir=' + $sdk.Replace('\', '/'))

Write-Host "JDK:     $javaHome"
Write-Host "SDK:     $sdk"
Write-Host "Version: $version"

# ---------------------------------------------------------------- web
Push-Location -LiteralPath $mobile
try {
    if (-not $SkipWebBuild) {
        Write-Step 'Building the staff web app'
        & npm.cmd run build:web
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed ($LASTEXITCODE)." }
    }
    Write-Step 'Copying it into the Android project'
    & npx.cmd cap sync android
    if ($LASTEXITCODE -ne 0) { throw "cap sync failed ($LASTEXITCODE)." }
}
finally {
    Pop-Location
}

# ---------------------------------------------------------------- signing key
$propsFile = Join-Path $signing 'keystore.properties'
if (-not (Test-Path -LiteralPath $propsFile)) {
    Write-Step 'Creating the release signing key (first build only)'
    New-Item -ItemType Directory -Force -Path $signing | Out-Null
    $bytes = New-Object byte[] 24
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes); $rng.Dispose()
    $password = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
    & (Join-Path $javaHome 'bin\keytool.exe') -genkeypair -keystore (Join-Path $signing 'grandhorizon-staff.jks') `
        -alias grandhorizon-staff -keyalg RSA -keysize 2048 -validity 10000 `
        -dname 'CN=Grand Horizon Staff, O=Grand Horizon' -storepass $password -keypass $password
    if ($LASTEXITCODE -ne 0) { throw "keytool failed ($LASTEXITCODE)." }
    Set-Content -LiteralPath $propsFile -Encoding ascii -Value @(
        'storeFile=grandhorizon-staff.jks',
        "storePassword=$password",
        'keyAlias=grandhorizon-staff',
        "keyPassword=$password"
    )
    Write-Host "    Key saved in $signing" -ForegroundColor Yellow
    Write-Host '    BACKUP this folder (USB/drive). Without it, future updates cannot install over this app.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------- gradle
Write-Step 'Building the APK (first build downloads Gradle and libraries)'
Push-Location -LiteralPath $android
try {
    & .\gradlew.bat assembleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "Gradle build failed ($LASTEXITCODE)." }
}
finally {
    Pop-Location
}

$built = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path -LiteralPath $built)) { throw "APK not found: $built" }
$dist = Join-Path $mobile 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$target = Join-Path $dist "GrandHorizonStaff-$version.apk"
Copy-Item -LiteralPath $built -Destination $target -Force

$sizeMb = [math]::Round((Get-Item -LiteralPath $target).Length / 1MB, 1)
Write-Step "APK ready ($sizeMb MB)"
Write-Host "    $target"
