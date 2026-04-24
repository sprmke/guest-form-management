#!/bin/bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Load ui/.env.development so GOOGLE_CLIENT_* are set for supabase/config.toml env().
# Edge functions are served by the stack started here — do not also run
# `supabase functions serve` in parallel (second edge runtime → Docker name conflict).
echo "Starting Supabase (DB, Auth, Storage, Edge Functions)..."
# Use CLI from npx so Postgres 17 + storage schema order matches migrations (global `supabase` <2.80 often fails on storage.buckets).
"$ROOT/scripts/run-with-ui-dev-env.sh" npx --yes supabase@latest start

# Start the UI
echo "Starting UI development server..."
cd "$ROOT/ui" && npm run dev
