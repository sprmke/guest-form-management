# Docs cleanup, Obsidian optimization, and Cursor/Claude tooling sync

## Goal

Reorganize `docs/` into a clear tiered vault, optimize it for Obsidian and low-token AI reads, and make `.cursor/` / `.claude/` skills a single symlink-backed source of truth under `.agent/skills/`.

## Scope

- Mechanical docs moves and archives (`TODOS.md`, `docs/temp/`, completed Superpowers plans, naming-audit reference)
- Split `docs/PROJECT.md` into `docs/architecture/*` with a thin index
- One-shot Obsidian frontmatter and wikilink conversion; Bases dashboards
- Migrate shared skills to `.agent/skills/` with relative symlinks; drift-prevention sync script and hooks
- Close Cursor/Claude hook and command parity gaps

## Approach

Execute in dependency order: persist this plan index and normalize planned-module naming first; archive stale docs; tier Superpowers by status; split architecture docs and retarget links; run Obsidian conversion; centralize skills; add sync checks to pre-commit and session start; final grep verification.

**Full plan:** [`docs/superpowers/plans/2026-08-02-docs-obsidian-tooling-sync.md`](../../superpowers/plans/2026-08-02-docs-obsidian-tooling-sync.md)
