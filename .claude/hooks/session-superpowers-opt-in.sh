#!/usr/bin/env bash
# Reinforce Superpowers opt-in policy after the plugin's session-start bootstrap.
# See .cursor/rules/superpowers-opt-in.mdc
# Ported from .cursor/hooks/session-superpowers-opt-in.sh (Cursor sessionStart hook).

set -euo pipefail

context=$'SUPERPOWERS OPT-IN (this repo)\n\nSuperpowers plugin is installed but auto-workflows are OFF unless the user runs /superpowers-* or explicitly asks for Superpowers.\n\nDo NOT auto-invoke superpowers:brainstorming, writing-plans, executing-plans, subagent-driven-development, or systematic-debugging.\n\nUse normal repo rules/skills and implement directly. See .cursor/rules/superpowers-opt-in.mdc.'

if command -v jq >/dev/null 2>&1; then
  jq -n --arg msg "$context" \
    '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $msg}}'
else
  escaped="${context//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  escaped="${escaped//$'\n'/\\n}"
  printf '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "%s"}}\n' "$escaped"
fi
