---
title: 'Route-based operator guides'
status: active
tags: [guides, routes]
updated: 2026-08-02
---

# Route-based operator guides

Per-page documentation mirrors the app routes. Each guide tracks **behavior**, **save paths**, **validation**, and **implementation status**.

**Template:** [`../_template.md`](../_template.md) · **Workflow:** [`.cursor/skills/route-guides/SKILL.md`](../../../.cursor/skills/route-guides/SKILL.md)

## Admin (authenticated)

| Route                                                      | Guide                                                                | Status                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `/sign-in`                                                 | [sign-in.md](./sign-in.md)                                           | Documented — legacy redirect → `/for-hosts/login`                  |
| `/onboarding`                                              | [onboarding.md](./onboarding.md)                                     | Documented — host type + optional property/parking                 |
| `/verification-rejected`                                   | [onboarding.md](./onboarding.md)                                     | Documented — hard-reject login screen                              |
| `/accept-invite`                                           | [accept-invite.md](./accept-invite.md)                               | Documented — org / property / parking team invites                 |
| `/org`                                                     | [org/selector.md](./org/selector.md)                                 | Documented — auto-redirect (no picker)                             |
| `/org/:orgSlug/dashboard`                                  | [org/dashboard.md](./org/dashboard.md)                               | Documented                                                         |
| `/org/:orgSlug/bookings`                                   | [org/bookings.md](./org/bookings.md)                                 | Documented — all properties; property column in views              |
| `/org/:orgSlug/settings`                                   | [org/settings.md](./org/settings.md)                                 | Documented                                                         |
| `/org/:orgSlug/properties`                                 | [org/properties.md](./org/properties.md)                             | Documented                                                         |
| `/org/:orgSlug/parkings`                                   | [org/parkings.md](./org/parkings.md)                                 | Documented                                                         |
| `/org/:orgSlug/team`                                       | [org/team.md](./org/team.md)                                         | Documented — org owner + admin team                                |
| `/org/:orgSlug/inbox`                                      | [org/inbox.md](./org/inbox.md)                                       | Documented — org rollup + default Meta; property/parking overrides |
| `/org/:orgSlug/property/:propertySlug/inbox`               | [org/property/inbox.md](./org/property/inbox.md)                     | Documented — scoped web + Meta inherit/override                    |
| `/org/:orgSlug/property/:propertySlug`                     | [org/property/dashboard.md](./org/property/dashboard.md)             | Documented                                                         |
| `/org/:orgSlug/property/:propertySlug/bookings`            | [org/property/bookings.md](./org/property/bookings.md)               | Documented                                                         |
| `/org/:orgSlug/property/:propertySlug/bookings/:bookingId` | [org/property/bookings-detail.md](./org/property/bookings-detail.md) | Documented                                                         |
| `/org/:orgSlug/property/:propertySlug/finance`             | [org/property/finance.md](./org/property/finance.md)                 | Documented                                                         |
| `/org/:orgSlug/property/:propertySlug/calendar`            | [org/property/calendar.md](./org/property/calendar.md)               | Documented — Occupancy + Pricing + date blocks                     |
| `/org/:orgSlug/property/:propertySlug/pricing`             | [org/property/pricing.md](./org/property/pricing.md)                 | Redirect → `/calendar`                                             |
| `/org/:orgSlug/property/:propertySlug/maintenance`         | [org/property/maintenance.md](./org/property/maintenance.md)         | Documented                                                         |
| `/org/:orgSlug/property/:propertySlug/notifications`       | [org/property/notifications.md](./org/property/notifications.md)     | Documented                                                         |
| `/org/:orgSlug/property/:propertySlug/templates`           | [org/property/templates.md](./org/property/templates.md)             | Documented — UI + DB + workflow email sends                        |
| `/org/:orgSlug/property/:propertySlug/team`                | [org/property/team.md](./org/property/team.md)                       | Documented — property team v1                                      |
| `/org/:orgSlug/property/:propertySlug/marketing`           | [org/property/marketing.md](./org/property/marketing.md)             | Documented — Content Studio + Telegram (see guide)                 |
| `/org/:orgSlug/property/:propertySlug/staff`               | [org/property/staff.md](./org/property/staff.md)                     | Redirect → notifications                                           |
| `/org/:orgSlug/property/:propertySlug/operations`          | [org/property/operations.md](./org/property/operations.md)           | Redirect → notifications                                           |
| `/org/:orgSlug/property/:propertySlug/settings`            | [org/property/settings.md](./org/property/settings.md)               | Documented                                                         |
| `/org/:orgSlug/parking/:parkingSlug`                       | [org/parking/dashboard.md](./org/parking/dashboard.md)               | Documented — scaffold KPIs                                         |
| `/org/:orgSlug/parking/:parkingSlug/bookings`              | [org/parking/bookings.md](./org/parking/bookings.md)                 | Documented — scaffold                                              |
| `/org/:orgSlug/parking/:parkingSlug/finance`               | [org/parking/finance.md](./org/parking/finance.md)                   | Documented — scaffold                                              |
| `/org/:orgSlug/parking/:parkingSlug/pricing`               | [org/parking/pricing.md](./org/parking/pricing.md)                   | Documented — base rates + calendar                                 |
| `/org/:orgSlug/parking/:parkingSlug/team`                  | [org/parking/team.md](./org/parking/team.md)                         | Documented — Staff/Viewer only; no custom roles                    |
| `/org/:orgSlug/parking/:parkingSlug/inbox`                 | [org/parking/inbox.md](./org/parking/inbox.md)                       | Documented — Meta inherit/override; web deferred                   |
| `/org/:orgSlug/parking/:parkingSlug/notifications`         | [org/parking/notifications.md](./org/parking/notifications.md)       | Documented                                                         |
| `/org/:orgSlug/parking/:parkingSlug/settings`              | [org/parking/settings.md](./org/parking/settings.md)                 | Documented                                                         |

## Admin (super admin)

Platform-level control panel, distinct from org/property admin and the legacy `ADMIN_ALLOWED_EMAILS` gate — see [`admin/overview.md`](./admin/overview.md) for the auth model.

| Route                                  | Guide                                                                | Status                                      |
| -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| `/admin`                               | [admin/overview.md](./admin/overview.md)                             | Documented                                  |
| `/admin/developments`                  | [admin/developments.md](./admin/developments.md)                     | Documented                                  |
| `/admin/developments/:developmentSlug` | [admin/development-detail.md](./admin/development-detail.md)         | Documented                                  |
| `/admin/approvals`                     | [admin/approvals.md](./admin/approvals.md)                           | Documented — Tier 1 host verification queue |
| `/admin/hosts`                         | [admin/hosts.md](./admin/hosts.md)                                   | Documented                                  |
| `/admin/properties`                    | [admin/platform-properties.md](./admin/platform-properties.md)       | Documented                                  |
| `/admin/hosts/:hostId/orgs`            | [admin/host-detail/orgs.md](./admin/host-detail/orgs.md)             | Documented                                  |
| `/admin/hosts/:hostId/orgs/properties` | [admin/host-detail/properties.md](./admin/host-detail/properties.md) | Documented                                  |
| `/admin/orgs/:orgSlug/properties`      | [admin/org-properties.md](./admin/org-properties.md)                 | Documented — minimal scaffold               |

## Public (guest)

### Marketing site (PMA port — Phase 1 UI, mock data)

| Route                                                                                                                       | Guide                                        | Status                                             |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| `/`                                                                                                                         | [index-landing.md](./index-landing.md)       | Documented — UI only                               |
| `/for-hosts` · `/for-hosts/pricing`                                                                                         | [for-hosts.md](./for-hosts.md)               | Documented — UI only                               |
| `/services`                                                                                                                 | [services.md](./services.md)                 | Documented — UI-only coming soon                   |
| `/search`                                                                                                                   | [search.md](./search.md)                     | Documented — live typeahead + availability results |
| `/properties` · `/properties/in/:location` · `/properties/:propertySlug` · `…/forms/:formId`                                | [properties.md](./properties.md)             | Documented — UI only                               |
| `/hosts/:orgSlug`                                                                                                           | [properties.md](./properties.md)             | Documented — public host profile                   |
| `/parkings` · `/parkings/in/:location` · `/parkings/:parkingSlug` · `…/form`                                                | [parkings.md](./parkings.md)                 | Documented — list mock; detail live API; form mock |
| `/developments` · `/developments/in/:location` · `/developments/:slug` · `…/properties` · `…/parking/*` · `…/forms/:formId` | [developments.md](./developments.md)         | Documented — UI only                               |
| `/about` · `/contact` · `/support` · `/terms` · `/privacy` · `/cookies`                                                     | [legal.md](./legal.md)                       | Documented — static company + legal pages          |
| `/for-hosts/*` (login, register, …) · guest checkout modal                                                                  | [auth.md](./auth.md)                         | Documented                                         |
| `/account`                                                                                                                  | [account/index.md](./account/index.md)       | Documented — redirect to `/account/profile`        |
| `/account/profile` · `/account/settings` (hidden, redirects)                                                                | [account/profile.md](./account/profile.md)   | Documented                                         |
| `/account/stays` (legacy `/account/trips` redirects here)                                                                   | [account/stays.md](./account/stays.md)       | Documented                                         |
| `/account/wishlist`                                                                                                         | [account/wishlist.md](./account/wishlist.md) | Documented                                         |
| `/account/messages`                                                                                                         | [account/messages.md](./account/messages.md) | Documented                                         |

### Operational guest flows (property-scoped)

All operational guest URLs live under **`/properties/:propertySlug/...`**. Path helpers: **`ui/src/features/guest/lib/guestPublicPaths.ts`** (re-exported from **`ui/src/features/dashboard/org/lib/guestPublicPaths.ts`** for admin copy-link).

| Route                                                                          | Guide                                        | Status     |
| ------------------------------------------------------------------------------ | -------------------------------------------- | ---------- |
| `/properties/:propertySlug/calendar`                                           | [calendar.md](./calendar.md)                 | Documented |
| `/properties/:propertySlug/messages`                                           | [properties/chat.md](./properties/chat.md)   | Documented |
| `/properties/:propertySlug/form`                                               | [form.md](./form.md)                         | Documented |
| `/properties/:propertySlug/success`                                            | [success.md](./success.md)                   | Documented |
| `/properties/:propertySlug/sd-form` · `/properties/:propertySlug/guest-review` | [sd-form.md](./sd-form.md)                   | Documented |
| `/properties/:propertySlug/stay-guide`                                         | [stay-guide.md](./stay-guide.md)             | Documented |
| `/properties/:propertySlug/parking/:bookingId`                                 | [bookings/parking.md](./bookings/parking.md) | Documented |

### Legacy redirects (removed global routes)

Old global paths redirect when **`?property=<slug>`** is present; otherwise guests are sent to **`/properties`**.

| Legacy path                    | Redirect target                                       |
| ------------------------------ | ----------------------------------------------------- |
| `/calendar`                    | `/properties/:slug/calendar`                          |
| `/form`                        | `/properties/:slug/form`                              |
| `/success`                     | `/properties/:slug/success`                           |
| `/sd-form`                     | `/properties/:slug/sd-form`                           |
| `/guest-review`                | `/properties/:slug/guest-review`                      |
| `/bookings/:bookingId/parking` | `/properties/:slug/parking/:bookingId` (via API slug) |
| `/?property=<slug>`            | `/properties/:slug/calendar`                          |

Flat admin paths (`/bookings`, `/settings`, etc.) still redirect via **`LegacyAdminRedirect`** to **`/org/:orgSlug/property/:propertySlug/...`** — see nested route guides above.

## Folder layout

```
docs/guides/routes/
  README.md                 ← this index
  index-landing.md          ← /
  for-hosts.md
  services.md
  properties.md
  developments.md
  legal.md
  sign-in.md
  onboarding.md
  accept-invite.md
  calendar.md
  form.md
  success.md
  sd-form.md
  account/
    index.md
    profile.md
    stays.md
    wishlist.md
    messages.md
  org/
    ...
  admin/
    overview.md
    developments.md
    development-detail.md
    approvals.md
    hosts.md
    platform-properties.md
    org-properties.md
    host-detail/
      orgs.md
      properties.md
  bookings/
    parking.md
```

When adding a guide, place it under the same path segments as the route (omit dynamic params like `:orgSlug`).
