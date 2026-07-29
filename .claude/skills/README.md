# Claude Code skills (mirror)

**Canonical source:** `.cursor/skills/` — Cursor agents use that path.

This folder is synced from `.cursor/skills/*/SKILL.md` for Claude Code sessions. After adding or editing a skill in `.cursor/skills/`, copy it here:

```bash
for skill in .cursor/skills/*/; do
  name=$(basename "$skill")
  mkdir -p ".claude/skills/$name"
  cp "$skill/SKILL.md" ".claude/skills/$name/SKILL.md"
done
```

One exception: **`verify/`** in this folder is Claude Code–only (no Cursor equivalent — it's the recorded recipe for Claude Code's bundled `/verify` skill). Don't delete it when re-running the sync above.

**Also keep in sync when you touch the Cursor side** (see `.claude/README.md` for the full picture, not just skills):

- `.cursor/agents/*.md` → `.claude/agents/*.md` (translate frontmatter: `readonly: true` → drop `Write`/`Edit`/`NotebookEdit` from `tools`; `model: fast` → `model: haiku`)
- `.cursor/commands/*.md` → `.claude/commands/*.md` (content is portable as-is; add a one-line `description` frontmatter if missing)
- `.cursor/hooks/*.sh` → `.claude/hooks/*.sh` (**not** a straight copy — Claude Code hooks read `tool_input.file_path` / `tool_input.command` from stdin and return `hookSpecificOutput.permissionDecision`, not Cursor's `file_path`/`command` + `{permission, user_message, agent_message}` shape; also update the registration in `.claude/settings.json`, not `hooks.json`)

Index: **`.cursor/rules/README.md`** (Cursor) · **`.claude/README.md`** (Claude Code)
