#!/bin/bash
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Docker Desktop must be running before Supabase can start containers.
if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running."
  if [[ "$(uname -s)" == "Darwin" ]] && [[ -d /Applications/Docker.app ]]; then
    echo "Starting Docker Desktop…"
    open -a Docker
    for _ in $(seq 1 60); do
      if docker info >/dev/null 2>&1; then
        echo "Docker is ready."
        break
      fi
      sleep 2
    done
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Cannot connect to Docker. Start Docker Desktop, wait until it is running, then re-run ./dev.sh"
    exit 1
  fi
fi

# Invalid tag after `supabase link` breaks storage-api pull (see docs/MIGRATION_RUNBOOK.md §3.5.5).
STORAGE_VER_FILE="$ROOT/supabase/.temp/storage-version"
if [[ -f "$STORAGE_VER_FILE" ]]; then
  ver="$(tr -d '[:space:]' <"$STORAGE_VER_FILE")"
  if [[ ! "$ver" =~ ^v[0-9]+\.[0-9]+ ]]; then
    echo "Removing invalid supabase/.temp/storage-version ($ver); CLI will use a valid image on start."
    rm -f "$STORAGE_VER_FILE"
  fi
fi

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
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY cannot go in --env-file (CLI skips SUPABASE_* names).
echo "Starting Supabase Edge Functions (with supabase/.env.local secrets)..."
# shellcheck source=/dev/null
source "$ROOT/scripts/export-local-supabase-runtime-env.sh"
npx --yes supabase@latest functions serve --env-file "$ROOT/supabase/.env.local" &
FUNCTIONS_PID=$!

# Kong caches edge-runtime DNS; removing/recreating the container above leaves 503
# ("name resolution failed") until Kong reloads.
KONG_CONTAINER="supabase_kong_guest-form-management"
for _ in $(seq 1 45); do
  if docker ps --format '{{.Names}}' | grep -q "^supabase_edge_runtime_guest-form-management$"; then
    sleep 2
    if docker ps --format '{{.Names}}' | grep -q "^${KONG_CONTAINER}$"; then
      docker restart "$KONG_CONTAINER" >/dev/null
      echo "Reloaded Kong so /functions/v1 routes reach edge runtime."
    fi
    break
  fi
  sleep 1
done

# Ensure the functions server is stopped when this script exits.
trap "kill $FUNCTIONS_PID 2>/dev/null" EXIT

# Start the UI
echo "Starting UI development server..."
cd "$ROOT/ui" && npm run dev
