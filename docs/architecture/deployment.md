---
title: 'Deployment'
status: active
tags: [architecture, deployment]
updated: 2026-08-04
---

# Deployment

Part of the [`docs/PROJECT.md`](../PROJECT.md) architecture split.

---

## 12. Deployment

| Environment       | Checklist / runbook                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Production**    | [`production-deployment.md`](../archive/operations/production-deployment.md) — backups, `db push`, secrets, Vercel Production (`kamewave` unlock for agents) |
| **Dev / Preview** | [`dev-staging-environment.md`](../archive/operations/dev-staging-environment.md) — separate Supabase account, Vercel Preview env, local mode picker          |
| **Migrations**    | [`migration-runbook.md`](../archive/operations/migration-runbook.md)                                                                                         |

- `ui/vercel.json`: SPA rewrites to `index.html`, Vite build output `dist`.
- **Dev deploy:** `bun run deploy:supabase:dev` (reads `supabase/.env.dev.local`).
- **Local modes:** `./dev.sh` (full Docker), `./dev.sh --ui-only --env dev` (hosted dev), `bun run dev:remote-api` (hybrid edge functions).
