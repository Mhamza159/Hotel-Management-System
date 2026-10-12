# Shared helpers for the Grand Horizon Hub scripts (Windows PowerShell 5.1+).
# Dot-source it:  . (Join-Path $PSScriptRoot 'lib\HubCommon.ps1')

Set-StrictMode -Version 3.0

$script:HubNames = @{
    MongoService  = 'GrandHorizonMongo'
    ApiService    = 'GrandHorizonHubApi'
    FirewallRule  = 'Grand Horizon Hub API'
    BackupTask    = 'Grand Horizon Hub Backup'
    DatabaseName  = 'grand_horizon_hub'
    ReplSetName   = 'rs0'
    ManifestFile  = 'hub-install.json'
}

# Well-known SIDs, so the scripts work on non-English Windows too
$script:HubSids = @{
    Administrators = '*S-1-5-32-544'
    System         = '*S-1-5-18'
    NetworkService = '*S-1-5-20'
}

function Write-HubStep {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host ''
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-HubInfo {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "    $Message"
}

function Write-HubWarning {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host "    WARNING: $Message" -ForegroundColor Yellow
}

function Test-HubAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-HubVersions {
    param([Parameter(Mandatory)][string]$Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Write-HubTextFile {
    # UTF-8 without BOM (dotenv / YAML / WinSW read it as plain text)
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Content)
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Get-HubFileSha256 {
    param([Parameter(Mandatory)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-HubVerifiedDownload {
    <#
      Downloads $Artifact.url into $CacheDir (resumable, retried) and returns the
      local path only if its SHA-256 equals $Artifact.sha256. A cached file with the
      right hash is reused, so re-running the installer does not download again.
    #>
    param(
        [Parameter(Mandatory)]$Artifact,
        [Parameter(Mandatory)][string]$CacheDir
    )

    New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
    $expected = $Artifact.sha256.ToLowerInvariant()
    $fileName = [System.IO.Path]::GetFileName(([Uri]$Artifact.url).AbsolutePath)
    $target = Join-Path $CacheDir $fileName
    $partial = "$target.partial"

    if ((Test-Path -LiteralPath $target) -and ((Get-HubFileSha256 $target) -eq $expected)) {
        Write-HubInfo "$fileName (cached, checksum OK)"
        return $target
    }
    if ((Test-Path -LiteralPath $partial) -and ((Get-HubFileSha256 $partial) -eq $expected)) {
        Move-Item -LiteralPath $partial -Destination $target -Force
        Write-HubInfo "$fileName (checksum OK)"
        return $target
    }

    # Windows 10 1803+ ships curl.exe, which can resume an interrupted download
    $curl = Join-Path $env:SystemRoot 'System32\curl.exe'
    $downloaded = $false
    for ($attempt = 1; $attempt -le 5 -and -not $downloaded; $attempt++) {
        Write-HubInfo "Downloading $fileName (attempt $attempt)..."
        if (Test-Path -LiteralPath $curl) {
            & $curl --fail --location --silent --show-error --retry 3 --continue-at - --output $partial $Artifact.url
            $downloaded = ($LASTEXITCODE -eq 0)
        }
        else {
            try {
                $oldProgress = $ProgressPreference
                $ProgressPreference = 'SilentlyContinue'
                Invoke-WebRequest -Uri $Artifact.url -OutFile $partial -UseBasicParsing
                $downloaded = $true
            }
            catch {
                Write-HubWarning $_.Exception.Message
            }
            finally {
                $ProgressPreference = $oldProgress
            }
        }
        if (-not $downloaded) { Start-Sleep -Seconds (3 * $attempt) }
    }
    if (-not $downloaded) {
        throw "Could not download $($Artifact.url). Check the internet connection and run the installer again (it resumes)."
    }

    $actual = Get-HubFileSha256 $partial
    if ($actual -ne $expected) {
        Remove-Item -LiteralPath $partial -Force
        throw "Checksum mismatch for $fileName (expected $expected, got $actual). The file was deleted; nothing was installed from it."
    }
    Move-Item -LiteralPath $partial -Destination $target -Force
    Write-HubInfo "$fileName (checksum OK)"
    return $target
}

function Expand-HubZip {
    <#
      Extracts a vendor zip into $Destination, dropping the zip's single top-level
      folder. With -Entries, only those paths (relative to that folder, using "/")
      are extracted and all of them must exist. Rejects entries that would escape
      $Destination.
    #>
    param(
        [Parameter(Mandatory)][string]$ZipPath,
        [Parameter(Mandatory)][string]$Destination,
        [string[]]$Entries
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    $root = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
    $wanted = @{}
    if ($Entries) { foreach ($entry in $Entries) { $wanted[$entry.ToLowerInvariant()] = $false } }

    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        foreach ($item in $zip.Entries) {
            if ([string]::IsNullOrEmpty($item.Name)) { continue } # directory entry
            $slash = $item.FullName.IndexOf('/')
            if ($slash -lt 0) { continue }
            $relative = $item.FullName.Substring($slash + 1)
            if ($Entries) {
                $key = $relative.ToLowerInvariant()
                if (-not $wanted.ContainsKey($key)) { continue }
                $wanted[$key] = $true
            }
            $target = [System.IO.Path]::GetFullPath((Join-Path $root ($relative -replace '/', '\')))
            if (-not $target.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Unsafe path in $([System.IO.Path]::GetFileName($ZipPath)): $($item.FullName)"
            }
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($item, $target, $true)
        }
    }
    finally {
        $zip.Dispose()
    }

    $missing = @($wanted.Keys | Where-Object { -not $wanted[$_] })
    if ($missing.Count -gt 0) {
        throw "Missing in $([System.IO.Path]::GetFileName($ZipPath)): $($missing -join ', ')"
    }
}

function Get-HubServicePath {
    # Command line of an installed service, or $null if it does not exist
    param([Parameter(Mandatory)][string]$Name)
    $service = Get-CimInstance -ClassName Win32_Service -Filter "Name='$Name'" -ErrorAction SilentlyContinue
    if ($service) { return $service.PathName }
    return $null
}

function Remove-HubService {
    # Stops and deletes a service, waiting until Windows has really removed it
    param([Parameter(Mandatory)][string]$Name)
    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $service) { return }
    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $Name -Force
        $service.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(60))
    }
    & sc.exe delete $Name | Out-Null
    for ($i = 0; $i -lt 30 -and (Get-Service -Name $Name -ErrorAction SilentlyContinue); $i++) {
        Start-Sleep -Seconds 1
    }
    if (Get-Service -Name $Name -ErrorAction SilentlyContinue) {
        throw "Service $Name is marked for deletion but still exists. Close the Services window (services.msc) or restart Windows, then run the installer again."
    }
}

function Read-HubManifest {
    param([Parameter(Mandatory)][string]$InstallDir)
    $path = Join-Path $InstallDir $script:HubNames.ManifestFile
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Hub manifest not found at $path. Is the Hub installed?"
    }
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}

function Invoke-HubCli {
    <#
      Runs backend/src/hub/cli.js with the Hub's node.exe and returns the parsed
      "HUB_RESULT {...}" object. Throws when the command fails.
    #>
    param(
        [Parameter(Mandatory)][string]$NodeExe,
        [Parameter(Mandatory)][string]$AppDir,
        [Parameter(Mandatory)][string]$EnvFile,
        [Parameter(Mandatory)][string[]]$Arguments
    )
    $previousEnvFile = $env:HOTEL_ENV_FILE
    $env:HOTEL_ENV_FILE = $EnvFile
    Push-Location -LiteralPath $AppDir
    try {
        $output = & $NodeExe (Join-Path $AppDir 'src\hub\cli.js') @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
        $env:HOTEL_ENV_FILE = $previousEnvFile
    }

    $line = @($output | Where-Object { $_ -like 'HUB_RESULT *' }) | Select-Object -Last 1
    if (-not $line) {
        throw "Hub CLI '$($Arguments[0])' printed no result (exit code $exitCode)."
    }
    $result = $line.Substring('HUB_RESULT '.Length) | ConvertFrom-Json
    if ($exitCode -ne 0 -or -not $result.ok) {
        throw "Hub CLI '$($Arguments[0])' failed: $($result.error)"
    }
    return $result
}

function Wait-HubHealth {
    param([Parameter(Mandatory)][int]$Port, [int]$TimeoutSeconds = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5 -UseBasicParsing
            if ($health.status -eq 'ok') { return $true }
        }
        catch {
            # not up yet
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Get-HubLanAddresses {
    try {
        return @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
            Select-Object -ExpandProperty IPAddress)
    }
    catch {
        return @()
    }
}
