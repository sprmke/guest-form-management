#!/usr/bin/env bash
# Deploy migrations and Edge Functions to the linked Supabase project.
# Prerequisites: supabase login, supabase link --project-ref <prod-ref>
# See docs/production-deployment.md for the full cutover checklist (backups, secrets, UI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SUPABASE=(npx --yes supabase@latest)
PROJECT_REF_FILE="$ROOT/supabase/.temp/project-ref"

DB_ONLY=false
FUNCTIONS_ONLY=false
INCLUDE_ALL=false

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-supabase.sh [options]

Deploy to the linked Supabase project (supabase link --project-ref <ref>).

Options:
  --db-only          Run supabase db push only
  --functions-only   Run supabase functions deploy only
  --include-all      Pass --include-all to db push (migration history repair)
  -h, --help         Show this help

Examples:
  npm run deploy:supabase
  npm run deploy:supabase -- --include-all
  npm run deploy:supabase:db
  npm run deploy:supabase:functions
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-only)
      DB_ONLY=true
      shift
      ;;
    --functions-only)
      FUNCTIONS_ONLY=true
      shift
      ;;
    --include-all)
      INCLUDE_ALL=true
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

if [[ "$DB_ONLY" == true && "$FUNCTIONS_ONLY" == true ]]; then
  echo "Cannot use --db-only and --functions-only together." >&2
  exit 1
fi

if [[ ! -f "$PROJECT_REF_FILE" ]]; then
  echo "No linked Supabase project found (missing supabase/.temp/project-ref)." >&2
  echo "Run: npx supabase@latest login && npx supabase@latest link --project-ref <prod-ref>" >&2
  exit 1
fi

PROJECT_REF="$(tr -d '[:space:]' <"$PROJECT_REF_FILE")"
echo "Linked project: $PROJECT_REF"
echo "See docs/production-deployment.md for backups and post-deploy steps."
echo

run_db_push() {
  local -a push_args=(db push)
  if [[ "$INCLUDE_ALL" == true ]]; then
    push_args+=(--include-all)
  fi
  echo "→ supabase ${push_args[*]}"
  "${SUPABASE[@]}" "${push_args[@]}"
}

run_functions_deploy() {
  echo "→ supabase functions deploy"
  "${SUPABASE[@]}" functions deploy
}

if [[ "$DB_ONLY" == true ]]; then
  run_db_push
elif [[ "$FUNCTIONS_ONLY" == true ]]; then
  run_functions_deploy
else
  run_db_push
  echo
  run_functions_deploy
fi

echo
echo "Deploy complete."
