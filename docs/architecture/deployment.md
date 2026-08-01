# Deployment

Part of the [`docs/PROJECT.md`](../PROJECT.md) architecture split. See also [`docs/operations/production-deployment.md`](../operations/production-deployment.md) and [`docs/operations/migration-runbook.md`](../operations/migration-runbook.md).

---

## 12. Deployment

- **Production checklist (backups, `supabase db push`, `supabase functions deploy`, Dashboard secrets, Google OAuth clients + service account, Vercel `VITE_*`, `pg_cron`):** **`docs/operations/production-deployment.md`**.
- `ui/vercel.json`: SPA rewrites to `index.html`, Vite build output `dist`.
- Supabase: deploy functions + run migrations; configure secrets in dashboard (details in **`docs/operations/migration-runbook.md` §11**).
