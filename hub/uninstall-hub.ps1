#Requires -Version 5.1
<#
.SYNOPSIS
  Removes the Grand Horizon Hub services, firewall rule, backup task and program files.

.DESCRIPTION
  The database, hub.env, logs and backups in the data folder are KEPT unless
  -RemoveData is given (which asks you to type DELETE, unless -Force).
#>
[CmdletBinding()]
param(
    [string]$InstallDir = '',
    [switch]$RemoveData,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\HubCommon.ps1')

if (-not (Test-HubAdministrator)) {
    throw 'Run this script from an elevated PowerShell (Run as Administrator).'
}
if (-not $InstallDir) {
    $parent = Split-Path -Parent $PSScriptRoot
    if (Test-Path -LiteralPath (Join-Path $parent $HubNames.ManifestFile)) { $InstallDir = $parent }
    else { $InstallDir = Join-Path $env:ProgramFiles 'GrandHorizonHub' }
}

$dataDir = $null
try { $dataDir = (Read-HubManifest $InstallDir).dataDir } catch { Write-HubWarning $_.Exception.Message }

if ($RemoveData -and $dataDir -and -not $Force) {
    Write-HubWarning "This permanently deletes the Hub database, hub.env and backups in $dataDir."
    if ((Read-Host '    Type DELETE to continue') -cne 'DELETE') { throw 'Cancelled.' }
}

Write-HubStep 'Removing services'
Remove-HubService $HubNames.ApiService
Remove-HubService $HubNames.MongoService

Write-HubStep 'Removing firewall rule and backup task'
Get-NetFirewallRule -DisplayName $HubNames.FirewallRule -ErrorAction SilentlyContinue | Remove-NetFirewallRule
if (Get-ScheduledTask -TaskName $HubNames.BackupTask -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $HubNames.BackupTask -Confirm:$false
}

Write-HubStep "Removing program files in $InstallDir"
Set-Location -LiteralPath $env:TEMP
if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }

if ($RemoveData -and $dataDir -and (Test-Path -LiteralPath $dataDir)) {
    Write-HubStep "Removing data in $dataDir"
    Remove-Item -LiteralPath $dataDir -Recurse -Force
}
elseif ($dataDir) {
    Write-HubInfo "Data kept in $dataDir (database, hub.env, backups). Re-installing reuses it."
}

Write-HubStep 'Grand Horizon Hub removed'
