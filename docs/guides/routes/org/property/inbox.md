---
title: 'Property Guest Inbox'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-22
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
- Q: Why does an Instagram chat say Guest?
  A: We load the sender’s Instagram username from Meta. Open the thread once (or wait for their next message) if an older conversation still shows Guest.
- Q: What does Disconnect do?
  A: Disconnect removes the Meta connection and deletes synced Facebook/Instagram conversations from this inbox. You can reconnect again to view and load conversations.
- Q: What should I put in **Tone & rules** under Manage AI response?
  A: Only extra tone or rules. Property details, rates, availability, booking info, and Quick replies are already used automatically — tap the **?** next to the label for that reminder.
- Q: How do I send my guest their approved GAF, a calendar link, or a link to check their security deposit refund?
  A: Tap the **Share** icon (next to Quick reply and Suggest) in the composer. Pick a property link (Property page, Calendar, Chat with host) or search for the guest's booking to insert Stay Guide, Approved GAF, Approved Pet Form, Parking Endorsement, Pay Parking, Security Deposit Refund, or Leave a Review links — whichever apply to that booking's current status and documents.

**Plan gating:** Manual replies and **Manage AI response** stay free. Enabling **Send automatically** requires **`aiChatAutoReply`** (Automation tab pre-flight + **`social-inbox-settings`** PATCH). Runtime auto-reply skips when the property plan lacks the feature; org-level contexts without a property id use **`requireOrgPropertyFeature`** / **`orgHasPropertyWithFeature`** on the server.

## Permissions

| Permission     | UI                                                                    |
| -------------- | --------------------------------------------------------------------- |
| `inbox:view`   | Open inbox, read threads                                              |
| `inbox:reply`  | Send replies, AI suggest                                              |
| `inbox:manage` | Channels connect/disconnect, quick replies, automation, full backfill |

## Behavior

- **Manage actions:** Desktop (`lg+`) shows separate header buttons — **Channels**, **Quick replies**, **Automation** — each opening its modal. Mobile (`max-lg`) groups them in the hero **Inbox actions** menu (bottom sheet).
- **Channel order:** Inbox tabs, quick-reply filters/groups, and automation platform toggles use **All** (when present), then **Chat**, **Facebook**, **Instagram**.
- **Manage AI response:** textarea label is **Tone & rules**; a **?** tooltip explains that property facts and Quick replies are already injected. **Reset to default** restores the shipped starter copy.
- **View property** on web threads → admin property dashboard (`propertyDashboardPath`), not the public listing.
- **First Meta connect** from a property (when no org-default Page exists) writes the **org-default** connection so Marketing Studio and other properties can inherit it.
- **Webhook health:** connected Meta rows record `webhook_last_verified_at` and retry attempts. After repeated failed checks, Channels shows **Fix connection**, which re-verifies and re-subscribes the messaging webhook fields in place — without disconnecting or wiping history.
- **Proactive Meta warnings:** Channels can also surface invalid tokens or soon-expiring tokens before a host hits a send failure. **Reconnect** refreshes the full OAuth grant; **Fix connection** remains the lighter webhook-only repair.
- Later Connect from a property that already has an org-default writes a **property override** (`property_id` set); does **not** wipe the org default.
- **Disconnect:** removes the Meta connection and deletes synced Facebook/Instagram conversations from this inbox.
- **Meta connect / sync / disconnect progress:** while the first conversation backfill runs after connect, or while disconnect is processing, a **non-dismissible** modal covers the inbox with title, “may take a few minutes” copy, animated progress, and (during sync) a loaded-conversation count. Outside click, Escape, and close are blocked until the operation finishes. **Channels**, page picker, and other manage modals **close automatically** so only this progress modal is visible (OAuth return shows a toast, not Channels).
- **Channels list:** Meta only (Facebook Messenger + Instagram DMs). TikTok / Airbnb messaging are not offered (API partnership / approval barriers).
- **Reply windows:** Meta DMs are fully open for 24 hours after the guest's last inbound message. After that, but before 7 days have passed, the composer can still send only when the operator explicitly enables the non-promotional **support follow-up** toggle (`HUMAN_AGENT`). Past 7 days, Meta DMs stay fully read-only until the guest messages again.
- **Older history loading:** thread list scrolling paginates only the conversations already stored in Kame. Once the local list is exhausted, older Meta history requires an explicit **Load older from Meta** action instead of silently running a live backfill from scroll position.
- **Error states:** a failed thread fetch now renders a retryable load error instead of falling back to the generic empty state. A failed message fetch keeps the current conversation visible and shows an inline **Retry** banner inside the thread pane.
- Query/body: `property_id` on inbox edge functions; auth via `verifyPropertyAccess` + `inbox:*`.
- **Instagram sender names:** DM threads store the guest’s Instagram username (or name when Meta sends one). Opening a thread that still says **Guest** (legacy webhook rows) refetches the profile from Meta and updates the list.
- **Message body rendering:** plain `body_text` is parsed client-side into rich blocks via shared `ChatRichBody` / `ChatMessageBubble`.
- **Share resources:** the composer's **Share** icon (`InboxShareResourcesPicker`) inserts a plain URL into the draft — no new message/attachment type. A Property section (Property page, Calendar, Chat with host) is always available; a Booking section lets the host search this property's bookings, then shows only the links that apply to the picked booking's status/documents (Stay Guide, Approved GAF, Approved Pet Form, Parking Endorsement, Pay Parking, Security Deposit Refund, Leave a Review). Every inserted link renders as a tap card via the existing `urlLinkCardMeta()` path matchers — works identically on Web, Facebook, and Instagram sends.
- **Calendar tap-to-modal:** a "Check availability" calendar link card, when tapped in either the host bubble here or the guest's own web chat widget, opens the property's availability calendar in an in-place modal (`BookingCalendarModal`) instead of navigating to a new tab.
- **Approved GAF / Pet share links:** these two PDFs live in private Storage buckets, so their share links use a durable per-booking `document_share_token` (mirrors the Stay Guide token) — a fresh signed Storage URL is minted server-side on every visit, so the link keeps working long after any individual signed URL would expire. Auto-issued the first time a host opens the Share picker on a booking with an approved document. Parking Endorsement is a public bucket URL and needs no token.

## API reference

| Function                             | Notes                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `meta-inbox-*`                       | OAuth / status / disconnect / backfill — require `property_id`                          |
| `meta-inbox-resubscribe`             | Re-verify + repair Page webhook in place (`inbox:manage`)                               |
| `social-inbox-threads`               | Scoped list                                                                             |
| `social-inbox-messages`              | Messages / mark read / edit / unsend                                                    |
| `social-inbox-send`                  | Replies; optional `useHumanAgentTag` for 24h–7d Meta DMs                                |
| `social-inbox-templates`             | Quick reply CRUD (`inbox:manage` + `property_id`)                                       |
| `social-inbox-settings`              | Automation GET/PATCH (`inbox:manage` + `property_id`)                                   |
| `social-inbox-ai-suggest`            | AI draft (`inbox:reply` + `property_id`)                                                |
| `issue-booking-document-share-token` | Issue/reuse the GAF/Pet share token for a booking (`bookings:workflow` + `property_id`) |
| `get-guest-booking-document`         | Public GET — resolves `?token=&doc=gaf\|pet` to a fresh signed URL                      |

## Implementation map

| Area                         | Path                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Page                         | `ui/src/features/dashboard/inbox/pages/PropertyInboxPage.tsx`                                                                         |
| Shell                        | `ui/src/features/dashboard/inbox/pages/InboxPage.tsx`                                                                                 |
| Scope                        | `supabase/functions/_shared/metaInboxScope.ts`, `inboxAccess.ts`                                                                      |
| Auth                         | `resolveInboxAccess` — property or parking only                                                                                       |
| Share picker                 | `ui/src/features/dashboard/inbox/components/InboxShareResourcesPicker.tsx`, `lib/inboxShareBookingItems.ts`                           |
| Calendar tap-to-modal        | `ui/src/components/chat/ChatUrlLinkCard.tsx` (`onActivate`), `ChatRichBody.tsx` (`onCalendarLinkClick`), `ChatMessageBubble.tsx`      |
| Rich link card titles        | `ui/src/lib/chat/parseChatRichBlocks.ts#urlLinkCardMeta`                                                                              |
| GAF/Pet document share token | `supabase/functions/_shared/bookingDocumentShareToken.ts`, `issue-booking-document-share-token/`, `get-guest-booking-document/`       |
| Admin document share hook    | `ui/src/features/dashboard/bookings/hooks/useBookingDocumentShareLink.ts`                                                             |
| Guest resolver page          | `ui/src/features/guest/booking-documents/pages/GuestBookingDocumentPage.tsx` — see [[guest-booking-document\|Guest booking document]] |
| Migration                    | `supabase/migrations/20261102130000_booking_document_share_token.sql`                                                                 |

## Related

- [Parking Inbox](../parking/inbox.md)
- Legacy org inbox URL redirects to Properties
