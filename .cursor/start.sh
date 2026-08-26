#!/usr/bin/env bash
# Cloud Agent start phase (runs on every boot): start Docker with the nested-VM
# network fixes, bring up the local Supabase stack, and reload Kong so the
# /functions/v1 routes resolve. Returns once the stack is ready; the long-running
# edge-functions and UI dev servers are launched as terminals.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

"$ROOT/.cursor/write-env-files.sh"
"$ROOT/.cursor/docker-up.sh"

echo "==== [start] supabase start ===="
./scripts/run-with-ui-dev-env.sh npx --yes supabase@latest start

# Reload Kong so cached edge-runtime DNS is refreshed after container recreation.
docker restart supabase_kong_guest-form-management >/dev/null 2>&1 || true

echo "==== [start] local Supabase is up (API :54321, Studio :54323) ===="
