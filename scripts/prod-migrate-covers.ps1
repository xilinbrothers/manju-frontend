$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$AdminToken
)

$h = @{ Authorization = "Bearer $AdminToken" }

Write-Host "== Preview =="
$preview = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/migrate/covers/preview?sample=10" -Headers $h
$preview | ConvertTo-Json -Depth 8

if ($preview.needsMigration -ne $true) {
  Write-Host "No migration needed."
  exit 0
}

Write-Host "== Migrate =="
Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/admin/migrate/covers" -Headers $h -ContentType "application/json" -Body '{"confirm":true}' | ConvertTo-Json -Depth 8

Write-Host "== Preview after migrate =="
Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/migrate/covers/preview?sample=10" -Headers $h | ConvertTo-Json -Depth 8

