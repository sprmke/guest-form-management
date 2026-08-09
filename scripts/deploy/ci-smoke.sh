#!/usr/bin/env bash
# Post-deploy smoke for hosted Supabase (read-only).
# Usage: ./scripts/deploy/ci-smoke.sh dev
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=scripts/deploy/ci-deploy-lib.sh
source "$ROOT/scripts/deploy/ci-deploy-lib.sh"

SUPABASE=("$ROOT/scripts/dev/bunx" --bun supabase@latest)

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy/ci-smoke.sh dev

Environment:
  SUPABASE_ACCESS_TOKEN   Required
  SUPABASE_PROJECT_REF    Required (must not equal LEGACY_PROD_PROJECT_REF if set)

Checks:
  1. supabase functions list includes submit-form
  2. Edge gateway responds (HTTP not 000/502)
EOF
}

TARGET="${1:-}"
if [[ "$TARGET" != "dev" || "${2:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  [[ "$TARGET" == "dev" ]] || exit 1
  exit 0
fi

ci_deploy_require_env SUPABASE_ACCESS_TOKEN
ci_deploy_require_env SUPABASE_PROJECT_REF

if [[ -n "${LEGACY_PROD_PROJECT_REF:-}" ]]; then
  ci_deploy_assert_not_legacy_ref "$SUPABASE_PROJECT_REF" "$LEGACY_PROD_PROJECT_REF"
fi

REF="$SUPABASE_PROJECT_REF"
BASE="https://${REF}.supabase.co/functions/v1"

echo "Smoke: project $(ci_deploy_mask_ref "$REF")"

echo "→ supabase link --project-ref $REF"
export SUPABASE_ACCESS_TOKEN
"${SUPABASE[@]}" link --project-ref "$REF" >/dev/null

echo "→ supabase functions list"
FUNCS="$("${SUPABASE[@]}" functions list 2>/dev/null || true)"
if ! grep -q "submit-form" <<<"$FUNCS"; then
  echo "ERROR: submit-form not found in functions list." >&2
  echo "$FUNCS" >&2
  exit 1
fi
echo "  submit-form present"

# OPTIONS often returns 200/204 when edge runtime is up (no auth required).
HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "${BASE}/submit-form" || echo "000")"
echo "→ curl -X OPTIONS ${BASE}/submit-form → HTTP $HTTP_CODE"
case "$HTTP_CODE" in
  000 | 502 | 503)
    echo "ERROR: edge gateway unhealthy (HTTP $HTTP_CODE)." >&2
    exit 1
    ;;
  *)
    echo "  edge gateway reachable"
    ;;
esac

echo "Smoke OK."
