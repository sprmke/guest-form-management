# [Page title] — operator guide

Route: `/path/to/page`

> **Status:** Pending — replace with **Documented** when this guide describes shipped behavior.

## Progress overview

| Section        | E2E save | Validation | Docs    | Notes |
| -------------- | -------- | ---------- | ------- | ----- |
| _Section name_ | —        | —          | Pending |       |

---

## Overview

_(Who uses this page and what it accomplishes.)_

---

## [Section name]

### Fields

| Field   | Storage               | Validation |
| ------- | --------------------- | ---------- |
| _Label_ | _column or JSON path_ | _rule_     |

### Save path

1. UI action → **endpoint** (method)
2. DB / storage side effects

### Behavior / edge cases

_(Non-obvious logic, gating, permissions.)_

---

## API reference

| Action   | Endpoint               |
| -------- | ---------------------- |
| _Action_ | _METHOD function-name_ |

---

## Implementation map

| Concern           | Path                                                |
| ----------------- | --------------------------------------------------- |
| Page              | `ui/src/features/.../pages/...`                     |
| Components        | `ui/src/features/.../components/...`                |
| Hooks             | `ui/src/features/.../hooks/...`                     |
| Edge functions    | `supabase/functions/...`                            |
| Shared validation | `ui/src/lib/...` · `supabase/functions/_shared/...` |

---

## Related docs

- [Route index](./routes/README.md)
- [`docs/PROJECT.md`](../PROJECT.md)
- _(Link `.cursor/rules/` files when behavior is canonical elsewhere.)_

---

## Pending / follow-ups

- [ ] _(Known gap)_
