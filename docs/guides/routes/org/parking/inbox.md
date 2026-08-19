---
title: 'Parking Guest Inbox'
status: active
tags: [guides, routes, org, parking]
updated: 2026-08-17
---

# Parking Guest Inbox

Route: `/org/:orgSlug/parking/:parkingSlug/inbox`

> **Status:** Documented

## Progress overview

| Section  | E2E | Validation | Docs | Notes                                                           |
| -------- | --- | ---------- | ---- | --------------------------------------------------------------- |
| Messages | Yes | Yes        | Yes  | Meta = effective connection; Web empty until parking guest chat |
| Channels | Yes | Yes        | Yes  | Inherit org Meta or connect parking override                    |

## Overview

Parking operators open Guest Inbox for this slot. **Meta** uses the effective Page (parking override or org default with **Using org Meta**). **Web** is scoped by `parking_id` — guest parking web chat is not shipped yet, so the Web tab stays empty until that surface exists.

Quick replies and Automation are managed on a **property** Guest Inbox (org-scoped data), not on parking.

---

## Host-facing knowledge

Parking **Guest Inbox** lets you answer Facebook (and Instagram when connected) messages for this slot. By default you inherit the organization’s connected Facebook Page; you can connect a different Page here if this parking listing should have its own Messenger inbox. **Website chat for parking guests is not available yet**, so the Web tab will stay empty for now. Saved quick replies and AI automation are managed from a **property** inbox under Manage.

**Common host questions**

- Q: Will I see the same Facebook messages as other properties using the shared Page?
  A: If you use the org’s Page (shown as “Using org Meta”), yes, it’s the same Page inbox. Connecting a different Page here gives this slot its own thread list.
- Q: Why is the Web tab empty?
  A: On-site chat for parking listings is not shipped yet. Messenger is the live channel today when Meta is connected.
- Q: Where do I edit canned replies or turn on auto-reply?
  A: Open any **property** Guest Inbox → **Manage** → Quick replies or Automation. Those settings apply org-wide.
- Q: Why does Channels show Fix connection?
  A: The saved Meta Page is still attached, but Meta may have dropped this app's webhook subscription. Use **Fix connection** to re-subscribe the Page without removing the parking inbox history.
- Q: What happens if I disconnect Meta here?
  A: Disconnect now stops syncing by default but keeps past Meta conversations visible read-only. Only the extra delete option in the dialog permanently removes that synced history.
- Q: Why can I sometimes still reply after the normal Meta window closes?
  A: For 24h-7d-old Meta DMs, the composer can show a support follow-up toggle. That uses Meta's `HUMAN_AGENT` tag and should only be used for non-promotional follow-ups.

---

## Permissions

| Permission     | UI                                      |
| -------------- | --------------------------------------- |
| `inbox:view`   | Open inbox, read threads                |
| `inbox:reply`  | Send replies, AI suggest                |
| `inbox:manage` | Connect / disconnect Meta Page override |

## Behavior

- Connect Meta writes override rows with `parking_id`; does not wipe org default.
- Connected Meta rows are re-verified in the background; after repeated failures, Channels shows **Fix connection** to repair the webhook subscription without disconnecting.
- Channels can also warn when the saved Meta token is invalid, expiring soon, or missing the comment-reply scope. **Reconnect** refreshes the OAuth grant; **Fix connection** only repairs webhook subscription health.
- Disconnect is non-destructive by default: it clears the live Meta connection but leaves synced conversations/messages visible read-only until the slot reconnects.
- The Disconnect dialog has an opt-in delete path for permanently removing the synced Meta history, matching the previous destructive behavior.
- Meta DMs use a two-step reply window: normal replies for 24 hours after the guest's last message, then an explicit operator-only **support follow-up** path for 24h-7d-old DMs using `HUMAN_AGENT`. After 7 days, DMs stay read-only until the guest messages again. Instagram **private comment replies** have a 7-day window from the original comment; the Private reply button is hidden once that window closes. Public comment replies have no time limit.
- Thread list scrolling now paginates only inbox history already stored in Kame. If Meta still has older history after the local list ends, hosts must click **Load older from Meta** to backfill more threads instead of triggering live sync by scrolling.
- Failed thread loads now show a retryable load error instead of the generic empty state. Failed message loads show an inline **Retry** banner in the conversation pane so hosts can distinguish fetch issues from genuinely empty history.
- Query/body: `parking_id`; auth via `verifyParkingTeamAccess` + `inbox:*`.

## Implementation map

| Area  | Path                                                             |
| ----- | ---------------------------------------------------------------- |
| Page  | `ui/src/features/dashboard/inbox/pages/ParkingInboxPage.tsx`     |
| Shell | `ui/src/features/dashboard/inbox/pages/InboxPage.tsx`            |
| Scope | `supabase/functions/_shared/metaInboxScope.ts`, `inboxAccess.ts` |

## Related

- [Org Inbox](../inbox.md)
- [Property Inbox](../property/inbox.md)
