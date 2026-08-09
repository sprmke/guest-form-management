---
title: 'Legacy → multi-tenant prod migration (data + storage)'
status: active
tags: [operations, deployment, migration, supabase, storage]
updated: 2026-08-09
---

# Legacy → multi-tenant prod migration

**When:** Phase B prod release — **after** **MULTI_TENANT_PROD** Supabase exists and **before** pointing **`app.kamehomes.space`** at prod.

**Source:** **LEGACY** `zfttdwtceyqszyeyhilc` (live bookings, Auth users, Storage)  
**Target:** **MULTI_TENANT_PROD** _(project ref TBD at create time)_

**Plan context:** [`multi-tenant-dev-prod-environments.md`](../../workflow/in-progress/ci-cd-environments/multi-tenant-dev-prod-environments.md) Phase B.

> **Not the same as schema migrations.** Repo SQL under `supabase/migrations/` creates empty mt schema. This runbook covers **copying/transforming legacy production data** into the new project.

---

## Scope (to implement)

| Area             | Legacy (`zftt…`)                                          | Target (mt-prod)                                       | Notes                                                      |
| ---------------- | --------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| **Postgres**     | Bookings, properties (legacy shape), files metadata, etc. | Multi-tenant schema (`organizations`, `properties`, …) | Transform pipeline — map legacy rows → org/property model  |
| **Storage**      | Guest uploads, templates, PDFs                            | Same bucket names/policies on mt-prod                  | Object copy + path mapping                                 |
| **Auth**         | Supabase Auth users (legacy)                              | mt-prod Auth                                           | Choose: export/import, or re-invite; document PII handling |
| **Edge secrets** | Prod integrations                                         | mt-prod secrets                                        | Manual — not part of data script                           |

**Out of scope for v1 script:** Gmail history, external Google Calendar event IDs (re-link per property).

---

## Pending implementation tasks

- [ ] **Inventory** — table list + row counts on LEGACY vs mt schema ([`docs/PROJECT.md`](../../PROJECT.md) data model)
- [ ] **Script location** — `scripts/migrate/legacy-to-mt-prod/` (not created yet)
- [ ] **Dry-run mode** — read LEGACY, write to mt-prod staging or fwor rehearsal DB
- [ ] **Storage sync** — `supabase storage` CLI or API copy bucket-by-bucket
- [ ] **Idempotency** — safe re-run with checkpoint keys
- [ ] **Validation** — post-migrate counts, sample booking workflow smoke
- [ ] **Rollback** — mt-prod restore from pre-migrate backup
- [ ] **Runbook entry** in [`migration-runbook.md`](./migration-runbook.md) when script lands

---

## Recommended order (release day)

1. **Backup** LEGACY (`bun run backup:supabase:prod` with **`kamewave`**) and **mt-prod** (empty project backup after schema deploy).
2. **Apply schema** to mt-prod (`db push` / CD prod).
3. **Run migration script** LEGACY → mt-prod (Postgres then Storage).
4. **Verify** counts + spot-check bookings + file URLs.
5. **Deploy functions** + secrets to mt-prod.
6. **Flip** Vercel Production `VITE_*` + **`app.kamehomes.space`**.
7. **Merge `develop` → `main`**; **`kame-homes`** Production branch = **`main`**.

---

## Auth migration options (decide before scripting)

| Strategy                                 | Pros                   | Cons                                                     |
| ---------------------------------------- | ---------------------- | -------------------------------------------------------- |
| **Export/import users** (Supabase tools) | Same emails can log in | Must handle password hashes / OAuth identities carefully |
| **Re-invite hosts**                      | Cleaner                | Users re-onboard                                         |
| **Dual-run period**                      | Low risk               | Two systems temporarily                                  |

Document chosen strategy in this file when decided.

---

## Storage buckets (verify in Dashboard before script)

Inventory LEGACY Storage buckets used by guest form workflow (templates, guest uploads, etc.) — mirror policies on mt-prod before bulk copy. See [`docs/PROJECT.md`](../../PROJECT.md) storage sections.

---

## Related

- Prod cutover checklist: [`production-deployment.md`](./production-deployment.md)
- Dev-only phase: [`multi-tenant-dev-prod-setup.md`](./multi-tenant-dev-prod-setup.md)
- Agent guard: `.cursor/rules/no-prod-deploy.mdc` — LEGACY mutations require **`kamewave`**
