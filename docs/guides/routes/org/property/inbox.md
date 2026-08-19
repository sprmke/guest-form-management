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
- Q: What is the support follow-up toggle?
  A: If a guest messaged within the last 7 days but the normal 24-hour reply window has already closed, the composer can show a support follow-up toggle. Turn it on only for non-promotional follow-ups; it sends with Meta's `HUMAN_AGENT` tag.
- Q: Why do I see a Fix connection warning instead of new messages?
  A: The Page is still connected, but Meta may have dropped this app's webhook subscription. Use **Fix connection** first to re-subscribe the Page without deleting any conversations. Reconnect is for token or account-link issues.
- Q: What does Disconnect do?
  A: Disconnect removes the Meta connection and deletes synced Facebook/Instagram conversations from this inbox. You can reconnect again to view and load conversations.

**Plan gating:** Manual replies and **Manage AI response** stay free. Enabling **Send automatically** requires **`aiChatAutoReply`** (Automation tab pre-flight + **`social-inbox-settings`** PATCH). Runtime auto-reply skips when the property plan lacks the feature; org-level contexts without a property id use **`requireOrgPropertyFeature`** / **`orgHasPropertyWithFeature`** on the server.

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
- **Webhook health:** connected Meta rows record `webhook_last_verified_at` and retry attempts. After repeated failed checks, Channels shows **Fix connection**, which re-verifies and re-subscribes the current Page in place without disconnecting or wiping history.
- **Proactive Meta warnings:** Channels can also surface missing comment scopes, invalid tokens, or soon-expiring tokens before a host hits a send failure. **Reconnect** refreshes the full OAuth grant; **Fix connection** remains the lighter webhook-only repair.
- Later Connect from a property that already has an org-default writes a **property override** (`property_id` set); does **not** wipe the org default.
- **Disconnect:** removes the Meta connection and deletes synced Facebook/Instagram conversations from this inbox. Reconnect Meta to start fresh.
- **Reply windows:** Meta DMs are fully open for 24 hours after the guest's last inbound message. After that, but before 7 days have passed, the composer can still send only when the operator explicitly enables the non-promotional **support follow-up** toggle (`HUMAN_AGENT`). Past 7 days, Meta DMs stay fully read-only until the guest messages again. Instagram **private comment replies** are similarly limited to 7 days from the comment; the Private reply button hides automatically once that window closes. Public (visible) comment replies have no time limit.
- **Older history loading:** thread list scrolling paginates only the conversations already stored in Kame. Once the local list is exhausted, older Meta history requires an explicit **Load older from Meta** action instead of silently running a live backfill from scroll position.
- **Error states:** a failed thread fetch now renders a retryable load error instead of falling back to the generic empty state. A failed message fetch keeps the current conversation visible and shows an inline **Retry** banner inside the thread pane.
- Query/body: `property_id` on inbox edge functions; auth via `verifyPropertyAccess` + `inbox:*`.
- **Message body rendering:** plain `body_text` is parsed client-side into rich blocks via shared `ChatRichBody` / `ChatMessageBubble`.

## API reference

| Function                  | Notes                                                          |
| ------------------------- | -------------------------------------------------------------- |
| `meta-inbox-*`            | OAuth / status / disconnect / backfill — require `property_id` |
| `meta-inbox-resubscribe`  | Re-verify + repair Page webhook in place (`inbox:manage`)      |
| `social-inbox-threads`    | Scoped list                                                    |
| `social-inbox-messages`   | Messages / mark read / edit / unsend                           |
| `social-inbox-send`       | Replies; optional `useHumanAgentTag` for 24h–7d Meta DMs       |
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
