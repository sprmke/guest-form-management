# Documentation index

Navigation for **guest-form-management**.

**AI agents:** **`.cursor/rules/README.md`** (rules + skills index) → then **`docs/PROJECT.md`** for architecture/API.

## Core

| Doc                                    | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| [`PROJECT.md`](./PROJECT.md)           | Architecture, API inventory, env vars, routes     |
| [`todos/README.md`](./todos/README.md) | Product backlog — GitHub Issues + shipped archive |

## Planning

| Doc                                                        | Purpose                              |
| ---------------------------------------------------------- | ------------------------------------ |
| [`planning/NEW_FLOW_PLAN.md`](./planning/NEW_FLOW_PLAN.md) | Booking redesign — decisions, phases |
| [`planning/NEW_FLOW.md`](./planning/NEW_FLOW.md)           | Original product spec                |

## Todos (detail)

| Doc                                  | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| [`todos/shipped/`](./todos/shipped/) | Completed issues + legacy phase history |

## Operations

| Doc                                                                                      | Purpose                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------ |
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

| Doc                                                                                          | Purpose                              |
| -------------------------------------------------------------------------------------------- | ------------------------------------ |
| [`reference/booking-flow-guide-for-admin.md`](./reference/booking-flow-guide-for-admin.md)   | Non-technical admin walkthrough      |
| [`reference/ai-payment-receipt-validation.md`](./reference/ai-payment-receipt-validation.md) | Receipt AI                           |
| [`reference/telegram-marketing-reminders.md`](./reference/telegram-marketing-reminders.md)   | Telegram marketing cron              |
| [`reference/project-structure.md`](./reference/project-structure.md)                         | Guest vs dashboard feature layout    |
| [`reference/public-property-catalog.md`](./reference/public-property-catalog.md)             | Public property detail API + UI gaps |
| [`reference/naming-audit.md`](./reference/naming-audit.md)                                   | UI filename audit + rename log       |

## Agent tooling

| Resource                                                                      | Purpose                                |
| ----------------------------------------------------------------------------- | -------------------------------------- |
| [`.cursor/rules/README.md`](../.cursor/rules/README.md)                       | Rules, skills, subagents — agent index |
| [`.cursor/skills/docs-first/SKILL.md`](../.cursor/skills/docs-first/SKILL.md) | Docs-first workflow                    |
