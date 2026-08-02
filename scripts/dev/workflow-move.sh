#!/usr/bin/env bash
# Move workflow docs between lifecycle stages.
# Usage:
#   workflow-move.sh start <slug-or-path>   # planned -> in-progress
#   workflow-move.sh done <slug-or-path>    # in-progress -> done
#
# Accepts slug (mobile-native-redesign.md) or path under docs/workflow/.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DOCS="$ROOT/docs/workflow"

cmd="${1:-}"
slug="${2:-}"

usage() {
  echo "Usage: workflow-move.sh start|done <slug-or-path>" >&2
  exit 1
}

[[ -n "$cmd" && -n "$slug" ]] || usage

resolve_source() {
  local s="$1"
  if [[ -f "$s" ]]; then
    echo "$s"
    return
  fi
  if [[ -f "$DOCS/planned/$s" ]]; then
    echo "$DOCS/planned/$s"
    return
  fi
  if [[ -f "$DOCS/in-progress/$s" ]]; then
    echo "$DOCS/in-progress/$s"
    return
  fi
  if [[ "$s" != *.md ]]; then
    resolve_source "${s}.md"
    return
  fi
  echo ""
}

patch_stage() {
  local file="$1"
  local stage="$2"
  local today
  today="$(date +%Y-%m-%d)"
  if grep -q '^stage:' "$file"; then
    perl -pi -e "s/^stage: .*/stage: ${stage}/" "$file"
  else
    perl -pi -e "s/^(status: .*)/\$1\nstage: ${stage}/" "$file"
  fi
  if grep -q '^updated:' "$file"; then
    perl -pi -e "s/^updated: .*/updated: ${today}/" "$file"
  fi
}

case "$cmd" in
  start)
    src="$(resolve_source "$slug")"
    [[ -n "$src" ]] || { echo "Not found: $slug" >&2; exit 1; }
    base="$(basename "$src")"
    dest="$DOCS/in-progress/$base"
    if [[ "$src" == "$dest" ]]; then
      echo "Already in progress: $base"
      exit 0
    fi
    git mv "$src" "$dest" 2>/dev/null || mv "$src" "$dest"
    patch_stage "$dest" "in-progress"
    echo "Started: docs/workflow/in-progress/$base"
    ;;
  done)
    src="$(resolve_source "$slug")"
    [[ -n "$src" ]] || { echo "Not found: $slug" >&2; exit 1; }
    base="$(basename "$src")"
    dest="$DOCS/done/$base"
    git mv "$src" "$dest" 2>/dev/null || mv "$src" "$dest"
    patch_stage "$dest" "done"
    echo "Done: docs/workflow/done/$base"
    ;;
  *)
    usage
    ;;
esac
