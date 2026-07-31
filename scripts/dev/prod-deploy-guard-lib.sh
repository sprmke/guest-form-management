#!/usr/bin/env bash
# Shared prod-deploy guard for Cursor + Claude Code shell hooks.
# Source this file; do not execute directly.

PROD_DEPLOY_UNLOCK_WORD="kamewave"

# Returns 0 when the command string contains the unlock word (case-insensitive).
prod_deploy_is_unlocked() {
  local cmd="$1"
  local lower_cmd
  lower_cmd=$(printf '%s' "$cmd" | tr '[:upper:]' '[:lower:]')
  [[ "$lower_cmd" == *"${PROD_DEPLOY_UNLOCK_WORD}"* ]]
}

# Returns 0 when the command should be blocked as a production Supabase/DB mutation.
# Read-only linked inspection (db diff/dump --linked, status) is NOT blocked here.
prod_deploy_is_blocked() {
  local cmd="$1"

  if prod_deploy_is_unlocked "$cmd"; then
    return 1
  fi

  case "$cmd" in
    *deploy:supabase*|*deploy-supabase.sh*)
      return 0
      ;;
    *"functions deploy"*)
      return 0
      ;;
    *"db push"*)
      return 0
      ;;
    *"migration repair"*)
      return 0
      ;;
    *"migration up"*)
      # Local-only apply is safe; remote / unspecified targets are not.
      [[ "$cmd" == *"--local"* ]] && return 1
      return 0
      ;;
    *"db reset"*"--linked"*)
      return 0
      ;;
    *"--db-url"*)
      # Remote connection string — treat as prod-adjacent unless clearly local.
      [[ "$cmd" == *"127.0.0.1"* || "$cmd" == *"localhost"* || "$cmd" == *":54322"* ]] && return 1
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

prod_deploy_block_reason() {
  cat <<EOF
Blocked: this command can change the linked Supabase production project or remote database.

We develop on git branches with live production — do not deploy DB migrations, push schema, or deploy Edge Functions to prod until the team explicitly approves.

To authorize for this shell command only, the user must say the unlock word "${PROD_DEPLOY_UNLOCK_WORD}" in chat, then rerun with that word present in the command (e.g. KAMEWAVE=${PROD_DEPLOY_UNLOCK_WORD} bun run deploy:supabase).

Safe without unlock: local supabase (start/stop/db:reset/db:migrate), functions serve, read-only linked checks (db diff --linked, db dump --linked).
EOF
}
