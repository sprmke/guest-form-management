#!/usr/bin/env bash
# Shared helpers for CI and local deploy scripts (source only).
set -euo pipefail

ci_deploy_is_ci() {
  [[ "${CI:-}" == "1" || "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ]]
}

ci_deploy_reject_skip_backup_in_ci() {
  local skip_backup="${1:-false}"
  if ci_deploy_is_ci && [[ "$skip_backup" == "true" ]]; then
    echo "ERROR: --skip-backup is not allowed in CI (CI=1 / GitHub Actions)." >&2
    exit 1
  fi
}

ci_deploy_confirm() {
  local expected="$1"
  if ci_deploy_is_ci; then
    if [[ "${DEPLOY_CONFIRM:-}" != "$expected" ]]; then
      echo "ERROR: CI deploy requires DEPLOY_CONFIRM=$expected (got '${DEPLOY_CONFIRM:-}')." >&2
      exit 1
    fi
    echo "CI confirm: DEPLOY_CONFIRM=$expected"
    return 0
  fi

  echo "Type $expected to confirm deploy to this project:"
  read -r confirm
  if [[ "$confirm" != "$expected" ]]; then
    echo "Aborted (expected: $expected)." >&2
    exit 1
  fi
}

ci_deploy_assert_target_ref() {
  local expected="$1"
  local linked="$2"
  if [[ -z "$expected" ]]; then
    echo "ERROR: expected project ref is empty." >&2
    exit 1
  fi
  if [[ "$linked" != "$expected" ]]; then
    echo "ERROR: linked ref '$linked' does not match expected '$expected'." >&2
    exit 1
  fi
  echo "Ref check OK: $(ci_deploy_mask_ref "$linked")"
}

ci_deploy_assert_not_legacy_ref() {
  local target="$1"
  local legacy_ref="${2:-}"
  if [[ -z "$legacy_ref" ]]; then
    echo "WARNING: LEGACY_PROD_PROJECT_REF unset — legacy deny-list skipped." >&2
    return 0
  fi
  if [[ "$target" == "$legacy_ref" ]]; then
    echo "ERROR: refusing deploy — target ref matches LEGACY_PROD ($legacy_ref)." >&2
    exit 1
  fi
}

ci_deploy_mask_ref() {
  local ref="$1"
  local len="${#ref}"
  if [[ "$len" -le 4 ]]; then
    printf 'ref(len %s)' "$len"
    return 0
  fi
  printf '...%s (len %s)' "${ref: -4}" "$len"
}

ci_deploy_require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: required env var $name is not set." >&2
    exit 1
  fi
}
