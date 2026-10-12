#Requires -Version 5.1
<#
.SYNOPSIS
  Shows whether the Grand Horizon Hub is healthy. Run as Administrator for the database check.
#>
[CmdletBinding()]
param(
    [string]$InstallDir = ''
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\HubCommon.ps1')

if (-not $InstallDir) {
    # Installed copy lives in <InstallDir>\scripts; the repo copy falls back to the default folder
    $parent = Split-Path -Parent $PSScriptRoot
    if (Test-Path -LiteralPath (Join-Path $parent $HubNames.ManifestFile)) { $InstallDir = $parent }
    else { $InstallDir = Join-Path $env:ProgramFiles 'GrandHorizonHub' }
}
$manifest = Read-HubManifest $InstallDir

Write-HubStep 'Services'
foreach ($name in @($HubNames.MongoService, $HubNames.ApiService)) {
    $service = Get-Service -Name $name -ErrorAction SilentlyContinue
    if ($service) { Write-HubInfo ('{0,-22} {1}' -f $name, $service.Status) }
    else { Write-HubWarning "$name is not installed" }
}

Write-HubStep 'API'
if (Wait-HubHealth -Port $manifest.apiPort -TimeoutSeconds 5) {
    Write-HubInfo "Healthy on port $($manifest.apiPort)"
}
else {
    Write-HubWarning "No answer on http://127.0.0.1:$($manifest.apiPort)/health - see $(Join-Path $manifest.dataDir 'logs')"
}

Write-HubStep 'Database'
if (Test-HubAdministrator) {
    try {
        $status = Invoke-HubCli -NodeExe (Join-Path $InstallDir 'runtime\node\node.exe') `
            -AppDir (Join-Path $InstallDir 'app') -EnvFile (Join-Path $manifest.dataDir 'hub.env') `
            -Arguments @('status')
        Write-HubInfo "Database $($status.database), replica set $($status.replicaSet), primary: $($status.isWritablePrimary)"
        Write-HubInfo "Staff accounts: $($status.staff) (super-admins: $($status.superAdmins))"
    }
    catch {
        Write-HubWarning $_.Exception.Message
    }
}
else {
    Write-HubInfo 'Skipped (run as Administrator to check the database)'
}

Write-HubStep 'Backups'
$latest = Get-ChildItem -LiteralPath (Join-Path $manifest.dataDir 'backups') -Filter 'hub-*.archive.gz' -File -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending | Select-Object -First 1
if ($latest) { Write-HubInfo "Latest: $($latest.Name) ($($latest.LastWriteTime))" }
else { Write-HubWarning 'No backup yet' }
$task = Get-ScheduledTask -TaskName $HubNames.BackupTask -ErrorAction SilentlyContinue
if ($task) {
    $info = $task | Get-ScheduledTaskInfo
    Write-HubInfo "Daily task: last run $($info.LastRunTime) (result $($info.LastTaskResult)), next $($info.NextRunTime)"
}
else { Write-HubWarning 'Backup task is not scheduled' }

Write-HubStep 'Network'
if (Get-NetFirewallRule -DisplayName $HubNames.FirewallRule -ErrorAction SilentlyContinue) {
    Write-HubInfo "Firewall rule '$($HubNames.FirewallRule)' present"
}
else { Write-HubWarning 'Firewall rule missing - staff PCs cannot connect' }
foreach ($network in @(Get-NetConnectionProfile -ErrorAction SilentlyContinue)) {
    Write-HubInfo "Network '$($network.Name)': $($network.NetworkCategory)"
}
foreach ($address in (Get-HubLanAddresses)) { Write-HubInfo "Staff app Hub URL: http://${address}:$($manifest.apiPort)" }

Write-HubStep 'Versions'
Write-HubInfo "Node.js $($manifest.versions.node), MongoDB $($manifest.versions.mongodb), Database Tools $($manifest.versions.databaseTools)"
