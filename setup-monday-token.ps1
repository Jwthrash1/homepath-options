$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Monday.com token setup"
Write-Host "----------------------"
Write-Host "Paste your NEW regenerated Monday API token when prompted."
Write-Host "It will be saved only on this computer in a local .env file."
Write-Host ""

$secureToken = Read-Host "Paste Monday API token" -AsSecureString
$plainToken = [System.Net.NetworkCredential]::new("", $secureToken).Password

if ([string]::IsNullOrWhiteSpace($plainToken)) {
  throw "No token was entered."
}

$boardId = Read-Host "Monday board ID [18414158813]"
if ([string]::IsNullOrWhiteSpace($boardId)) {
  $boardId = "18414158813"
}

$envContent = @"
MONDAY_API_TOKEN=$plainToken
MONDAY_BOARD_ID=$boardId
"@

$envPath = Join-Path $PSScriptRoot ".env"
Set-Content -Path $envPath -Value $envContent -Encoding UTF8

Write-Host ""
Write-Host "Saved local Monday settings to:"
Write-Host $envPath
Write-Host ""
Write-Host "Next, run this command to inspect the Monday board columns:"
Write-Host "C:\Users\jwthr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe monday-inspect.mjs"
Write-Host ""
