# Documentation index

Navigation for **guest-form-management**.

**AI agents:** **[`.cursor/rules/README.md`](../.cursor/rules/README.md)** (rules + skills index) → then **[`architecture/overview.md`](./architecture/overview.md)** for architecture/API.

## Architecture

| Doc                                                                          | Purpose                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| [`PROJECT.md`](./PROJECT.md)                                                 | Thin index into `architecture/` (start here)         |
| [`architecture/overview.md`](./architecture/overview.md)                     | Purpose, stack, repo layout, known notes, key files  |
| [`architecture/routing.md`](./architecture/routing.md)                       | Routes, pages, admin dashboard, user flows           |
| [`architecture/data-model.md`](./architecture/data-model.md)                 | Postgres schema (`guest_submissions`, multi-tenancy) |
| [`architecture/storage.md`](./architecture/storage.md)                       | Supabase Storage buckets                             |
| [`architecture/edge-functions.md`](./architecture/edge-functions.md)         | Edge function inventory (API surface)                |
| [`architecture/integrations.md`](./architecture/integrations.md)             | Resend, Google Calendar/Sheets, PDF                  |
| [`architecture/validation-and-env.md`](./architecture/validation-and-env.md) | Guest form validation + env vars                     |
| [`architecture/deployment.md`](./architecture/deployment.md)                 | Deployment summary                                   |
| [`architecture/roadmap.md`](./architecture/roadmap.md)                       | Roadmap / gaps                                       |

## Planning

| Doc                                                        | Purpose                                          |
| ---------------------------------------------------------- | ------------------------------------------------ |
| [`planning/README.md`](./planning/README.md)               | Planning docs index                              |
| [`planning/NEW_FLOW_PLAN.md`](./planning/NEW_FLOW_PLAN.md) | Booking redesign — decisions, phases             |
| [`planning/NEW_FLOW.md`](./planning/NEW_FLOW.md)           | Original product spec                            |
| [`planning/planned_modules/`](./planning/planned_modules/) | Finished Plan-mode plans, one per module/feature |

## Superpowers (opt-in workflow artifacts)

| Doc                                                | Purpose                                                  |
| -------------------------------------------------- | -------------------------------------------------------- |
| [`superpowers/README.md`](./superpowers/README.md) | Active vs completed brainstorm/spec/plan artifacts index |

## Todos

| Doc                                                  | Purpose                                           |
| ---------------------------------------------------- | ------------------------------------------------- |
| [`todos/README.md`](./todos/README.md)               | Product backlog — GitHub Issues + shipped archive |
| [`todos/BACKLOG_DRAFT.md`](./todos/BACKLOG_DRAFT.md) | Legacy unfiled items (not GitHub Issues)          |
| [`todos/shipped/`](./todos/shipped/)                 | Completed issues + legacy phase history           |

## Operations

| Doc                                                                                      | Purpose                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| [`operations/README.md`](./operations/README.md)                                         | Operations docs index                      |
| [`operations/migration-runbook.md`](./operations/migration-runbook.md)                   | DB migrations, local setup, prod data sync |
| [`operations/production-deployment.md`](./operations/production-deployment.md)           | Production cutover checklist               |
| [`operations/scheduled-jobs-and-testing.md`](./operations/scheduled-jobs-and-testing.md) | `pg_cron`, Gmail listener, SD refund cron  |
| [`operations/inbox-e2e-runbook.md`](./operations/inbox-e2e-runbook.md)                   | Meta Guest Inbox E2E                       |
| [`operations/meta-app-review.md`](./operations/meta-app-review.md)                       | Meta App Review submission                 |

## Guides (per-route behavior)

| Doc                                                    | Purpose               |
| ------------------------------------------------------ | --------------------- |
| [`guides/README.md`](./guides/README.md)               | Route guides overview |
| [`guides/routes/README.md`](./guides/routes/README.md) | Route → file index    |

## Reference

| Doc                                                                                          | Purpose                                       |
| -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [`reference/booking-flow-guide-for-admin.md`](./reference/booking-flow-guide-for-admin.md)   | Non-technical admin walkthrough               |
| [`reference/ai-payment-receipt-validation.md`](./reference/ai-payment-receipt-validation.md) | Receipt AI                                    |
| [`reference/telegram-marketing-reminders.md`](./reference/telegram-marketing-reminders.md)   | Telegram marketing cron                       |
| [`reference/project-structure.md`](./reference/project-structure.md)                         | Guest vs dashboard feature layout             |
| [`reference/public-property-catalog.md`](./reference/public-property-catalog.md)             | Public property detail API + UI gaps          |
| [`reference/archive/`](./reference/archive/)                                                 | Superseded reference docs (e.g. naming-audit) |

## Agent tooling

| Resource                                                                      | Purpose                                |
| ----------------------------------------------------------------------------- | -------------------------------------- |
| [`.cursor/rules/README.md`](../.cursor/rules/README.md)                       | Rules, skills, subagents — agent index |
| [`.cursor/skills/docs-first/SKILL.md`](../.cursor/skills/docs-first/SKILL.md) | Docs-first workflow                    |
