---
title: 'Dev / staging environment'
status: active
tags: [workflow, in-progress, deployment]
updated: 2026-08-08
stage: in-progress
kind: plan
---

# Dev / staging environment

**Authoritative setup guide:** [`docs/archive/operations/dev-staging-environment.md`](../../archive/operations/dev-staging-environment.md)

## Summary

- **Two stacks (already split):** [`guest-form-management-app`](https://vercel.com/sprmkes-projects/guest-form-management-app) + LEGACY Supabase vs [`kame-homes`](https://vercel.com/kame-works/kame-homes) + mt-dev Supabase — see [`ci-cd-dev-prod.md`](./ci-cd-dev-prod.md) Task 2 **Quick verify**
- Separate **dev Supabase project** + **`kame-homes` Production** env vars (not legacy Preview-only)
- **Local modes:** full Docker (`./dev.sh`), hosted dev UI (`--ui-only --env dev`), hybrid API (`dev:remote-api`)
- **Dev deploy:** `bun run deploy:supabase:dev` with `PROD_PROJECT_REF` guard in `supabase/.env.dev.local`

## Shipped in repo

| Artifact                      | Path                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Runbook                       | `docs/archive/operations/dev-staging-environment.md`                                                        |
| Dev deploy script             | `scripts/deploy/deploy-supabase-dev.sh`                                                                     |
| Backup / rollback / status    | `scripts/deploy/backup-supabase.sh`, `rollback-supabase.sh`, `rollback-functions.sh`, `migration-status.sh` |
| Linked-project + audit helper | `scripts/dev/check-linked-project.sh` (also writes `backups/deploy-log.csv`)                                |
| Remote functions serve        | `scripts/dev/run-remote-functions-serve.sh`                                                                 |
| Env templates                 | `supabase/.env.dev.example`, `ui/.env.development.dev.example`                                              |
| VS Code tasks                 | `.vscode/tasks.json`                                                                                        |

## Operator checklist (first time)

1. Create dev Supabase project → copy `supabase/.env.dev.example` → `.env.dev.local`
2. `bun run deploy:supabase:dev`
3. Dashboard secrets + Google OAuth (runbook §2.5–2.7)
4. **`kame-homes`** Production env vars → fwor… — Task 2 in [`ci-cd-dev-prod.md`](./ci-cd-dev-prod.md)
5. **`bun run deploy:supabase:dev -- --allow-multi-tenancy`** — Task 3 in same doc (or Quick verify if already done)
6. Copy `ui/.env.development.dev.example` → `.env.development.dev`
7. `./dev.sh --ui-only --env dev` or VS Code → **Dev: Hosted dev (UI only)**
