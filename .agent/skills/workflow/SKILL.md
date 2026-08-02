---
name: workflow
description: >-
  Manage docs/workflow lifecycle — intake, planned, in-progress, done.
  Filenames are kebab-slug only (no date prefix).
---

# Workflow docs

| Stage       | Path                         |
| ----------- | ---------------------------- |
| Intake      | `docs/workflow/intake/`      |
| Planned     | `docs/workflow/planned/`     |
| In progress | `docs/workflow/in-progress/` |
| Done        | `docs/workflow/done/`        |

## Naming

**`<kebab-case-slug>.md`** — no `YYYY-MM-DD-` prefix. Use frontmatter `updated:` for dates.

Intake design specs: `<slug>-design.md`

## Commands

- `/workflow-start <slug>` — move planned → in-progress
- `/workflow-done <slug>` — move in-progress → done

```bash
bash scripts/dev/workflow-move.sh start <slug>
bash scripts/dev/workflow-move.sh done <slug>
```

## Rules

- Do **not** silently move files — use commands/script only.
- Do **not** add date prefixes to new workflow docs.
- Legacy material: `docs/archive/` (not workflow).

## Related

- [`.cursor/rules/workflow-docs.mdc`](../../.cursor/rules/workflow-docs.mdc)
- [`.cursor/rules/plan-mode.mdc`](../../.cursor/rules/plan-mode.mdc)
