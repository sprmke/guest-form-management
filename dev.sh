#!/bin/bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Load ui/.env.development so GOOGLE_CLIENT_* are set for supabase/config.toml env().
echo "Starting Supabase (DB, Auth, Storage)..."
# Use CLI from npx so Postgres 17 + storage schema order matches migrations (global `supabase` <2.80 often fails on storage.buckets).
"$ROOT/scripts/run-with-ui-dev-env.sh" npx --yes supabase@latest start

# Remove the stale edge runtime container if it exists.
# The Supabase CLI auto-reload creates a conflict when the old container isn't removed first,
# causing functions to lose their env vars. Removing it here ensures a clean start every time.
docker rm -f supabase_edge_runtime_guest-form-management 2>/dev/null || true

# Start edge functions with secrets from supabase/.env.local.
# --env-file is required; without it Deno env vars like ADMIN_ALLOWED_EMAILS are not injected.
echo "Starting Supabase Edge Functions (with supabase/.env.local secrets)..."
npx --yes supabase@latest functions serve --env-file "$ROOT/supabase/.env.local" &
FUNCTIONS_PID=$!

# Ensure the functions server is stopped when this script exits.
trap "kill $FUNCTIONS_PID 2>/dev/null" EXIT

# Start the UI
echo "Starting UI development server..."
cd "$ROOT/ui" && npm run dev
