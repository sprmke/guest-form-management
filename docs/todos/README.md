# Product backlog

**Source of truth:** [GitHub Issues](https://github.com/sprmke/kame-homes/issues) on `sprmke/kame-homes`  
**Project board:** @sprmke's Kame Homes  
**Shipped archive:** [`shipped/`](./shipped/)

Do not mirror open backlog items as markdown in this repo — that causes drift. Use GitHub for pending work; use `shipped/` only after an issue is done.

## Epics (GitHub parent issues)

| §   | Epic                                | GitHub                                                  |
| --- | ----------------------------------- | ------------------------------------------------------- |
| 1   | Guest form & public booking flow    | [#101](https://github.com/sprmke/kame-homes/issues/101) |
| 2   | Bookings & workflow (admin)         | [#102](https://github.com/sprmke/kame-homes/issues/102) |
| 3   | Parking                             | [#103](https://github.com/sprmke/kame-homes/issues/103) |
| 4   | Emails & property templates         | [#104](https://github.com/sprmke/kame-homes/issues/104) |
| 5   | AI & document validation            | [#105](https://github.com/sprmke/kame-homes/issues/105) |
| 6   | Storage, media & performance        | [#106](https://github.com/sprmke/kame-homes/issues/106) |
| 7   | Notifications & Telegram            | [#107](https://github.com/sprmke/kame-homes/issues/107) |
| 8   | Guest Inbox (org)                   | [#108](https://github.com/sprmke/kame-homes/issues/108) |
| 9   | Marketing Content Studio            | [#109](https://github.com/sprmke/kame-homes/issues/109) |
| 10  | Guest ↔ host chat (web)             | [#110](https://github.com/sprmke/kame-homes/issues/110) |
| 11  | Platform, reviews & super admin     | [#111](https://github.com/sprmke/kame-homes/issues/111) |
| 12  | Org & property settings             | [#112](https://github.com/sprmke/kame-homes/issues/112) |
| 13  | Public marketing site               | [#113](https://github.com/sprmke/kame-homes/issues/113) |
| 14  | Multi-tenancy & security hardening  | [#114](https://github.com/sprmke/kame-homes/issues/114) |
| 15  | Help, support & observability       | [#115](https://github.com/sprmke/kame-homes/issues/115) |
| 16  | Codebase & architecture (DX)        | [#116](https://github.com/sprmke/kame-homes/issues/116) |
| 17  | UI consistency & polish             | [#117](https://github.com/sprmke/kame-homes/issues/117) |
| 18  | Content & configuration refinements | [#118](https://github.com/sprmke/kame-homes/issues/118) |
| 19  | Strategic epics (planning)          | [#119](https://github.com/sprmke/kame-homes/issues/119) |

## Agent workflow

1. **Pick up work:** `bun scripts/dev/gh-issue.mjs view --github N` or `/github-issue` in Cursor.
2. **Implement** — update route guides / `PROJECT.md` when behavior changes.
3. **Ship:** `bun scripts/dev/gh-issue.mjs ship --github N --notes "…"` (closes issue + writes `shipped/{N}-{slug}.md`).

## CLI

```bash
# View issue (JSON)
bun scripts/dev/gh-issue.mjs view --github 32

# Create (auto [4.N] prefix when --section 4)
bun scripts/dev/gh-issue.mjs create --section 4 --title "Add check-in block" --body "Acceptance: …" --parent 104

# Update body on GitHub
bun scripts/dev/gh-issue.mjs update --github 32 --body "Updated acceptance criteria"

# Ship: archive + close
bun scripts/dev/gh-issue.mjs ship --github 32 --notes "PR #…; ready-for-check-in email updated"
```

Requires [GitHub CLI](https://cli.github.com/) (`gh auth login`). Default repo: `-R sprmke/kame-homes`.

Epic grouping uses **GitHub parent issues** (`--parent` on create), not body footers.

See **`.cursor/skills/github-issues/SKILL.md`** and **`/github-issue`** command.
