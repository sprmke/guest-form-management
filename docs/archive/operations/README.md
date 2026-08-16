---
title: 'Operations docs'
status: active
tags: [operations]
updated: 2026-08-02
---

# Operations docs

Runbooks for migrations, deployment, cron jobs, and Meta inbox testing.

| Doc                                                              | When to use                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [migration-runbook.md](./migration-runbook.md)                   | Local Supabase, `db reset`, prod → local data sync                       |
| [production-deployment.md](./production-deployment.md)           | Shipping migrations + functions + secrets to prod                        |
| [approval-email-inbound.md](./approval-email-inbound.md)         | Resend Receiving webhook for GAF/pet approvals (replaces Gmail listener) |
| [scheduled-jobs-and-testing.md](./scheduled-jobs-and-testing.md) | SD refund cron, Telegram crons (Gmail listener retired)                  |
| [inbox-e2e-runbook.md](./inbox-e2e-runbook.md)                   | Guest Inbox operator E2E (Meta OAuth, webhook)                           |
| [meta-app-review.md](./meta-app-review.md)                       | Meta app use cases, OAuth scopes, webhooks, App Review                   |

Back to [docs index](../README.md).
