#!/usr/bin/env bash
# Restore a backup (from ./scripts/deploy/backup-supabase.sh) into the LINKED
# <dev|prod> Supabase project via psql. Requires a Postgres connection string
# — PROD_DB_URL for prod (same convention as scripts/data/sync-prod-public-data-to-local.sh,
# read from supabase/.env.local), DEV_DB_URL for dev (same convention, read
# from supabase/.env.dev.local). See docs/archive/operations/production-deployment.md
# §12 and docs/archive/operations/migration-runbook.md §6 before restoring.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/dev/check-linked-project.sh
source "$ROOT/scripts/dev/check-linked-project.sh"

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy/rollback-supabase.sh <dev|prod> [options]

Restores a backup produced by ./scripts/deploy/backup-supabase.sh into the
CURRENTLY LINKED <dev|prod> Supabase project via psql.

Requires a Postgres connection string:
  prod: PROD_DB_URL env var, or a PROD_DB_URL= line in supabase/.env.local
  dev:  DEV_DB_URL env var, or a DEV_DB_URL= line in supabase/.env.dev.local
Get the URI from Dashboard → Project Settings → Database → Connect → Session pooler.

Options:
  --file <path>   Restore this specific *_data.sql (or *_schema.sql) file
                   instead of the most recent backups/<env>/*_data.sql
  --schema        Also restore the matching *_schema.sql file FIRST
                   (structural rollback — read migration-runbook.md §6 first)
  --dry-run       Print the psql command(s) that would run; do not execute
  -h, --help      Show this help

Examples:
  DEV_DB_URL='postgresql://...' bun run rollback:supabase:dev
  bun run rollback:supabase:dev -- --dry-run
  PROD_DB_URL='postgresql://...' bun run rollback:supabase:prod   # requires kamewave
  ./scripts/deploy/rollback-supabase.sh prod --file backups/prod/20260806T120000Z_data.sql
EOF
}

ENV_ARG=""
BACKUP_FILE=""
RESTORE_SCHEMA=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    dev | prod)
      if [[ -n "$ENV_ARG" ]]; then
        echo "Unexpected extra positional argument: $1" >&2
        usage >&2
        exit 1
      fi
      ENV_ARG="$1"
      shift
      ;;
    --file)
      BACKUP_FILE="${2:-}"
      if [[ -z "$BACKUP_FILE" ]]; then
        echo "--file requires a path" >&2
        exit 1
      fi
      shift 2
      ;;
    --schema)
      RESTORE_SCHEMA=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ENV_ARG" ]]; then
  echo "Missing required argument: dev or prod" >&2
  usage >&2
  exit 1
fi

DB_URL=""
if [[ "$ENV_ARG" == "prod" ]]; then
  DB_URL="${PROD_DB_URL:-}"
  [[ -z "$DB_URL" ]] && DB_URL="$(read_env_file_var "$ROOT/supabase/.env.local" "PROD_DB_URL")"
else
  DB_URL="${DEV_DB_URL:-}"
  [[ -z "$DB_URL" ]] && DB_URL="$(read_env_file_var "$ROOT/supabase/.env.dev.local" "DEV_DB_URL")"
fi

if [[ -z "$DB_URL" ]]; then
  UPPER_ENV="$(printf '%s' "$ENV_ARG" | tr '[:lower:]' '[:upper:]')"
  echo "ERROR: Set ${UPPER_ENV}_DB_URL (Dashboard → Connect → Session pooler URI)." >&2
  exit 1
fi

print_linked_project
if [[ -z "$LINKED_PROJECT_REF" ]]; then
  echo "" >&2
  echo "ERROR: No linked Supabase project (missing supabase/.temp/project-ref)." >&2
  echo "Link first: bunx supabase@latest link --project-ref <${ENV_ARG}-ref>" >&2
  exit 1
fi
if [[ "$LINKED_PROJECT_KIND" != "$ENV_ARG" ]]; then
  echo "" >&2
  echo "ERROR: You asked to roll back '$ENV_ARG' but the linked project looks like '$LINKED_PROJECT_KIND' ($LINKED_PROJECT_REF)." >&2
  echo "Re-link to $ENV_ARG first, then re-run." >&2
  exit 1
fi

BACKUP_DIR="$ROOT/backups/$ENV_ARG"
DATA_FILE=""
SCHEMA_FILE=""

if [[ -n "$BACKUP_FILE" ]]; then
  DATA_FILE="$BACKUP_FILE"
  SCHEMA_FILE="${BACKUP_FILE/_data.sql/_schema.sql}"
else
  DATA_FILE="$(ls -1t "$BACKUP_DIR"/*_data.sql 2>/dev/null | head -1 || true)"
  if [[ -z "$DATA_FILE" ]]; then
    echo "ERROR: No backups found in $BACKUP_DIR." >&2
    echo "Run: bun run backup:supabase:$ENV_ARG" >&2
    exit 1
  fi
  SCHEMA_FILE="${DATA_FILE/_data.sql/_schema.sql}"
fi

if [[ ! -f "$DATA_FILE" ]]; then
  echo "ERROR: Data backup file not found: $DATA_FILE" >&2
  exit 1
fi

if [[ "$RESTORE_SCHEMA" == true && ! -f "$SCHEMA_FILE" ]]; then
  echo "ERROR: --schema was set but matching schema file not found: $SCHEMA_FILE" >&2
  exit 1
fi

echo "════════════════════════════════════════════════════════════"
echo "  ROLLBACK — $ENV_ARG"
echo "  Linked project: $LINKED_PROJECT_REF"
if [[ "$RESTORE_SCHEMA" == true ]]; then
  echo "  Schema file: $SCHEMA_FILE"
fi
echo "  Data file:   $DATA_FILE"
echo "  See docs/archive/operations/migration-runbook.md §6 (restore caveats)"
echo "════════════════════════════════════════════════════════════"

if [[ "$DRY_RUN" == true ]]; then
  if [[ "$RESTORE_SCHEMA" == true ]]; then
    echo "[dry-run] psql \"\$DB_URL\" -v ON_ERROR_STOP=1 -f $SCHEMA_FILE"
  fi
  echo "[dry-run] psql \"\$DB_URL\" -v ON_ERROR_STOP=1 -f $DATA_FILE"
  exit 0
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found." >&2
  echo "macOS: brew install libpq, then add libpq's bin/ to PATH (see scripts/data/sync-prod-public-data-to-local.sh header)." >&2
  exit 1
fi

echo ""
echo "Type $ENV_ARG to confirm restoring into this project (existing rows may be overwritten/duplicated — see caveats above):"
read -r confirm
if [[ "$confirm" != "$ENV_ARG" ]]; then
  echo "Aborted (expected: $ENV_ARG)."
  exit 1
fi

if [[ "$RESTORE_SCHEMA" == true ]]; then
  echo "→ Restoring schema from $SCHEMA_FILE"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"
fi

echo "→ Restoring data from $DATA_FILE"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$DATA_FILE"

log_deploy "$ENV_ARG" "rollback"

echo ""
echo "Rollback complete ($ENV_ARG)."
