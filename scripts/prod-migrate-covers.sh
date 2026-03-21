#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:?BASE_URL required}"
ADMIN_TOKEN="${2:?ADMIN_TOKEN required}"

h_auth="Authorization: Bearer ${ADMIN_TOKEN}"

echo "== Preview =="
preview="$(curl -fsS "${BASE_URL}/api/admin/migrate/covers/preview?sample=10" -H "${h_auth}")"
echo "${preview}" | jq .

needs="$(echo "${preview}" | jq -r '.needsMigration')"
if [[ "${needs}" != "true" ]]; then
  echo "No migration needed."
  exit 0
fi

echo "== Migrate =="
curl -fsS "${BASE_URL}/api/admin/migrate/covers" -H "${h_auth}" -H "Content-Type: application/json" -d '{"confirm":true}' | jq .

echo "== Preview after migrate =="
curl -fsS "${BASE_URL}/api/admin/migrate/covers/preview?sample=10" -H "${h_auth}" | jq .

