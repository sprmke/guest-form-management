---
name: route-guides
description: >-
  Create or update per-route operator guides in docs/guides/routes when
  implementing or changing pages, sections, or features. Use when touching
  UI routes, page behavior, save flows, validation, or when the user mentions
  route guides, docs/guides, or page documentation.
---

# Route guides skill

Living per-page specs live in **`docs/guides/routes/`**, aligned with app URLs. Update them in the same PR/session as code changes.

## When to use

- Adding or changing a **page**, **section**, or **feature** with user-visible behavior
- Changing **save paths**, **validation**, **API calls**, or **permissions** on a screen
- User asks to document a route or section

Skip for trivial fixes (typos, rename-only refactors).

## Workflow

1. **Identify the route** — read `ui/src/features/*/routes/index.tsx` and `ui/src/routes/index.tsx`.
2. **Open or create the guide** — path mirrors URL (see mapping below).
3. **Read existing guide** — preserve accurate content; edit in place.
4. **Implement code change.**
5. **Update the guide** — behavior, validation, save paths, API table, implementation map, progress table.
6. **Update index** — `docs/guides/routes/README.md` link/status if new route or first real doc.
7. **Cross-check** — `docs/PROJECT.md` for API/env; link `.cursor/rules/` for canonical workflow/auth rules instead of copying matrices.

## Route → file mapping

```
/sign-in                          → sign-in.md
/onboarding                       → onboarding.md
/org                              → org/selector.md
/org/:orgSlug/dashboard           → org/dashboard.md
/org/:orgSlug/settings            → org/settings.md
/org/:orgSlug/properties          → org/properties.md
/org/:orgSlug/inbox               → org/inbox.md
/org/:orgSlug/property/:slug      → org/property/dashboard.md
…/bookings                        → org/property/bookings.md
…/bookings/:bookingId             → org/property/bookings-detail.md
…/finance                         → org/property/finance.md
…/pricing                         → org/property/pricing.md
…/maintenance                     → org/property/maintenance.md
…/marketing                       → org/property/marketing.md
…/staff                           → org/property/staff.md
…/operations                      → org/property/operations.md
…/settings                        → org/property/settings.md
/  ·  /calendar                    → calendar.md
/form                             → form.md
/success                          → success.md
/sd-form                          → sd-form.md
/bookings/:bookingId/parking      → bookings/parking.md
```

New route: copy **`docs/guides/_template.md`**, place under matching folders, add README row.

## Guide template (sections)

Use **`docs/guides/_template.md`**. Every documented page should include:

| Section                  | Content                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| **Progress overview**    | Table: Section \| E2E \| Validation \| Docs \| Notes             |
| **Overview**             | One short paragraph — who uses it, what it does                  |
| **Sections**             | One `##` per UI section — fields, storage, validation, save path |
| **API reference**        | Edge functions + key request/response notes                      |
| **Implementation map**   | Page component, hooks, shared modules, edge functions            |
| **Related docs**         | Links to PROJECT.md, booking-workflow, admin-auth as needed      |
| **Pending / follow-ups** | Checkbox list for known gaps                                     |

**Example (complete):** `docs/guides/routes/org/property/settings.md`.

## Writing rules

- **Behavior over code dump** — describe what happens, not every line.
- **Tables for fields/API** — field name, storage column/JSON path, validation rule.
- **Save path numbered steps** — UI action → endpoint → DB/storage side effects.
- **Link canonical rules** — booking transitions → `booking-workflow.mdc`; auth → `admin-auth.mdc`.
- **Keep UI/edge validation in sync** — note both paths when rules are duplicated (see settings guide).
- **Minimal copy in guides is OK** — precise ops language, not marketing text.

## Progress table values

| Column     | Values                               |
| ---------- | ------------------------------------ |
| E2E save   | `Done` · `Partial` · `—` · `N/A`     |
| Validation | `Done` · `Partial` · `—`             |
| Docs       | `Done` · `Pending`                   |
| Notes      | Short caveat (e.g. "upload-only QR") |

## Checklist before finishing

- [ ] Guide path matches route
- [ ] Progress table reflects current sections
- [ ] New/changed fields, endpoints, and validations documented
- [ ] Implementation map paths exist in repo
- [ ] `docs/guides/routes/README.md` updated if new route
- [ ] `docs/PROJECT.md` updated if API/env/architecture changed (per `documentation-maintenance.mdc`)
