---
title: 'Deployment'
status: active
tags: [architecture, deployment]
updated: 2026-08-02
---

# Deployment

Part of the [`docs/PROJECT.md`](../PROJECT.md) architecture split. See also [`docs/operations/production-deployment.md`](../operations/production-deployment.md) and [`docs/operations/migration-runbook.md`](../operations/migration-runbook.md).

---

## 12. Deployment

- **Production checklist (backups, `supabase db push`, `supabase functions deploy`, Dashboard secrets, Google OAuth clients + service account, Vercel `VITE_*`, `pg_cron`):** **[[production-deployment|Production deployment — checkout checklist]]**.
- `ui/vercel.json`: SPA rewrites to `index.html`, Vite build output `dist`.
- Supabase: deploy functions + run migrations; configure secrets in dashboard (details in **[[migration-runbook|Migration Runbook — New Booking Flow]] §11**).
