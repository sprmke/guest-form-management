#!/usr/bin/env bash
# CI parity — same checks as .github/workflows/ci.yml and cd-dev.yml quality job.
# Run before batch-commit sessions and before pushing to develop/main.
#
# Usage:
#   bun run ci:quality
#   ./scripts/dev/ci-quality-gate.sh
#   ./scripts/dev/ci-quality-gate.sh --skip-install   # when deps already installed

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SKIP_INSTALL=0
if [[ "${1:-}" == "--skip-install" ]]; then
  SKIP_INSTALL=1
fi

echo "=== CI quality gate (matches GitHub Actions ci.yml + cd-dev quality) ==="

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "→ bun install --frozen-lockfile"
  bun install --frozen-lockfile
fi

run_step() {
  local label="$1"
  shift
  echo ""
  echo "→ $label"
  "$@"
}

run_step "type-check" bun run type-check
run_step "lint (ESLint errors block CD — warnings OK)" bun run lint
run_step "check:filenames" bun run check:filenames
run_step "build UI" bun run build

echo ""
echo "OK — quality gate passed (safe to push for CI/CD quality job)."
