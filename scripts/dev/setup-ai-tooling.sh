#!/usr/bin/env bash
# One-shot team dev setup: Cursor + Claude Code rules/skills/hooks/MCP parity.
# Idempotent — safe to re-run after clone or when symlinks break.
#
# Usage: bun run setup:ai-tooling [--skip-impeccable] [--skip-local-settings]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SKIP_IMPECCABLE=0
SKIP_LOCAL_SETTINGS=0

for arg in "$@"; do
  case "$arg" in
    --skip-impeccable) SKIP_IMPECCABLE=1 ;;
    --skip-local-settings) SKIP_LOCAL_SETTINGS=1 ;;
    -h | --help)
      cat <<'EOF'
Usage: bun run setup:ai-tooling [options]

Project-scoped AI tooling for Cursor and Claude Code:
  - .cursor/mcp.json symlink
  - .agent/skills → .cursor/skills + .claude/skills symlinks
  - Impeccable (.agents/skills/impeccable) + hook symlinks
  - .claude/settings.local.json from example (optional)
  - check-ai-tooling-sync verification

Options:
  --skip-impeccable       Skip Impeccable install/symlinks
  --skip-local-settings   Do not copy .claude/settings.local.json.example

Manual (once per machine, not scripted):
  - Export SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF (Supabase MCP)
  - uv tool install markitdown-mcp  (or ensure markitdown-mcp on PATH)
  - Claude Code: /plugin marketplace add DietrichGebert/ponytail
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)"
      exit 1
      ;;
  esac
done

info() { printf '→ %s\n' "$*"; }
ok() { printf '✓ %s\n' "$*"; }
warn() { printf '⚠ %s\n' "$*" >&2; }

link_relative() {
  # $1: link path  $2: relative target (as passed to ln -s)
  local link="$1" target="$2"
  local dir
  dir="$(dirname "$link")"
  mkdir -p "$dir"

  if [[ -L "$link" ]]; then
    if [[ "$(readlink "$link")" == "$target" ]]; then
      return 0
    fi
    rm "$link"
  elif [[ -e "$link" ]]; then
    echo "ERROR: $link exists and is not a symlink — remove manually"
    exit 1
  fi
  ln -s "$target" "$link"
  ok "Linked $link -> $target"
}

# --- 1. MCP symlink ---------------------------------------------------------

info "MCP config"
if [[ ! -f .mcp.json ]]; then
  echo "ERROR: .mcp.json missing at repo root"
  exit 1
fi
link_relative ".cursor/mcp.json" "../.mcp.json"

# --- 2. GFM skills (.agent/skills → both tool folders) ----------------------

info "Team skills (.agent/skills symlinks)"
if [[ ! -d .agent/skills ]]; then
  echo "ERROR: .agent/skills missing — incomplete checkout?"
  exit 1
fi

for skill_dir in .agent/skills/*/; do
  [[ -d "$skill_dir" ]] || continue
  name="$(basename "$skill_dir")"
  for side in cursor claude; do
    link=".${side}/skills/${name}"
    if [[ ! -L "$link" ]] || [[ ! -d "$link" ]]; then
      link_relative "$link" "../../.agent/skills/${name}"
    fi
  done
done
ok "Team skill symlinks verified"

# --- 3. Impeccable (skills.sh / .agents/skills) -----------------------------

if [[ "$SKIP_IMPECCABLE" -eq 0 ]]; then
  info "Impeccable (optional UI design hooks)"
  bash "$ROOT/scripts/dev/setup-impeccable.sh"
else
  warn "Skipped Impeccable (--skip-impeccable)"
fi

# --- 4. Claude Code personal settings template ------------------------------

if [[ "$SKIP_LOCAL_SETTINGS" -eq 0 ]]; then
  info "Claude Code local settings"
  if [[ ! -f .claude/settings.local.json ]]; then
    if [[ -f .claude/settings.local.json.example ]]; then
      cp .claude/settings.local.json.example .claude/settings.local.json
      ok "Created .claude/settings.local.json from example (gitignored — customize locally)"
    else
      warn ".claude/settings.local.json.example missing — skip local settings copy"
    fi
  else
    ok ".claude/settings.local.json already exists"
  fi
else
  warn "Skipped local settings copy (--skip-local-settings)"
fi

# --- 5. Optional external tools (warn only) ---------------------------------

info "Optional external tools"
if command -v markitdown-mcp >/dev/null 2>&1; then
  ok "markitdown-mcp on PATH ($(command -v markitdown-mcp))"
else
  warn "markitdown-mcp not on PATH — install: uv tool install markitdown-mcp"
fi

missing_env=0
for var in SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF; do
  if [[ -z "${!var:-}" ]]; then
    warn "$var not set — Supabase MCP will not connect (export in shell profile)"
    missing_env=1
  fi
done
if [[ "$missing_env" -eq 0 ]]; then
  ok "Supabase MCP env vars set"
fi

# --- 6. Verify parity -------------------------------------------------------

info "Running check-ai-tooling-sync"
bash "$ROOT/scripts/dev/check-ai-tooling-sync.sh"

cat <<'EOF'

AI tooling setup complete.

Committed in repo (no copy from ~/.cursor or ~/.claude needed):
  • Rules:     .cursor/rules/*.mdc + CLAUDE.md
  • Skills:    .agent/skills/ (+ .agents/skills/impeccable when installed)
  • Commands:  .cursor/commands/ ↔ .claude/commands/
  • Agents:    .cursor/agents/ ↔ .claude/agents/
  • Hooks:     .cursor/hooks.json + .claude/settings.json
  • MCP:       .mcp.json (via .cursor/mcp.json symlink)

Once per machine (manual):
  • Claude Code ponytail plugin: /plugin marketplace add DietrichGebert/ponytail
  • Personal UI/model prefs:     ~/.claude/settings.json (not in repo)

Re-run anytime: bun run setup:ai-tooling
Drift check:      bun run check:ai-tooling-sync (also pre-commit)
EOF
