#!/bin/bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Load ui/.env.development so GOOGLE_CLIENT_* are set for supabase/config.toml env().
echo "Starting Supabase (DB, Auth, Storage)..."
# Use CLI from npx so Postgres 17 + storage schema order matches migrations (global `supabase` <2.80 often fails on storage.buckets).
"$ROOT/scripts/run-with-ui-dev-env.sh" npx --yes supabase@latest start

# Remove the Docker edge-runtime so `functions serve` (below) owns /functions/v1/*.
# If you run `npm run db:reset` while ./dev.sh is running, Kong can keep routing to a
# stale container IP → 502 Bad Gateway on edge routes. Fix: npm run stop:supabase && ./dev.sh
docker rm -f supabase_edge_runtime_guest-form-management 2>/dev/null || true

# Start edge functions with secrets from supabase/.env.local.
# --env-file is required; without it Deno env vars like ADMIN_ALLOWED_EMAILS are not injected.
echo "Starting Supabase Edge Functions (with supabase/.env.local secrets)..."
# Same GOOGLE_CLIENT_* as supabase start: config.toml uses env(...) and the CLI
# warns (and Kong reload can miss values) if the shell has no GOOGLE_CLIENT_ID/SECRET.
"$ROOT/scripts/run-with-ui-dev-env.sh" npx --yes supabase@latest functions serve --env-file "$ROOT/supabase/.env.local" &
FUNCTIONS_PID=$!

# Ensure the functions server is stopped when this script exits.
trap "kill $FUNCTIONS_PID 2>/dev/null" EXIT

# Start the UI
echo "Starting UI development server..."
cd "$ROOT/ui" && npm run dev
