#!/usr/bin/env bash
# Reinforce Superpowers opt-in policy after the plugin's session-start bootstrap.
# See .cursor/rules/superpowers-opt-in.mdc

set -euo pipefail

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

context=$'SUPERPOWERS OPT-IN (this repo)\n\nSuperpowers plugin is installed but auto-workflows are OFF unless the user runs /superpowers-* or explicitly asks for Superpowers.\n\nDo NOT auto-invoke superpowers:brainstorming, writing-plans, executing-plans, subagent-driven-development, or systematic-debugging.\n\nUse normal repo rules/skills and implement directly. See .cursor/rules/superpowers-opt-in.mdc.'

escaped=$(escape_for_json "$context")

printf '{\n  "additional_context": "%s"\n}\n' "$escaped"
