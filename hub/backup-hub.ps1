#Requires -Version 5.1
<#
.SYNOPSIS
  Backs up the Grand Horizon Hub database (run daily by the "Grand Horizon Hub Backup" task).

.DESCRIPTION
  Writes a gzip mongodump archive to <DataDir>\backups, optionally copies it to the
  backup mirror folder (e.g. a USB drive or NAS), keeps the newest N archives, and
  rotates the MongoDB log. Results are appended to <DataDir>\logs\backup.log.

  Restore (stops nothing by itself; stop the API service first):
    mongorestore --uri="mongodb://127.0.0.1:27017/?directConnection=true" --gzip --archive="<file>" --drop
#>
[CmdletBinding()]
param(
    [string]$InstallDir = ''
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\HubCommon.ps1')
# Windows PowerShell 5.1 leaves $PSScriptRoot empty inside param() defaults
if (-not $InstallDir) { $InstallDir = Split-Path -Parent $PSScriptRoot }

$manifest = Read-HubManifest $InstallDir
$logFile = Join-Path $manifest.dataDir 'logs\backup.log'
function Write-BackupLog {
    param([string]$Message)
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Remove-OldArchives {
    param([string]$Folder, [int]$Keep)
    Get-ChildItem -LiteralPath $Folder -Filter 'hub-*.archive.gz' -File |
        Sort-Object Name -Descending |
        Select-Object -Skip $Keep |
        Remove-Item -Force
}

try {
    $backupDir = Join-Path $manifest.dataDir 'backups'
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Get-ChildItem -LiteralPath $backupDir -Filter '*.partial' -File | Remove-Item -Force

    $archive = Join-Path $backupDir "hub-$(Get-Date -Format 'yyyyMMdd-HHmmss').archive.gz"
    $partial = "$archive.partial"
    $mongodump = Join-Path $InstallDir 'runtime\tools\bin\mongodump.exe'
    & $mongodump "--uri=mongodb://127.0.0.1:$($manifest.mongoPort)/?directConnection=true" `
        "--db=$($manifest.databaseName)" "--archive=$partial" --gzip --quiet
    if ($LASTEXITCODE -ne 0) { throw "mongodump failed with exit code $LASTEXITCODE" }
    Move-Item -LiteralPath $partial -Destination $archive
    $sizeMb = [math]::Round((Get-Item -LiteralPath $archive).Length / 1MB, 2)
    Write-BackupLog "OK $archive ($sizeMb MB)"

    Remove-OldArchives -Folder $backupDir -Keep $manifest.backupKeep

    if ($manifest.backupMirrorDir) {
        try {
            New-Item -ItemType Directory -Force -Path $manifest.backupMirrorDir | Out-Null
            Copy-Item -LiteralPath $archive -Destination $manifest.backupMirrorDir -Force
            Remove-OldArchives -Folder $manifest.backupMirrorDir -Keep $manifest.backupKeep
            Write-BackupLog "Mirrored to $($manifest.backupMirrorDir)"
        }
        catch {
            Write-BackupLog "WARNING mirror copy failed: $($_.Exception.Message)"
        }
    }

    # Rotate mongod.log and drop rotated logs older than the backup window
    try {
        $null = Invoke-HubCli -NodeExe (Join-Path $InstallDir 'runtime\node\node.exe') `
            -AppDir (Join-Path $InstallDir 'app') -EnvFile (Join-Path $manifest.dataDir 'hub.env') `
            -Arguments @('rotate-logs')
        $cutoff = (Get-Date).AddDays(-$manifest.backupKeep)
        Get-ChildItem -LiteralPath (Join-Path $manifest.dataDir 'logs') -Filter 'mongod.log.*' -File |
            Where-Object { $_.LastWriteTime -lt $cutoff } |
            Remove-Item -Force
    }
    catch {
        Write-BackupLog "WARNING log rotation failed: $($_.Exception.Message)"
    }
}
catch {
    Write-BackupLog "ERROR $($_.Exception.Message)"
    exit 1
}
