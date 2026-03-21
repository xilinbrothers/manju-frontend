#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:?BASE_URL required}"
ADMIN_TOKEN="${2:?ADMIN_TOKEN required}"

h_auth="Authorization: Bearer ${ADMIN_TOKEN}"

echo "== /api/admin/auth/me =="
curl -fsS "${BASE_URL}/api/admin/auth/me" -H "${h_auth}" | jq .

echo "== /api/admin/health/storage =="
curl -fsS "${BASE_URL}/api/admin/health/storage" -H "${h_auth}" | jq .

echo "== /api/admin/migrate/covers/preview =="
curl -fsS "${BASE_URL}/api/admin/migrate/covers/preview?sample=10" -H "${h_auth}" | jq .

echo "== /api/admin/audit (latest 20) =="
curl -fsS "${BASE_URL}/api/admin/audit?limit=20" -H "${h_auth}" | jq .

