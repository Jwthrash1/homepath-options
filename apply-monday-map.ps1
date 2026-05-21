$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot ".env"
$columnMap = '{}'

if (!(Test-Path $envPath)) {
  throw "No .env file found. Run .\setup-monday-token.ps1 first."
}

$lines = Get-Content $envPath
$withoutOldMap = $lines | Where-Object { $_ -notmatch '^MONDAY_COLUMN_MAP=' }
$updated = @($withoutOldMap) + "MONDAY_COLUMN_MAP=$columnMap"

Set-Content -Path $envPath -Value $updated -Encoding UTF8

Write-Host "Updated .env with the Monday column map for board 18414158813."
