# Property Guest Inbox

Route: `/org/:orgSlug/property/:propertySlug/inbox`

> **Status:** Documented

## Progress overview

| Section  | E2E | Validation | Docs | Notes                                               |
| -------- | --- | ---------- | ---- | --------------------------------------------------- |
| Messages | Yes | Yes        | Yes  | Web scoped to property; Meta = effective connection |
| Channels | Yes | Yes        | Yes  | Inherit org Meta or connect property override       |

## Overview

Property operators open Guest Inbox scoped to this property. **Web** threads are only those with `property_id` matching this property. **Facebook/Instagram** show threads for the **effective** Meta Page: a property override if connected, otherwise the **org default** Page (full org Page inbox — decision 1A) with a **Using org Meta** badge.

Quick replies and Automation remain **org-only** (use `/org/:orgSlug/inbox`).

## Host-facing knowledge

This is where you read and reply to guest messages for this property — website chat plus Facebook and Instagram when connected. Web chat threads belong to this property only; social messages use your connected Facebook Page (either this property's own connection or your organization's default Page).

**Common host questions**

- Q: Why do I see a badge saying I'm using the organization's Meta account?
  A: Your property hasn't connected its own Facebook Page yet, so you're seeing messages from your organization's shared Page inbox. You can connect a property-specific Page under Channels if you want this listing to use its own account.
- Q: Can I set up quick replies on this page?
  A: Quick replies and automation are managed at the organization inbox level, not on the property inbox page.
- Q: Why can't I reply to some Facebook or Instagram messages?
  A: Meta only allows replies within 24 hours of the guest's last message. After that window closes, you'll need the guest to message you again before you can respond from here.

## Permissions

| Permission     | UI                                      |
| -------------- | --------------------------------------- |
| `inbox:view`   | Open inbox, read threads                |
| `inbox:reply`  | Send replies, AI suggest                |
| `inbox:manage` | Connect / disconnect Meta Page override |

## Behavior

- **View property** on web threads → admin property dashboard (`propertyDashboardPath`), not the public listing.
- Connect Meta here writes `social_channel_connections` with `property_id` set; does **not** wipe the org default.
- Disconnect override only removes the property override + its Meta threads; UI falls back to org Meta.
- Query/body: `property_id` on inbox edge functions; auth via `verifyPropertyAccess` + `inbox:*`.
- **Message body rendering (Phase 6.1b):** plain `body_text` is parsed client-side into rich blocks
  (Google Maps → map thumbnail card, `-`/`1.` lists, https linkify) via shared `ChatRichBody` /
  `ChatMessageBubble` — same as guest web chat. No DB schema change.

## Implementation map

| Area  | Path                                                                     |
| ----- | ------------------------------------------------------------------------ |
| Page  | `ui/src/features/dashboard/inbox/pages/PropertyInboxPage.tsx`            |
| Shell | `ui/src/features/dashboard/inbox/pages/InboxPage.tsx`                    |
| Scope | `supabase/functions/_shared/metaInboxScope.ts`, `inboxAccess.ts`         |
| Plan  | `docs/planning/planned_modules/2026-07-30-inbox-org-property-parking.md` |

## Related

- [Org Inbox](../inbox.md)
- [Parking Inbox](../parking/inbox.md)
