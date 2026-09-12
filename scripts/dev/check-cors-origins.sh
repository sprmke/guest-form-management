#!/usr/bin/env bash
# CORS smoke for cost/abuse plan §2.4 — run against hosted dev or local functions.
# Usage: BASE_URL=https://<ref>.supabase.co/functions/v1 ./scripts/dev/check-cors-origins.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:54321/functions/v1}"
PATH_SUFFIX="${CORS_PROBE_PATH:-/get-public-platform-status}"

ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-http://localhost:5173}"
BLOCKED_ORIGIN="${BLOCKED_ORIGIN:-https://evil-cors-probe.example}"

probe() {
  local origin="$1"
  curl -s -D - -o /dev/null -X OPTIONS \
    -H "Origin: ${origin}" \
    -H 'Access-Control-Request-Method: GET' \
    "${BASE_URL}${PATH_SUFFIX}" | tr -d '\r'
}

echo "== Allowed origin (${ALLOWED_ORIGIN}) =="
allowed_headers=$(probe "$ALLOWED_ORIGIN")
echo "$allowed_headers" | grep -i "^access-control-allow-origin:" || {
  echo "Missing Access-Control-Allow-Origin for allowed origin" >&2
  exit 1
}
if ! echo "$allowed_headers" | grep -i "^access-control-allow-origin: ${ALLOWED_ORIGIN}$"; then
  echo "Expected Allow-Origin to echo allowed origin" >&2
  echo "$allowed_headers"
  exit 1
fi

echo "== Blocked origin (${BLOCKED_ORIGIN}) =="
blocked_headers=$(probe "$BLOCKED_ORIGIN")
echo "$blocked_headers" | grep -i "^access-control-allow-origin:" || {
  echo "Missing Access-Control-Allow-Origin header" >&2
  exit 1
}
if echo "$blocked_headers" | grep -i "^access-control-allow-origin: ${BLOCKED_ORIGIN}$"; then
  echo "Blocked origin must not be echoed in Allow-Origin" >&2
  exit 1
fi

echo "CORS probe OK."
