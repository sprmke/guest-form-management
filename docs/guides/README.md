---
title: 'Guides'
status: active
tags: [guides]
updated: 2026-08-02
---

# Guides

Operator and agent documentation for **what each page/section does** — behavior, save paths, validation, and implementation pointers.

## Structure

```
docs/guides/
  README.md           ← this file
  _template.md        ← copy when adding a new route guide
  testing/            ← cross-route manual E2E flows
  routes/
    README.md         ← route index (links to every guide)
    sign-in.md
    org/
      property/
        settings.md   ← example of a complete guide
    ...
```

## Manual testing (feature flows)

| Doc                                                                                  | Purpose                                                                                       |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [`testing/unit-handoff-phase-b-manual.md`](./testing/unit-handoff-phase-b-manual.md) | Unit handoff Phase B — notices, grace, consideration, SA grant/deny, lock, parking leg, 375px |

## When to update

Any material change to a page, section, or feature → update the matching route guide **in the same change**.

| Agent resource                                                                    | Purpose                          |
| --------------------------------------------------------------------------------- | -------------------------------- |
| [`.cursor/rules/route-guides.mdc`](../.cursor/rules/route-guides.mdc)             | Always-on reminder               |
| [`.cursor/skills/route-guides/SKILL.md`](../.cursor/skills/route-guides/SKILL.md) | Step-by-step workflow + template |
| [`docs/guides/routes/README.md`](./routes/README.md)                              | Route → file index               |

## vs other docs

| Document                                 | Scope                                     |
| ---------------------------------------- | ----------------------------------------- |
| **`docs/guides/routes/*.md`**            | Per-route behavior (this folder)          |
| **[[PROJECT]]**                          | System architecture, API tables, env vars |
| **`.cursor/rules/booking-workflow.mdc`** | Canonical booking state machine           |
| **[[NEW_FLOW_PLAN]]**                    | Redesign plan and phased decisions        |

Start with the [route index](./routes/README.md). For a full worked example, see [Property Settings](./routes/org/property/settings.md).
