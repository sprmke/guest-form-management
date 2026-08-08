---
title: 'Deployment'
status: active
tags: [architecture, deployment]
updated: 2026-08-07
---

# Deployment

Part of the [`docs/PROJECT.md`](../PROJECT.md) architecture split.

---

## 12. Deployment

### Dual-track (multi-tenant WIP) — agents read this first

Until multi-tenant cutover is complete, **two parallel stacks** (same git repo, **separate** Vercel + Supabase projects):

| Track                | Git branch (today)                                                                     | Vercel project                                                                                          | Supabase ref                                |
| -------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Live users**       | **`main`** (hotfixes only)                                                             | **LEGACY** [`guest-form-management-app`](https://vercel.com/sprmkes-projects/guest-form-management-app) | **LEGACY_PROD** `zfttdwtceyqszyeyhilc`      |
| **Multi-tenant WIP** | **`feature/support-multi-users-and-properties`** (→ **`develop`** when branch renamed) | **NEW** [`kame-homes`](https://vercel.com/kame-works/kame-homes)                                        | **MULTI_TENANT_DEV** `fworvijbrwpyngycotbz` |

### Vercel project inventory (canonical)

Each project’s **Production** environment (not Preview) is the deploy surface for that track.

| Logical name            | Vercel project              | Team               | Production branch (configured)                                                        | Production env → Supabase |
| ----------------------- | --------------------------- | ------------------ | ------------------------------------------------------------------------------------- | ------------------------- |
| **LEGACY_VERCEL**       | `guest-form-management-app` | `sprmkes-projects` | **`main`**                                                                            | LEGACY `zftt…`            |
| **MULTI_TENANT_VERCEL** | `kame-homes`                | `kame-works`       | **`feature/support-multi-users-and-properties`** (switch to **`develop`** when ready) | MULTI_TENANT_DEV `fwor…`  |

Same monorepo is connected to **both** Vercel projects. Pushing to `main` deploys only the legacy project; pushing to the multi-tenant branch deploys only `kame-homes`.

### Supabase project inventory (canonical)

Project **refs** are public in API URLs; **keys** stay in gitignored env only.

| Logical name         | Env var(s)                                     | Project ref            | Host                               | Used for                                                        |
| -------------------- | ---------------------------------------------- | ---------------------- | ---------------------------------- | --------------------------------------------------------------- |
| **LEGACY_PROD**      | `PROD_PROJECT_REF` (guard in `.env.dev.local`) | `zfttdwtceyqszyeyhilc` | `zfttdwtceyqszyeyhilc.supabase.co` | **`guest-form-management-app`** Production (`main`), live users |
| **MULTI_TENANT_DEV** | `DEV_PROJECT_REF` in `supabase/.env.dev.local` | `fworvijbrwpyngycotbz` | `fworvijbrwpyngycotbz.supabase.co` | **`kame-homes`** Production (mt branch), `deploy:supabase:dev`  |

Aliases: informal **NEW_PROD** = **MULTI_TENANT_DEV** until cutover — do **not** treat `fwor…` as production Supabase for deploy guards or Vercel Production env.

Future (not created yet): **MULTI_TENANT_PREPROD**, **MULTI_TENANT_PROD** at cutover.

**Do not:**

- Deploy multi-tenant migrations or Edge Functions to the **legacy production** Supabase until a planned cutover.
- Point **`guest-form-management-app`** Production env at multi-tenant Supabase, or **`kame-homes`** at LEGACY Supabase.
- Merge multi-tenant-only work into **`main`** until cutover readiness.

**Do:**

- Multi-tenant UI: push to the branch wired on **`kame-homes`**; set that project’s **Production** env vars to `fwor…`.
- Legacy UI: push hotfixes to **`main`** → **`guest-form-management-app`** only.
- Use `bun run deploy:supabase:dev` / future CD against **`fwor…`** only.
- Prefer long-term git line **`develop`** (already aligned to feature tip); switch **`kame-homes`** Production Branch from `feature/…` → `develop` when the feature branch is retired.

| Artifact             | Doc                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Design               | [`docs/workflow/intake/ci-cd-dev-prod-design.md`](../workflow/intake/ci-cd-dev-prod-design.md) |
| Implementation plan  | [`docs/workflow/in-progress/ci-cd-dev-prod.md`](../workflow/in-progress/ci-cd-dev-prod.md)     |
| Dev/staging runbook  | [`dev-staging-environment.md`](../archive/operations/dev-staging-environment.md)               |
| Production / cutover | [`production-deployment.md`](../archive/operations/production-deployment.md)                   |

### Checklists

| Environment       | Checklist / runbook                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Production**    | [`production-deployment.md`](../archive/operations/production-deployment.md) — backups, `db push`, secrets, Vercel Production (`kamewave` unlock for agents) |
| **Dev / Preview** | [`dev-staging-environment.md`](../archive/operations/dev-staging-environment.md) — **`kame-homes`** + hosted dev Supabase, local mode picker                 |
| **Migrations**    | [`migration-runbook.md`](../archive/operations/migration-runbook.md)                                                                                         |

- `ui/vercel.json`: SPA rewrites to `index.html`, Vite build output `dist`.
- **Dev deploy:** `bun run deploy:supabase:dev` (reads `supabase/.env.dev.local`) — multi-tenant **dev** project, never assume it is Vercel Production.
- **Backups & rollback:** `bun run backup:supabase:<dev|prod>`, `rollback:supabase:<dev|prod>`, `rollback:functions:<dev|prod>` — see `production-deployment.md` §1/§12.
- **Env / migration status:** `bun run env:status`, `migrations:status:dev`, `migrations:status:prod` (read-only).
- **Local modes:** `./dev.sh` (full Docker), `./dev.sh --ui-only --env dev` (hosted dev), `bun run dev:remote-api` (hybrid edge functions).
