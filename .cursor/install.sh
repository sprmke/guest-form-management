#!/usr/bin/env bash
# Cloud Agent install phase: install system + node dependencies, configure Docker
# for nested-container use, warm the Supabase Docker images, and validate that all
# database migrations apply to a fresh database. Idempotent.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==== [install] system packages (docker, fuse-overlayfs) ===="
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
# fuse3 ships an interactive conffile prompt; force-keep the existing file so the
# install stays non-interactive.
sudo apt-get install -y -qq \
  -o Dpkg::Options::=--force-confdef \
  -o Dpkg::Options::=--force-confold \
  docker.io fuse-overlayfs uidmap

echo "==== [install] docker daemon config (nested-container storage driver) ===="
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'JSON'
{
  "storage-driver": "fuse-overlayfs",
  "features": { "containerd-snapshotter": false }
}
JSON

echo "==== [install] node dependencies ===="
npm install
( cd ui && npm install )

echo "==== [install] local dev env files ===="
"$ROOT/.cursor/write-env-files.sh"

echo "==== [install] start docker + warm images + validate migrations ===="
"$ROOT/.cursor/docker-up.sh"
# Bring the full stack up once so the Supabase images are cached into the snapshot
# and every migration is proven to apply to a fresh database.
./scripts/run-with-ui-dev-env.sh npx --yes supabase@latest start
# Leave data intact but stop containers for a clean snapshot; images stay cached.
./scripts/run-with-ui-dev-env.sh npx --yes supabase@latest stop || true

echo "==== [install] done ===="
