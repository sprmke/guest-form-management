# Sign-in (legacy redirect)

Route: `/sign-in` → **`/for-hosts/login`**

> **Status:** Redirect only — host auth lives at **`/for-hosts/login`**. See [auth.md](./auth.md).

## Behavior

Preserves **`?redirect=`** when redirecting to the host login page.

## Implementation

| Concern  | Path                                                             |
| -------- | ---------------------------------------------------------------- |
| Redirect | `ui/src/features/guest/auth/components/LegacySignInRedirect.tsx` |

## Related

- [Host auth](./auth.md)
- [`docs/PROJECT.md`](../../PROJECT.md) §4
