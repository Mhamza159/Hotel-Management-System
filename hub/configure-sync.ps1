#Requires -Version 5.1
<#
.SYNOPSIS
  Connects the Grand Horizon Hub to the cloud (website) for two-way sync.

.DESCRIPTION
  1. Run with -GenerateKey once: prints a new shared key. Put the same value in the
     cloud backend's environment as SYNC_SHARED_KEY (Vercel > backend project >
     Settings > Environment Variables) and redeploy.
  2. Run with -CloudUrl: asks for that key, checks the cloud accepts it, saves
     CLOUD_SYNC_URL and SYNC_SHARED_KEY in hub.env, stamps pre-sync Hub data and
     restarts the Hub API so the sync agent starts.
  -Disable removes the cloud settings (the Hub keeps working offline).

.EXAMPLE
  .\configure-sync.ps1 -GenerateKey
  .\configure-sync.ps1 -CloudUrl https://my-backend.vercel.app
#>
[CmdletBinding(DefaultParameterSetName = 'Connect')]
param(
    [Parameter(ParameterSetName = 'Connect', Mandatory)][string]$CloudUrl,
    [Parameter(ParameterSetName = 'Generate', Mandatory)][switch]$GenerateKey,
    [Parameter(ParameterSetName = 'Disable', Mandatory)][switch]$Disable,
    [string]$InstallDir = ''
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\HubCommon.ps1')

if ($GenerateKey) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $key = ($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
    Write-HubStep 'New sync key (keep it secret; it is shown only now)'
    Write-Host ''
    Write-Host "    $key" -ForegroundColor Green
    Write-Host ''
    Write-HubInfo '1. Cloud: add SYNC_SHARED_KEY with this value to the backend environment and redeploy.'
    Write-HubInfo '2. Hub:   run this script again with -CloudUrl <backend URL> and paste the same key.'
    return
}

if (-not (Test-HubAdministrator)) {
    throw 'Run this script from an elevated PowerShell (Run as Administrator).'
}
if (-not $InstallDir) {
    $parent = Split-Path -Parent $PSScriptRoot
    if (Test-Path -LiteralPath (Join-Path $parent $HubNames.ManifestFile)) { $InstallDir = $parent }
    else { $InstallDir = Join-Path $env:ProgramFiles 'GrandHorizonHub' }
}
$manifest = Read-HubManifest $InstallDir
$envFile = Join-Path $manifest.dataDir 'hub.env'
$nodeExe = Join-Path $InstallDir 'runtime\node\node.exe'
$appDir = Join-Path $InstallDir 'app'

function Restart-HubApi {
    Write-HubStep 'Restarting the Hub API'
    Restart-Service -Name $HubNames.ApiService -Force
    if (-not (Wait-HubHealth -Port $manifest.apiPort)) {
        throw "The Hub API did not come back. See logs in $(Join-Path $manifest.dataDir 'logs')."
    }
    Write-HubInfo 'Hub API is running'
}

Set-HubEnvValue -Path $envFile -Name 'SYNC_NODE' -Value 'hub'

if ($Disable) {
    Set-HubEnvValue -Path $envFile -Name 'CLOUD_SYNC_URL' -Value ''
    Set-HubEnvValue -Path $envFile -Name 'SYNC_SHARED_KEY' -Value ''
    Restart-HubApi
    Write-HubStep 'Cloud sync disabled. The website closes online booking while the Hub is not syncing.'
    return
}

# Accept https://host, https://host/ or https://host/api/v1
$apiUrl = $CloudUrl.Trim().TrimEnd('/')
if ($apiUrl -notmatch '/api/v\d+$') { $apiUrl = "$apiUrl/api/v1" }
if ($apiUrl -notmatch '^https?://') { throw "CloudUrl must start with https:// (got '$CloudUrl')." }
if ($apiUrl -notmatch '^https://') { Write-HubWarning 'The cloud URL is not https; the sync key would travel unencrypted.' }

Write-HubStep "Checking $apiUrl"
try {
    $null = Invoke-RestMethod -Uri "$apiUrl/sync/availability" -TimeoutSec 20 -UseBasicParsing
}
catch {
    throw "The cloud did not answer $apiUrl/sync/availability. Is the URL right and the sync version deployed? ($($_.Exception.Message))"
}

$secure = Read-Host '    Sync key (same value as SYNC_SHARED_KEY in the cloud)' -AsSecureString
$key = [System.Net.NetworkCredential]::new('', $secure).Password.Trim()
if ($key.Length -lt 32) { throw 'The sync key must be at least 32 characters. Use -GenerateKey to make one.' }

try {
    $null = Invoke-RestMethod -Method Post -Uri "$apiUrl/sync/pull" -Body '{"limit":1}' -ContentType 'application/json' `
        -Headers @{ Authorization = "Bearer $key" } -TimeoutSec 30 -UseBasicParsing
}
catch {
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    if ($status -eq 401) { throw 'The cloud rejected the key. Check that SYNC_SHARED_KEY in the cloud has exactly the same value.' }
    if ($status -eq 404) { throw 'Sync is not enabled in the cloud yet: set SYNC_SHARED_KEY in the cloud environment and redeploy.' }
    throw "Sync check failed: $($_.Exception.Message)"
}
Write-HubInfo 'Cloud accepted the key'

Set-HubEnvValue -Path $envFile -Name 'CLOUD_SYNC_URL' -Value $apiUrl
Set-HubEnvValue -Path $envFile -Name 'SYNC_SHARED_KEY' -Value $key
$key = $null
Write-HubInfo 'Saved cloud settings in hub.env'

# Data created on the Hub before sync existed has no sync stamp yet
$backfill = Invoke-HubCli -NodeExe $nodeExe -AppDir $appDir -EnvFile $envFile -Arguments @('sync-backfill')
$stamped = ($backfill.stamped.PSObject.Properties | Measure-Object -Property Value -Sum).Sum
Write-HubInfo "Prepared $stamped existing Hub record(s) for upload"

Restart-HubApi
Write-HubStep 'Cloud sync is on. Check it with hub-status.ps1 in a minute.'
