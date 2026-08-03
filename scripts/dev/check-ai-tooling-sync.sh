#!/usr/bin/env bash
# Drift prevention: Cursor and Claude Code AI tooling must stay in sync.
# See .agent/skills/ (shared source), .cursor/{skills,commands,agents,hooks.json,mcp.json},
# .claude/{skills,commands,agents,settings.json}, and .mcp.json.
#
# Exit 1 on any violation. Intentional asymmetries are documented in
# scripts/dev/ai-tooling-sync-exceptions.txt and skipped here.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

EXCEPTIONS_FILE="scripts/dev/ai-tooling-sync-exceptions.txt"
VIOLATIONS=0

fail() {
  echo "VIOLATION: $1"
  VIOLATIONS=$((VIOLATIONS + 1))
}

is_exception() {
  # $1: "<kind>:<name>" e.g. "hook:guard-shipped-migrations"
  [[ -f "$EXCEPTIONS_FILE" ]] || return 1
  grep -qE "^${1}([[:space:]]|\$)" "$EXCEPTIONS_FILE"
}

# --- 1. .agent/skills/<name> must have valid symlinks on both sides ---------

if [[ -d .agent/skills ]]; then
  for skill_dir in .agent/skills/*/; do
    name="$(basename "$skill_dir")"
    target_real="$(cd "$skill_dir" && pwd -P)"

    for side in cursor claude; do
      link=".${side}/skills/${name}"
      if [[ ! -L "$link" ]]; then
        fail "$link is missing or not a symlink (expected -> ../../.agent/skills/${name})"
        continue
      fi
      if [[ ! -d "$link" ]]; then
        fail "$link is a dangling symlink"
        continue
      fi
      link_real="$(cd "$link" && pwd -P)"
      if [[ "$link_real" != "$target_real" ]]; then
        fail "$link resolves to $link_real, expected $target_real"
      fi
    done
  done
fi

# Flag orphaned skill entries: real dirs/symlinks on either side with no
# .agent/skills counterpart, other than the allow-listed exceptions.
for side in cursor claude; do
  skills_dir=".${side}/skills"
  [[ -d "$skills_dir" ]] || continue
  for entry in "$skills_dir"/*; do
    [[ -e "$entry" ]] || continue
    name="$(basename "$entry")"

    # Allow-listed: .claude/skills/README.md is a real file, not a skill.
    if [[ "$side" == "claude" && "$name" == "README.md" ]]; then
      continue
    fi
    # Allow-listed: .claude/skills/verify/ is a real dir with no
    # .agent/skills counterpart and no .cursor/skills mirror.
    if [[ "$side" == "claude" && "$name" == "verify" ]]; then
      [[ -d "$entry" && ! -L "$entry" ]] || fail "$entry expected to be a real directory (allow-listed exception)"
      continue
    fi

    # skills.sh CLI installs live under .agents/skills/ (plural), not .agent/skills/.
    if [[ -L "$entry" ]]; then
      link_real="$(cd "$entry" && pwd -P)"
      agents_target="$(cd ".agents/skills/${name}" 2>/dev/null && pwd -P || true)"
      if [[ -n "$agents_target" && "$link_real" == "$agents_target" ]]; then
        continue
      fi
    fi

    if [[ ! -e ".agent/skills/${name}" ]]; then
      fail "$entry has no .agent/skills/${name} counterpart"
    fi
  done
done

# --- 2. commands/ and agents/ — existence parity (not content) -------------

for kind in commands agents; do
  cursor_dir=".cursor/${kind}"
  claude_dir=".claude/${kind}"

  if [[ -d "$cursor_dir" ]]; then
    for f in "$cursor_dir"/*.md; do
      [[ -e "$f" ]] || continue
      name="$(basename "$f")"
      [[ -f "${claude_dir}/${name}" ]] || fail "${cursor_dir}/${name} has no ${claude_dir}/${name} counterpart"
    done
  fi

  if [[ -d "$claude_dir" ]]; then
    for f in "$claude_dir"/*.md; do
      [[ -e "$f" ]] || continue
      name="$(basename "$f")"
      [[ -f "${cursor_dir}/${name}" ]] || fail "${claude_dir}/${name} has no ${cursor_dir}/${name} counterpart"
    done
  fi
done

# --- 3. hook script parity between .cursor/hooks.json and .claude/settings.json

cursor_hooks=""
if [[ -f .cursor/hooks.json ]]; then
  cursor_hooks="$(jq -r '.. | .command? // empty' .cursor/hooks.json 2>/dev/null \
    | grep -oE '\.cursor/hooks/[A-Za-z0-9_-]+\.sh' \
    | xargs -n1 basename \
    | sed 's/\.sh$//' \
    | sort -u)"
fi

claude_hooks=""
if [[ -f .claude/settings.json ]]; then
  claude_hooks="$(jq -r '.. | .command? // empty' .claude/settings.json 2>/dev/null \
    | grep -oE '\.claude/hooks/[A-Za-z0-9_-]+\.sh' \
    | xargs -n1 basename \
    | sed 's/\.sh$//' \
    | sort -u)"
fi

while IFS= read -r name; do
  [[ -n "$name" ]] || continue
  if is_exception "hook:${name}"; then
    continue
  fi
  if ! grep -qx "$name" <<<"$claude_hooks"; then
    fail "hook '${name}' wired in .cursor/hooks.json has no counterpart in .claude/settings.json"
  fi
done <<<"$cursor_hooks"

while IFS= read -r name; do
  [[ -n "$name" ]] || continue
  if is_exception "hook:${name}"; then
    continue
  fi
  if ! grep -qx "$name" <<<"$cursor_hooks"; then
    fail "hook '${name}' wired in .claude/settings.json has no counterpart in .cursor/hooks.json"
  fi
done <<<"$claude_hooks"

# --- 4. .cursor/mcp.json must be a valid symlink to ../.mcp.json -----------

if [[ ! -L .cursor/mcp.json ]]; then
  fail ".cursor/mcp.json is not a symlink (expected -> ../.mcp.json)"
else
  link_target="$(readlink .cursor/mcp.json)"
  resolved_real="$(cd .cursor && cd "$(dirname "$link_target")" 2>/dev/null && pwd -P)/$(basename "$link_target")"
  if [[ ! -f "$resolved_real" ]]; then
    fail ".cursor/mcp.json is a dangling symlink"
  elif [[ "$resolved_real" != "$ROOT/.mcp.json" ]]; then
    fail ".cursor/mcp.json symlink resolves to '${resolved_real}', expected '${ROOT}/.mcp.json'"
  fi
fi

# --- 5. Impeccable (skills.sh) — when present, symlinks + hook scripts ------

if [[ -d .agents/skills/impeccable ]]; then
  for script in scripts/hook.mjs scripts/hook-before-edit.mjs; do
    [[ -f ".agents/skills/impeccable/${script}" ]] \
      || fail ".agents/skills/impeccable/${script} missing"
  done
  for side in cursor claude; do
    link=".${side}/skills/impeccable"
    if [[ ! -L "$link" ]]; then
      fail "$link missing — run 'bun run setup:impeccable'"
    fi
    link_real="$(cd "$link" && pwd -P)"
    target_real="$(cd .agents/skills/impeccable && pwd -P)"
    if [[ "$link_real" != "$target_real" ]]; then
      fail "$link resolves to $link_real, expected $target_real"
    fi
  done
fi

# --- Result ------------------------------------------------------------------

if [[ "$VIOLATIONS" -gt 0 ]]; then
  echo ""
  echo "$VIOLATIONS AI tooling sync violation(s). See scripts/dev/ai-tooling-sync-exceptions.txt to document intentional gaps."
  exit 1
fi

echo "OK — Cursor and Claude AI tooling are in sync."
