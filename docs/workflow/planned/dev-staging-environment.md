---
title: 'Dev / staging environment'
status: active
tags: [workflow, planned, deployment]
updated: 2026-08-04
stage: planned
kind: plan
---

# Dev / staging environment

**Authoritative setup guide:** [`docs/archive/operations/dev-staging-environment.md`](../archive/operations/dev-staging-environment.md)

## Summary

- Separate **dev Supabase project** (different account) + **Vercel Preview** env vars
- **Local modes:** full Docker (`./dev.sh`), hosted dev UI (`--ui-only --env dev`), hybrid API (`dev:remote-api`)
- **Dev deploy:** `bun run deploy:supabase:dev` with `PROD_PROJECT_REF` guard in `supabase/.env.dev.local`

## Shipped in repo

| Artifact               | Path                                                           |
| ---------------------- | -------------------------------------------------------------- |
| Runbook                | `docs/archive/operations/dev-staging-environment.md`           |
| Dev deploy script      | `scripts/deploy/deploy-supabase-dev.sh`                        |
| Remote functions serve | `scripts/dev/run-remote-functions-serve.sh`                    |
| Env templates          | `supabase/.env.dev.example`, `ui/.env.development.dev.example` |
| VS Code tasks          | `.vscode/tasks.json`                                           |

## Operator checklist (first time)

1. Create dev Supabase project → copy `supabase/.env.dev.example` → `.env.dev.local`
2. `bun run deploy:supabase:dev`
3. Dashboard secrets + Google OAuth (runbook §2.5–2.7)
4. Vercel Preview env vars (runbook §3)
5. Copy `ui/.env.development.dev.example` → `.env.development.dev`
6. `./dev.sh --ui-only --env dev` or VS Code → **Dev: Hosted dev (UI only)**
