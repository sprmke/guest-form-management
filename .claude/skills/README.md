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

Index: **`.cursor/rules/README.md`**
