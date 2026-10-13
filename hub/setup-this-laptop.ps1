#Requires -Version 5.1
# Is laptop ko Hub banata hai (developer laptop: port 5000 dev backend ke liye khali rehta hai)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$installed = Join-Path $env:ProgramFiles 'GrandHorizonHub\scripts\uninstall-hub.ps1'

Write-Host ''
Write-Host '=== Grand Horizon: is laptop ko Hub banana ===' -ForegroundColor Cyan

if (Test-Path -LiteralPath $installed) {
    Write-Host ''
    Write-Host 'Purana test Hub mila. Use hata kar saaf shuru karte hain.' -ForegroundColor Yellow
    Write-Host '(Test rooms, accounts aur bookings mit jayenge. Rokna ho to window band kar dein.)'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $installed -RemoveData
    if ($LASTEXITCODE -ne 0) { throw 'Purana Hub nahi hata. Upar ka error dekhein.' }
}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $here 'install-hub.ps1') -ApiPort 5100 -MongoPort 27100
if ($LASTEXITCODE -ne 0) { throw 'Hub install nahi hua. Upar ka error dekhein.' }

Write-Host ''
Write-Host '=== Network ko Private banana (doosre laptops Hub tak pohnch sakein) ===' -ForegroundColor Cyan
foreach ($network in @(Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' })) {
    Set-NetConnectionProfile -InterfaceIndex $network.InterfaceIndex -NetworkCategory Private
    Write-Host "    '$($network.Name)' ab Private hai"
}

Write-Host ''
Write-Host '=== Charger par laptop kabhi na soye, lid band karne par bhi chalta rahe ===' -ForegroundColor Cyan
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
powercfg /setactive SCHEME_CURRENT
Write-Host '    Ho gaya. Laptop ko hamesha charger par rakhein.'

Write-Host ''
Write-Host '=== Status ===' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $env:ProgramFiles 'GrandHorizonHub\scripts\hub-status.ps1')

Write-Host ''
Write-Host 'MUKAMMAL. Upar "Staff app Hub URL" wala address staff laptops ki app me daalein.' -ForegroundColor Green
