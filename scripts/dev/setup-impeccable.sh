#!/usr/bin/env bash
# Install Impeccable (skills.sh) and wire Cursor/Claude symlinks.
# Canonical path: .agents/skills/impeccable (plural — Impeccable hard-codes this).
# Hooks in .cursor/hooks.json and .claude/settings.json activate once scripts exist.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SKILL_DIR=".agents/skills/impeccable"
LOCK="skills-lock.json"

link_skill() {
  local side="$1"
  local link=".${side}/skills/impeccable"
  local target="../../.agents/skills/impeccable"

  mkdir -p ".${side}/skills"
  if [[ -L "$link" ]]; then
    current="$(readlink "$link")"
    if [[ "$current" == "$target" ]]; then
      return 0
    fi
    rm "$link"
  elif [[ -e "$link" ]]; then
    echo "ERROR: $link exists and is not a symlink — remove manually"
    exit 1
  fi
  ln -s "$target" "$link"
  echo "Linked $link -> $target"
}

if [[ ! -f "$SKILL_DIR/scripts/hook.mjs" ]]; then
  if [[ -f "$LOCK" ]]; then
    echo "Restoring Impeccable from $LOCK ..."
    npx skills experimental_install -y
  else
    echo "Installing Impeccable (pbakaus/impeccable@impeccable) ..."
    npx skills add pbakaus/impeccable@impeccable -p -y --agent claude-code cursor
  fi
fi

if [[ ! -f "$SKILL_DIR/scripts/hook.mjs" ]]; then
  echo "ERROR: $SKILL_DIR/scripts/hook.mjs missing after install"
  exit 1
fi

link_skill cursor
link_skill claude

node --check "$SKILL_DIR/scripts/hook.mjs"
node --check "$SKILL_DIR/scripts/hook-before-edit.mjs"

echo "OK — Impeccable at $SKILL_DIR; hooks live in Cursor + Claude Code."
