---
name: docs-first
description: Read project docs before implementing features in guest-form-management. Use when adding or changing routes, edge functions, booking workflow, org/property UI, or env vars.
---

# Docs-first (Guest Form Management)

Do not implement from memory. Align with repo docs first.

## When to use

- New or changed user-visible behavior, API, DB columns, or env vars
- Booking status, emails, calendar, sheets, Gmail listener, inbox
- Unsure where code or validation lives

## Steps

1. **`docs/README.md`** — index; then **`docs/PROJECT.md`** for architecture, API, env vars, routes
2. **`docs/guides/routes/README.md`** — per-route behavior (update matching guide in the same change)
3. **`docs/todos/README.md`** — backlog on GitHub Issues; shipped history in `docs/todos/shipped/`
4. **Booking / admin work** — `docs/planning/NEW_FLOW_PLAN.md`, `.cursor/rules/booking-workflow.mdc`, `.cursor/rules/admin-auth.mdc`
5. **Edge functions** — `.cursor/rules/supabase-edge-functions.mdc`

## Topic map

| Topic                  | Primary doc / rule                                                               |
| ---------------------- | -------------------------------------------------------------------------------- |
| Routes & page behavior | `docs/guides/routes/*.md`                                                        |
| Booking workflow       | `.cursor/rules/booking-workflow.mdc`                                             |
| Admin auth             | `.cursor/rules/admin-auth.mdc`                                                   |
| Edge functions         | `.cursor/rules/supabase-edge-functions.mdc`                                      |
| Multi-tenancy          | `.cursor/skills/multi-tenancy/SKILL.md`                                          |
| TanStack Query         | `.cursor/skills/tanstack-query/SKILL.md`                                         |
| Forms                  | `.cursor/rules/forms.mdc`                                                        |
| Emails / integrations  | `.cursor/skills/emails/SKILL.md`, `integrations/SKILL.md`                        |
| Social inbox           | `.cursor/skills/social-inbox/SKILL.md`                                           |
| File naming            | `.cursor/rules/naming-conventions.mdc`, `docs/reference/archive/naming-audit.md` |
| Full agent index       | `.cursor/rules/README.md`                                                        |

## Rule

If docs and code disagree, fix the doc in the same change (see `.cursor/rules/documentation-maintenance.mdc`).
