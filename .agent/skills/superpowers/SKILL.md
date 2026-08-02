---
name: superpowers
description: >-
  Superpowers opt-in workflow with repo doc paths — plans go to
  docs/workflow/planned/, brainstorm specs to docs/workflow/intake/.
  Never write docs/superpowers/. No date prefixes in filenames.
---

# Superpowers (repo paths)

When active, **override the plugin's default save locations** and naming.

## Token hygiene (mandatory)

- Opt-in only — never auto-start from a normal coding task.
- Prefer **one** brainstorming/planning pass. Do **not** fan out Explore / general-purpose subagents unless the user asks.
- After the plan lands in `docs/workflow/planned/`, stop the Superpowers chain; use `/workflow-start` + a normal implementation session.

## Doc paths (mandatory)

| Artifact                 | Save to                      | Filename                   |
| ------------------------ | ---------------------------- | -------------------------- |
| Implementation plan      | `docs/workflow/planned/`     | `<kebab-slug>.md`          |
| Brainstorm / design spec | `docs/workflow/intake/`      | `<kebab-slug>-design.md`   |
| Active execution         | `docs/workflow/in-progress/` | move via `/workflow-start` |

**Never** use `YYYY-MM-DD-` prefixes in workflow filenames.  
**Never** create `docs/superpowers/**`.

## After writing a plan

1. Set frontmatter `updated: YYYY-MM-DD`.
2. Add a row to `docs/workflow/planned/README.md`.

## Plugin overrides

| Plugin default            | Use instead                             |
| ------------------------- | --------------------------------------- |
| `docs/superpowers/plans/` | `docs/workflow/planned/<slug>.md`       |
| `docs/superpowers/specs/` | `docs/workflow/intake/<slug>-design.md` |
| `YYYY-MM-DD-<slug>.md`    | `<slug>.md`                             |
