# Legacy → multi-tenant prod migration

**Status:** Not implemented — placeholder for Phase B prod release.

**Runbook:** [`docs/archive/operations/legacy-to-mt-prod-migration.md`](../../docs/archive/operations/legacy-to-mt-prod-migration.md)

**Source:** LEGACY `zfttdwtceyqszyeyhilc` (Postgres + Storage + Auth)  
**Target:** MULTI_TENANT_PROD _(project ref TBD when created)_

## Planned contents

```
scripts/migrate/legacy-to-mt-prod/
  README.md           (this file)
  migrate.sh          (orchestrator — TBD)
  postgres/           (table transforms — TBD)
  storage/            (bucket copy — TBD)
```

## Before running (release day)

1. Create mt-prod Supabase and deploy schema/functions
2. Backup LEGACY (`kamewave`) and mt-prod
3. Dry-run against fwor or empty mt-prod
4. Execute Postgres migration, then Storage sync
5. Verify counts + sample bookings + file URLs
6. Flip Vercel Production + merge **`develop` → `main`**

Do not run against LEGACY or mt-prod without explicit approval and **`kamewave`** where required.
