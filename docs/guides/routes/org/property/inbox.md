---
title: 'Property Guest Inbox'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-17
---

# Property Guest Inbox

Route: `/org/:orgSlug/property/:propertySlug/inbox`

> **Status:** Documented

## Progress overview

| Section       | E2E | Validation | Docs | Notes                                                           |
| ------------- | --- | ---------- | ---- | --------------------------------------------------------------- |
| Messages      | Yes | Yes        | Yes  | Web scoped to property; Meta = effective connection             |
| Channels      | Yes | Yes        | Yes  | First connect becomes org-default Meta; later connects override |
| Quick replies | Yes | Yes        | Yes  | Org-scoped templates; managed here with `inbox:manage`          |
| Automation    | Yes | Yes        | Yes  | Org-scoped AI settings; managed here with `inbox:manage`        |

## Overview

Property operators open Guest Inbox scoped to this property. **Web** threads are only those with `property_id` matching this property. **Facebook/Instagram** show threads for the **effective** Meta Page: a property override if connected, otherwise the **org default** Page (full org Page inbox — decision 1A) with a **Using org Meta** badge.

**Manage** (Channels / Quick replies / Automation) lives on the property inbox. There is no org-level Inbox route anymore (`/org/:orgSlug/inbox` redirects to Properties). Quick replies and automation data remain **organization-scoped** (shared across properties); Channels connect/disconnect is scoped as described below.

## Host-facing knowledge

This is where you read and reply to guest messages for this property: website chat plus Facebook and Instagram when connected. Use **Manage** to connect Meta, save quick replies, and turn on AI automation. Web chat threads belong to this property only; social messages use your connected Facebook Page (this property’s own connection, or the shared organization Page).

**Common host questions**

- Q: Why do I see a badge saying I'm using the organization's Meta account?
  A: Your property hasn't connected its own Facebook Page yet, so you're seeing messages from the shared Page inbox. You can connect a property-specific Page under Channels if you want this listing to use its own account.
- Q: Where do I set quick replies and automation?
  A: On this property Inbox under **Manage** → Quick replies / Automation. Those settings apply across your organization.
- Q: Why can't I reply to some Facebook or Instagram messages?
  A: Meta only allows replies within 24 hours of the guest's last message. After that window closes, you'll need the guest to message you again before you can respond from here.

## Permissions

| Permission     | UI                                                                    |
| -------------- | --------------------------------------------------------------------- |
| `inbox:view`   | Open inbox, read threads                                              |
| `inbox:reply`  | Send replies, AI suggest                                              |
| `inbox:manage` | Channels connect/disconnect, quick replies, automation, full backfill |

## Behavior

- **Manage actions:** Desktop (`lg+`) shows separate header buttons — **Channels**, **Quick replies**, **Automation** — each opening its modal. Mobile (`max-lg`) groups them in the hero **Inbox actions** menu (bottom sheet).
- **View property** on web threads → admin property dashboard (`propertyDashboardPath`), not the public listing.
- **First Meta connect** from a property (when no org-default Page exists) writes the **org-default** connection so Marketing Studio and other properties can inherit it.
- Later Connect from a property that already has an org-default writes a **property override** (`property_id` set); does **not** wipe the org default.
- Disconnect override only removes the property override + its Meta threads; UI falls back to org Meta. Disconnect while using org Meta clears the org-default connection.
- Query/body: `property_id` on inbox edge functions; auth via `verifyPropertyAccess` + `inbox:*`.
- **Message body rendering:** plain `body_text` is parsed client-side into rich blocks via shared `ChatRichBody` / `ChatMessageBubble`.

## API reference

| Function                  | Notes                                                          |
| ------------------------- | -------------------------------------------------------------- |
| `meta-inbox-*`            | OAuth / status / disconnect / backfill — require `property_id` |
| `social-inbox-threads`    | Scoped list                                                    |
| `social-inbox-messages`   | Messages / mark read / edit / unsend                           |
| `social-inbox-send`       | Replies                                                        |
| `social-inbox-templates`  | Quick reply CRUD (`inbox:manage` + `property_id`)              |
| `social-inbox-settings`   | Automation GET/PATCH (`inbox:manage` + `property_id`)          |
| `social-inbox-ai-suggest` | AI draft (`inbox:reply` + `property_id`)                       |

## Implementation map

| Area  | Path                                                             |
| ----- | ---------------------------------------------------------------- |
| Page  | `ui/src/features/dashboard/inbox/pages/PropertyInboxPage.tsx`    |
| Shell | `ui/src/features/dashboard/inbox/pages/InboxPage.tsx`            |
| Scope | `supabase/functions/_shared/metaInboxScope.ts`, `inboxAccess.ts` |
| Auth  | `resolveInboxAccess` — property or parking only                  |

## Related

- [Parking Inbox](../parking/inbox.md)
- Legacy org inbox URL redirects to Properties
