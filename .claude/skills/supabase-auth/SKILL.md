---
name: supabase-auth
description: Supabase Auth for admin Google OAuth, session JWT, allow list, org/property RBAC. Use for sign-in, RequireAdmin, edge verifyAdminJwt, verifyPropertyAccess, or team permissions.
---

# Supabase auth (GFM)

## Admin sign-in

- Route: `/sign-in` → `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Client: `ui/src/lib/supabase/client.ts` (singleton)
- Guard: `ui/src/features/dashboard/bookings/components/RequireAdmin.tsx`

## Allow list

- Server: `ADMIN_ALLOWED_EMAILS` in edge env — `_shared/auth.ts#verifyAdminJwt`
- Client UX: `VITE_ADMIN_ALLOWED_EMAILS` — reject early only; **not** the security boundary

See `.cursor/rules/admin-auth.mdc`.

## Org / property RBAC

| Helper                   | File                                 |
| ------------------------ | ------------------------------------ |
| `verifyPropertyAccess`   | `_shared/orgAuth.ts`                 |
| `resolveAdminPropertyId` | `_shared/propertyScope.ts`           |
| Property permissions     | `_shared/propertyTeamPermissions.ts` |
| Org permissions          | `_shared/orgTeamPermissions.ts`      |

Platform superadmin: same email allow list as legacy admin.

## Edge pattern

```typescript
import { serveAdmin } from '../_shared/serveEdge.ts';

serveAdmin('my-function', async (req, user) => {
  const ctx = await resolveAdminPropertyId(req, user);
  // ...
});
```

`verify_jwt = false` in `config.toml` — **always** call auth helpers in handler body.

## UI session for API

```typescript
import { callEdgeFunction, getSessionJwt } from '@/features/dashboard/org/lib/edgeClient';
```

Refreshes session before edge calls; signs out on expired user.

## Guest routes

Public flows use **anon key** only — no Supabase session required on `/form`, `/calendar`, `/sd-form`.

## Docs

- `docs/guides/routes/sign-in.md`
- `docs/guides/routes/org/team.md`
