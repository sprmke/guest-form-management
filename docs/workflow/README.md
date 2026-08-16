---
title: 'Workflow docs'
status: active
tags: [workflow, docs]
updated: 2026-08-06
kind: reference
---

# Workflow docs

| Stage       | Folder                           | Naming                           | When to use                                                                                                                            |
| ----------- | -------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Intake      | [`intake/`](./intake/)           | `<slug>-design.md` + scratchpads | **Active** design specs only. Scratchpads **`_to-prompt.md`**, **`_to-plan.md`** stay here — sync emojis when workflow status changes. |
| Planned     | [`planned/`](./planned/)         | `<slug>.md`                      | Approved plan — **not started**                                                                                                        |
| In progress | [`in-progress/`](./in-progress/) | plan + `-design.md` spec         | **Work started** — plan not fully complete (partial phases / v1 slices stay here until plan closed)                                    |
| Done        | [`done/`](./done/)               | plan + `-design.md` spec         | Plan **fully complete** — `/workflow-done`                                                                                             |
| Won't do    | [`wont-do/`](./wont-do/)         | plan + `-design.md` spec         | Cancelled / rejected — move via `/workflow-wont-do`                                                                                    |

**Scratchpad emojis:** ✅ done · 🚧 in progress · 📋 planned · 🔵 open · ❌ cancelled — [`.agent/skills/workflow-intake-scratchpads/SKILL.md`](../../.agent/skills/workflow-intake-scratchpads/SKILL.md). Validated by `scripts/dev/check-workflow-scratchpads.sh` on commit when scratchpads are staged.

**Folder = stage.** Partial phases or v1 slices in `done/` do **not** close the parent plan — keep the parent in `in-progress/` until remaining scope is finished. Do not leave `stage: done` files in `intake/`. Update frontmatter **and** move the file when status changes.

**No `YYYY-MM-DD-` filename prefixes** — use frontmatter `updated:` instead.

**Commands:** `/workflow-start`, `/workflow-done`, `/workflow-wont-do`, `/workflow-sync-scratchpads`, `/superpowers-plan`, `/superpowers-brainstorm`

Back to [docs index](../README.md).
