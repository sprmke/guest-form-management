#!/usr/bin/env bash
# Serve the Supabase Edge Functions on the host with secrets from
# supabase/.env.local, and reload Kong once the edge-runtime container is up so
# /functions/v1 routes resolve. Mirrors the edge portion of dev.sh. Foreground.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Wait for the local Supabase stack (started by start.sh) to be reachable.
for _ in $(seq 1 90); do
  if ./scripts/run-with-ui-dev-env.sh npx --yes supabase@latest status >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# Remove the stale edge-runtime container so functions serve gets a clean start
# with the injected env vars.
docker rm -f supabase_edge_runtime_guest-form-management >/dev/null 2>&1 || true

# Reload Kong shortly after the edge-runtime container comes up (DNS cache fix).
(
  for _ in $(seq 1 60); do
    if docker ps --format '{{.Names}}' | grep -q '^supabase_edge_runtime_guest-form-management$'; then
      sleep 2
      docker restart supabase_kong_guest-form-management >/dev/null 2>&1 || true
      break
    fi
    sleep 1
  done
) &

# shellcheck source=/dev/null
source "$ROOT/scripts/export-local-supabase-runtime-env.sh"
exec npx --yes supabase@latest functions serve --env-file "$ROOT/supabase/.env.local"
