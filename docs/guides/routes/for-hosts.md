# For hosts — operator guide

Route: `/for-hosts`

> **Status:** Documented — **Phase 1 (UI only)**. PMA marketing page; CTAs point to GFM admin sign-in.

## Progress overview

| Section        | E2E save | Validation | Docs       | Notes                               |
| -------------- | -------- | ---------- | ---------- | ----------------------------------- |
| Marketing copy | —        | —          | Documented | Static PMA content                  |
| Host CTAs      | —        | —          | Documented | → `/for-hosts/login` (Google OAuth) |

---

## Overview

Host acquisition landing (PMA `(marketing)/for-hosts`). Explains platform value prop, feature highlights, and pricing-style sections from mock/static content.

**CTA difference from PMA:** Primary buttons link to **`/for-hosts/login`** (Google OAuth in PMA auth shell) when signed out. When a host session already exists, the marketing nav shows **Dashboard** → last org dashboard (`/org/:orgSlug/dashboard`) or **`/dashboard`** (legacy redirect). New operators without an org land on **`/onboarding`** after sign-in.

**Mode switch:** **Become a host?** in the marketing nav (explore → host) and **Explore / Host** in the signed-in admin account menu run a brand-colored SVG morph overlay before navigating. Uses the listing **`brandColor`** on property/parking pages (via `GuestPublicBrandShell` + transition context), the scoped admin/property theme on dashboard pages (CSS vars), otherwise default Kame teal.

---

## Implementation map

| Concern  | Path                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Page     | `ui/src/features/guest/marketing/pages/ForHostsPage.tsx`                                             |
| Sections | `ui/src/features/guest/marketing/guest-landing/components/**` (shared marketing blocks where reused) |
| Routes   | `ui/src/features/guest/marketing/routes/index.tsx`                                                   |

---

## Related docs

- [Sign-in (legacy redirect)](./sign-in.md)
- [Host auth](./auth.md)
- [Onboarding](./onboarding.md)
- [Route index](./README.md)

---

## Pending / follow-ups

- [ ] Optional public host signup / waitlist if product adds `/register`
- [ ] Replace static copy with CMS or org-specific marketing settings
