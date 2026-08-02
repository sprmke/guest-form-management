# Claude Code skills

**Canonical source:** `.agent/skills/<name>/SKILL.md`. `.cursor/skills/<name>` and `.claude/skills/<name>` are **relative symlinks** into `.agent/skills/<name>` (e.g. `.claude/skills/forms -> ../../.agent/skills/forms`) — edit only under `.agent/skills/`; both tool-side paths update automatically.

One exception: **`verify/`** in this folder is a real directory, Claude Code–only (no Cursor equivalent, no `.agent/skills` counterpart — it's the recorded recipe for Claude Code's bundled `/verify` skill). Don't turn it into a symlink.

## Keeping commands/agents/hooks in sync

Skills sync for free via the shared symlink target. **Commands, agents, and hooks do not** — each side has its own real files with side-specific frontmatter/shape:

1. Edit the Cursor-side file (`.cursor/commands/*.md`, `.cursor/agents/*.md`, `.cursor/hooks/*.sh` + `.cursor/hooks.json`).
2. Apply the equivalent conceptual change to the Claude-side file (`.claude/commands/*.md`, `.claude/agents/*.md`, `.claude/hooks/*.sh` + `.claude/settings.json`), translating frontmatter/shape as needed:
   - Agents: `readonly: true` → drop `Write`/`Edit`/`NotebookEdit` from `tools`; `model: fast` → `model: haiku`.
   - Commands: content is portable as-is; add a one-line `description` frontmatter if missing.
   - Hooks: **not** a straight copy — Claude Code hooks read `tool_input.file_path` / `tool_input.command` from stdin and return `hookSpecificOutput.permissionDecision`, not Cursor's `file_path`/`command` + `{permission, user_message, agent_message}` shape; also update the registration in `.claude/settings.json`, not `hooks.json`.
3. Run `bun run check:ai-tooling-sync` (also runs in pre-commit) to catch drift — symlink parity, command/agent existence parity, hook-name parity, `.cursor/mcp.json` symlink validity. Known, intentional gaps are allow-listed in `scripts/dev/ai-tooling-sync-exceptions.txt`.
4. Commit both sides together in the same change.

## MCP servers

**Global** MCP config is intentionally asymmetric: Cursor reads `~/.cursor/mcp.json` (user-level), Claude Code uses its own plugin/marketplace mechanism — there's no shared global file and none is needed. **Per-repo** parity comes from this project's `.mcp.json` (`.cursor/mcp.json` is a symlink to it), which both tools load identically.

Index: **`.cursor/rules/README.md`** (Cursor) · **`.claude/README.md`** (Claude Code)
