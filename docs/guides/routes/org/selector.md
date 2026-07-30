# Organization hub — operator guide

Route: `/org`

> **Status:** Documented

## Progress overview

| Section       | E2E save | Validation | Docs       | Notes                    |
| ------------- | -------- | ---------- | ---------- | ------------------------ |
| Auto-redirect | n/a      | n/a        | Documented | No selector UI; hub only |

---

## Overview

Authenticated hosts hitting **`/org`** never see an organization picker. The page loads **`list-organizations`**, then redirects:

| Condition        | Destination                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| One or more orgs | **`/org/:slug/dashboard`** — last-used slug from `localStorage` when still accessible, otherwise the first org |
| Zero orgs        | **`/onboarding`**                                                                                              |
| List error       | **`/onboarding`**                                                                                              |

Users may be **assigned** to multiple orgs (owner, org admin, or property member) and switch via the sidebar tenant switcher. They **cannot create** a second owned org — onboarding redirects away when any org already exists, and **`create-organization`** returns **409** if the caller already owns one.

---

## Host-facing knowledge

Visiting the organization hub does not show a list of organizations to pick from. After you sign in, the app sends you straight to your organization dashboard — usually the one you used last. If you belong to more than one organization, switch between them with the tenant menu in the sidebar. If you have no organization yet, you’re sent to onboarding to create one.

**Common host questions**

- Q: Why don’t I see an organization chooser after sign-in?
  A: The app remembers your last organization and opens it automatically. Use the sidebar switcher to change organizations.
- Q: Can I own two separate organizations with one Google account?
  A: No. Each account can own one organization. You can still be invited as an admin to other people’s organizations.
- Q: I only manage one property — why did I land on an org page?
  A: Property-only members are usually redirected to their assigned property dashboard. If something looks wrong, confirm your team invite was accepted and that a property is assigned to you.

---

## Behavior / edge cases

- **Property-only members** who land on an org dashboard are redirected by **`PropertyMemberOrgRedirect`** to an assigned property. If that org has no properties, try another accessible org; otherwise show access denied (never loop back to `/org` forever).
- Other failed context guards (`RequireOrgContext`, `RequireParkingContext`, delete-org, access-denied **Home**) still navigate to **`/org`**, which re-resolves the landing path.
- Post-sign-in with redirect **`/org`** uses the same **`resolveOrgLandingPath`** helper as this page.

---

## API reference

| Action    | Endpoint                 |
| --------- | ------------------------ |
| List orgs | `GET list-organizations` |

---

## Implementation map

| Concern                | Path                                                      |
| ---------------------- | --------------------------------------------------------- |
| Page                   | `ui/src/features/dashboard/org/pages/OrgSelectorPage.tsx` |
| Landing helper         | `ui/src/features/dashboard/org/lib/orgLanding.ts`         |
| Post-sign-in           | `ui/src/features/dashboard/org/lib/postSignInRouting.ts`  |
| Routes                 | `ui/src/features/dashboard/org/routes/index.tsx`          |
| Create org (one owned) | `supabase/functions/create-organization/index.ts`         |

---

## Related docs

- [Route index](../README.md)
- [Onboarding](../onboarding.md)
- [Org dashboard](./dashboard.md)
- [`docs/PROJECT.md`](../../PROJECT.md)

---

## Pending / follow-ups

- [ ] None
