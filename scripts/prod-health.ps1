$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$AdminToken
)

$h = @{ Authorization = "Bearer $AdminToken" }

Write-Host "== /api/admin/auth/me =="
Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/auth/me" -Headers $h | ConvertTo-Json -Depth 8

Write-Host "== /api/admin/health/storage =="
Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/health/storage" -Headers $h | ConvertTo-Json -Depth 8

Write-Host "== /api/admin/migrate/covers/preview =="
Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/migrate/covers/preview?sample=10" -Headers $h | ConvertTo-Json -Depth 8

Write-Host "== /api/admin/audit (latest 20) =="
Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/admin/audit?limit=20" -Headers $h | ConvertTo-Json -Depth 8

