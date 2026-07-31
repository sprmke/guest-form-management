# Cursor rules & skills — Guest Form Management

Agent context for **Vite + React + Supabase Edge Functions**. Adapted from [property-management-app](https://github.com/...) (PMA); Next.js / tRPC / Drizzle rules are **not** used here.

## Always-on rules (core — loaded every session)

| File                            | Purpose                                               |
| ------------------------------- | ----------------------------------------------------- |
| `project-context.mdc`           | Stack, doc index, where to edit                       |
| `documentation-maintenance.mdc` | Sync docs with code                                   |
| `booking-workflow.mdc`          | Status machine, transitions, emails, calendar         |
| `admin-auth.mdc`                | Allow list, JWT, route guards, dev controls           |
| `mobile-responsive.mdc`         | Breakpoints, touch targets, admin shell               |
| `ui-minimal-copy.mdc`           | No extra UI prose                                     |
| `competitive-ux-research.mdc`   | Airbnb + PMS UX research before features              |
| `superpowers-opt-in.mdc`        | Superpowers opt-in only (see `/superpowers-*`)        |
| `git-commits.mdc`               | No Cursor author/co-author in commits                 |
| `no-prod-deploy.mdc`            | Block prod Supabase/DB deploys (unlock: **kamewave**) |

## Conditional rules (by file glob — loaded when relevant)

| File                          | Globs / topic                                                       |
| ----------------------------- | ------------------------------------------------------------------- |
| `tech-stack.mdc`              | `ui/**`, Vite, Bun, React Router                                    |
| `architecture.mdc`            | Feature folders, imports, tooling                                   |
| `naming-conventions.mdc`      | File naming                                                         |
| `components.mdc`              | `*.tsx` — shadcn, theme, structure                                  |
| `state-management.mdc`        | `hooks/`, TanStack Query v5                                         |
| `forms.mdc`                   | `*Form*`, `schemas/` — RHF + Zod                                    |
| `security.mdc`                | Edge auth, org/property RBAC                                        |
| `public-ui.mdc`               | Guest form, calendar, sd-form                                       |
| `supabase-platform.mdc`       | Migrations, env, Storage                                            |
| `supabase-edge-functions.mdc` | `supabase/functions/**`                                             |
| `accessibility.mdc`           | WCAG for UI                                                         |
| `route-guides.mdc`            | Page behavior docs                                                  |
| `plan-mode.mdc`               | Plan mode — save finished plans to `docs/planning/planned_modules/` |
| `github-issues.mdc`           | GitHub Issues backlog + shipped archive                             |
| `social-inbox.mdc`            | Meta inbox                                                          |

## Skills (`.cursor/skills/` — invoke `/name` or agent decides)

### Platform & data

| Skill            | Use for                          |
| ---------------- | -------------------------------- |
| `docs-first`     | Read docs before implementing    |
| `supabase-stack` | Postgres, Storage, edge platform |
| `supabase-auth`  | OAuth, JWT, RBAC                 |
| `tanstack-query` | Admin hooks, cache, mutations    |
| `multi-tenancy`  | Org/property scoping             |

### Product domains

| Skill                             | Use for                          |
| --------------------------------- | -------------------------------- |
| `booking-workflow`                | Status transitions, orchestrator |
| `admin-dashboard`                 | Bookings list / detail           |
| `bookings-table`                  | Bookings table UI                |
| `gmail-listener`                  | Gmail approvals                  |
| `social-inbox` / `meta-messaging` | Guest Inbox                      |
| `integrations`                    | Google, Telegram, Meta, Resend   |
| `emails`                          | HTML templates + Resend          |
| `forms`                           | Guest + admin forms              |

### UI & quality

| Skill                     | Use for                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `competitive-ux-research` | Airbnb + PMS flow research before UI/features                                                                     |
| `frontend-design`         | Layout, visual patterns                                                                                           |
| `component-generator`     | New components                                                                                                    |
| `tanstack-table`          | Admin list tables                                                                                                 |
| `accessibility`           | WCAG deep patterns                                                                                                |
| `minimal-ui-copy`         | Sparse copy                                                                                                       |
| `route-guides`            | `docs/guides/routes/*`                                                                                            |
| `performance`             | Vite bundle, query tuning                                                                                         |
| `batch-commit`            | Daily N commits × 5–10 files (not whole tree)                                                                     |
| `github-issues`           | GitHub Issues — view, create, ship                                                                                |
| `mobile-responsive`       | Breakpoints, touch targets, admin shell — same content as the always-on `.mdc`, invocable on the Claude Code side |

**No dedicated skill yet** (fall back to `docs-first` + `docs/PROJECT.md` directly): Finance module, Maintenance module, Marketing Studio (AI captions/video/Meta publish), Guest Inbox AI suggestions, guest portal (authenticated guest profile/trips), pricing calendars, super-admin platform ops (`/admin/*`, developments, hosts), org verification (base/enhanced tiers). These are real, shipped parts of the app — don't assume they don't exist just because there's no skill card for them yet.

## Subagents (`.cursor/agents/`)

| Agent              | Use for                       |
| ------------------ | ----------------------------- |
| `verifier`         | Confirm work complete         |
| `debugger`         | Failures, errors              |
| `security-auditor` | Auth, secrets, guest PII      |
| `test-runner`      | `type-check`, `lint`, `build` |

## Hooks (`.cursor/hooks.json`)

| Hook                   | Script                                                                          |
| ---------------------- | ------------------------------------------------------------------------------- |
| `afterFileEdit`        | `format-edited-file.sh`, `check-stack-terminology.sh`                           |
| `beforeShellExecution` | `guard-shell.sh` (denies prod Supabase deploy unless **`kamewave`** in command) |

## Token budget

- **Always-on** = 9 rules (booking + auth + competitive UX + superpowers opt-in + prod-deploy guard are domain-critical).
- **Everything else** = globs or skills on demand.
- Per-route detail → `docs/guides/routes/`, not rules.
- **Skipped from PMA:** `thinking-framework` (too heavy), Drizzle, tRPC, Next.js, React Email monorepo, AWS S3, Zustand.

## PMA parity map

| PMA                        | GFM equivalent                                         |
| -------------------------- | ------------------------------------------------------ |
| `01-tech-stack`            | `tech-stack.mdc`                                       |
| `02-architecture`          | `architecture.mdc`                                     |
| `03-database`              | `supabase-platform.mdc` + `supabase-stack` skill       |
| `04-api`                   | `supabase-edge-functions.mdc` + `tanstack-query` skill |
| `05-components`            | `components.mdc`                                       |
| `06-state-management`      | `state-management.mdc`                                 |
| `07-forms`                 | `forms.mdc` + `forms` skill                            |
| `08-security`              | `security.mdc` + `supabase-auth` skill                 |
| `14-public-ui`             | `public-ui.mdc`                                        |
| `15-accessibility`         | `accessibility.mdc` + skill                            |
| `16-docs-sync`             | `documentation-maintenance.mdc`                        |
| `17-supabase-platform`     | `supabase-platform.mdc`                                |
| `property-management`      | `booking-workflow` + `multi-tenancy`                   |
| `drizzle-orm` / `trpc-api` | **N/A**                                                |

## Updating

Add rules with `globs` + update this README. Claude Code has its own equivalent tooling under `.claude/` (index: **`.claude/README.md`**) — when you add or change something here, mirror it there in the same change:

| Cursor                                      | Claude Code                                                | Notes                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/skills/*`                          | `.claude/skills/*`                                         | Straight copy — see `.claude/skills/README.md` for the sync command                                                       |
| `.cursor/agents/*.md`                       | `.claude/agents/*.md`                                      | Translate frontmatter: `readonly: true` → drop `Write`/`Edit`/`NotebookEdit` from `tools`; `model: fast` → `model: haiku` |
| `.cursor/commands/*.md`                     | `.claude/commands/*.md`                                    | Content is portable as-is                                                                                                 |
| `.cursor/hooks.json` + `.cursor/hooks/*.sh` | `.claude/settings.json` (`"hooks"`) + `.claude/hooks/*.sh` | **Not** a straight copy — different stdin JSON shape and output contract, see `.claude/skills/README.md`                  |
| —                                           | `.mcp.json` (symlinked from `.cursor/mcp.json`)            | Shared MCP config, no mirroring needed — one file, one symlink                                                            |

Not everything here has a Claude Code equivalent (glob-scoped `alwaysApply: false` rules like `security.mdc`, `state-management.mdc`, `tech-stack.mdc` don't auto-load in Claude Code the way they do in Cursor) — `CLAUDE.md` tells Claude to read `.cursor/rules/*.mdc` directly when relevant instead of duplicating them.
