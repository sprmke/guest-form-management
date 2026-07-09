---
name: multi-tenancy
description: Organizations, properties, scoped routes, and API paths. Use when adding org/property features, scoping edge functions, or public ?property= links.
---

# Multi-tenancy (GFM)

## Model

- **Organization** — owner + org admins + invited members
- **Property** — belongs to org; team members with JSONB permissions
- **Routes:** `/org/:orgSlug/property/:propertySlug/...`

## UI scoping

| Helper                | Purpose                          |
| --------------------- | -------------------------------- |
| `usePropertyIdParam`  | Resolve property UUID from route |
| `appendPropertyId`    | Add `?property_id=` to edge URLs |
| `scopedFunctionsUrl`  | Base functions URL + scope       |
| `guestPublicPaths.ts` | Public `/?property=<slug>` links |

## Edge scoping

```typescript
import { resolveAdminPropertyId } from '../_shared/propertyScope.ts';
```

Public guest:

```typescript
import { resolvePublicPropertyId } from '../_shared/propertyScope.ts';
```

Defaults to legacy Monaco property when param omitted (backlog: require explicit property).

## Data

- `guest_submissions.property_id`
- Per-property `app_settings`, Telegram settings, Gmail integration
- Cron jobs iterate properties (`propertyCron.ts`)

## Legacy redirects

`LegacyAdminRedirect.tsx` — flat `/bookings` → org/property paths.

## Docs

- `docs/PROJECT.md` — multi-tenancy sections
- `docs/guides/routes/org/selector.md`
- `docs/guides/routes/org/property/settings.md`

## Rule

`.cursor/rules/security.mdc`
