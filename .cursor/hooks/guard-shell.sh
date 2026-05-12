#!/usr/bin/env bash
# beforeShellExecution hook: allow/deny/ask for shell commands.
# Reads JSON with "command", "cwd" from stdin; outputs JSON with "permission", optional "user_message", "agent_message".

set -e
input=$(cat)
if command -v jq >/dev/null 2>&1; then
  command_str=$(echo "$input" | jq -r '.command // empty')
else
  command_str=$(echo "$input" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"$//' | sed 's/\\"/"/g')
fi

permission="allow"
user_message=""
agent_message=""

# Block obviously dangerous patterns
case "$command_str" in
  *"rm -rf /"*|*"rm -rf /*"*|*"rm -rf ~"*)
    permission="deny"
    user_message="Blocked: recursive delete of root or home is not allowed."
    agent_message="The command was blocked because it would delete system or home directory. Use a specific path instead."
    ;;
  *"drop table"*|*"DROP TABLE"*)
    permission="ask"
    user_message="This command may drop database tables. Confirm before running."
    agent_message="The command contains DROP TABLE. The user must confirm before running."
    ;;
  *"db:push"*)
    # Allow but could add DATABASE_URL check for prod; for now just allow
    ;;
  *)
    ;;
esac

echo "{\"permission\": \"$permission\", \"user_message\": \"$user_message\", \"agent_message\": \"$agent_message\"}"
