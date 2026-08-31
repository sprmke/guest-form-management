---
title: 'AI dashboard assistant — manual test flows'
status: active
tags: [guides, testing, ai]
updated: 2026-08-27
---

# AI dashboard assistant — step-by-step manual testing

Manual E2E for the chat assistant embedded in the admin dashboard (org/property/parking admin views).

**Feature summary:** [`docs/workflow/done/ai-dashboard-assistant-features.md`](../../workflow/done/ai-dashboard-assistant-features.md)
**Build log / architecture:** [`docs/workflow/done/ai-platform-hardening-handoff.md`](../../workflow/done/ai-platform-hardening-handoff.md)
**Original design plan:** [`docs/workflow/done/ai-dashboard-assistant.md`](../../workflow/done/ai-dashboard-assistant.md)

This flow has **never been run through an actual browser** as of 2026-08-15 — every check so far was curl + real Gemini calls + DB queries against the edge functions directly (§8 below has the exact commands). **Run §1–§7 in a real browser before trusting the UI.**

---

## 0. What you are proving

| #   | Capability                 | Pass criteria                                                                                                                                                                                                                       |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Launcher visibility        | Floating button appears only when both kill switches are on for the org (and property, if scoped); hidden on `/admin/*`                                                                                                             |
| 2   | Tier-0 read                | A plain question returns a grounded answer with no confirmation UI                                                                                                                                                                  |
| 3   | Tier-1 auto-execute        | A safe forward status move executes immediately with a "done automatically" card                                                                                                                                                    |
| 4   | Tier-2 propose → confirm   | A risky action (cancel, refund finalize, price change, override) shows Confirm/Cancel and only runs after Confirm                                                                                                                   |
| 5   | Tier-2 deny                | Clicking Cancel leaves the booking untouched and marks the card "cancelled"                                                                                                                                                         |
| 6   | Tier-2 idempotency         | Confirming an already-resolved action is a clean no-op, never a double-execute                                                                                                                                                      |
| 7   | Tier-2 expiry              | A proposal older than 15 minutes can no longer be confirmed                                                                                                                                                                         |
| 8   | Permission re-check        | A low-permission (**Read Only** template) property member cannot get a write action to execute, even if the model tries                                                                                                             |
| 9   | Cross-scope escalation     | Asking about a _different_ booking/property than the one currently open always requires confirmation                                                                                                                                |
| 10  | Bulk escalation            | A request that bundles 2+ write actions in one turn always requires confirmation, regardless of each action's own tier                                                                                                              |
| 11  | Booking-detail audit trail | Actions taken on a booking show up in its "Actions taken by AI assistant" card, newest first                                                                                                                                        |
| 12  | Org/global kill switch     | Turning either off removes the launcher; turning back on restores it                                                                                                                                                                |
| 13  | Per-property opt-out       | Disabling the assistant on one property hides the launcher only there, not org-wide                                                                                                                                                 |
| 14  | Quota                      | Hitting the daily message limit shows the upgrade message instead of erroring                                                                                                                                                       |
| 15  | Mobile 375px               | Launcher + slide-over panel usable at iPhone SE width, 44×44px targets                                                                                                                                                              |
| 16  | Starter prompts            | Empty chat shows a Questions / Actions switcher (not page tabs), 5 randomized items for the active side                                                                                                                             |
| 17  | Attachments + booking pin  | Paperclip attaches JPEG/PNG/WebP/PDF; calendar pins a stay; send works with files and no text                                                                                                                                       |
| 18  | Speech-to-text             | Mic fills the composer on Chrome/Safari/Edge (HTTPS); primary listening state; tap again to stop; send clears listening                                                                                                             |
| 19  | Turn progress + streaming  | While waiting: phased/tool checklist (not bare dots); text answer streams in before cards finalize; multi-tool turns show “What I did” timeline                                                                                     |
| 20  | Cancel + regenerate        | Stop icon aborts in-flight turn; cancel before Tier-1 commit leaves no app writes; partial commit shows applied-changes banner; Regenerate on last assistant message re-runs prior text turn (not available after attachment sends) |
| 21  | Usage meter                | Panel header shows `today / daily limit` pill; increments after a successful send                                                                                                                                                   |

---

## 1. Prerequisites

```bash
./dev.sh   # full stack: Docker + local Supabase + UI
```

- A signed-in host account that **owns** (or is org-admin of) at least one organization with at least one property that has bookings in several statuses.
- `GEMINI_API_KEYS` (or `GEMINI_API_KEY`) set in `supabase/.env.local` — real Gemini calls are required, there is no mock mode.
- Super-admin access (`ADMIN_ALLOWED_EMAILS`) to toggle the platform-wide switch.

### 1.1 Turn the assistant on

1. Sign in as super-admin → `/admin/settings` → **AI dashboard assistant** card → toggle **Enabled**.
2. Sign in as the org owner → **Settings → AI assistant** section → toggle **Assistant enabled** → **Save assistant settings**.
3. Leave the per-property disable list and quota limits at their defaults for the first pass.

---

## 2. Launcher visibility (#1, #12, #13)

1. With both switches on, open any org/property/parking admin page. Expect a floating **Sparkles** button, bottom-right.
2. Navigate to `/admin/*` (super-admin pages). Expect the button **gone**.
3. Turn the **org** switch off (Settings → AI assistant). Reload any admin page. Expect the button gone.
4. Turn the org switch back on, then add the current property to **Disable on specific properties**. Reload that property's pages → button gone; switch to a different property in the same org → button present.
5. Turn the **platform-wide** switch off (super-admin). Expect the button gone everywhere, even with the org switch on. Turn it back on before continuing.

### 2.1 Starter prompts (#16)

1. Open the assistant on a **new** conversation. Expect the starter cluster **centered** in the panel: a teal **Questions / Actions** mode switch (not a page tab bar) and **5** tappable prompt cards, ≥ 44×44px.
2. Switch to **Actions** — list swaps to 5 action starters. Tap one — it should send as a chat message (not only fill the composer). Starters can mention parking claim/decline, inbox reply, Meta publish, or a weekend rate override as well as booking moves.
3. Open **History** (clock icon). Expect past conversations only (no Questions/Actions switcher). Titles wrap inside the panel (no overflow). Long IDs are shortened. Rows group by day; search filters the list. Trash → confirm → the row is gone. Deleting the open chat starts a new one.
4. Tap **New conversation** (plus). Expect a **different** set of 5 questions and 5 actions (random, so a rare duplicate set is OK).

### 2.2 Attachments + context pin (#17)

1. Open a new chat. Expect toolbar order **bookmark (pin) → paperclip → mic (when supported) → send** beside the composer (each ≥ 44×44px). The pin icon matches the page: calendar on Bookings, building on Properties, users on Team, and so on.
2. Paperclip → **Photo** — pick a JPEG/PNG/WebP. Expect a chip above the textarea. Same for **File** with a PDF.
3. Try a 5th file or a non-allowed type — expect a short error toast, no send.
4. On Bookings, calendar → search or pick a stay grouped by check-in month (guest, dates, status). On a booking detail, **This page** is listed first. Expect a chip with guest name and dates. You can pin more than one stay. Send with the chip still pinned and empty text + a file — the turn should go through.
5. Ask the assistant to check the receipt against the pinned booking. Expect it to use that booking (and `run_receipt_validation` when you ask to validate). Pins travel as `attachedContext` and do not overwrite the current page.
6. Reload the conversation from History — user bubble should still list file names (not the raw bytes).
7. Send a question — expect a left-aligned **card bubble** with sparkles and bouncing dots (not a bare “Thinking…” line). Opening History must not show that bubble.
8. Type several lines in the composer (Shift+Enter) — text stays **left-aligned and full-width** above pin / attach / mic / send, grows up to **10 lines**, then scrolls. Enter still sends.

### 2.3 Speech-to-text (#18)

1. In Chrome or Safari on HTTPS (or localhost), open the assistant — expect a **mic** icon after paperclip.
2. Tap mic — allow microphone if prompted. Composer shows **Listening…** placeholder, primary-tint mic button, and three subtle meter bars under the icon.
3. Speak a short question; words appear while you talk (interim + final).
4. Tap mic again — listening stops; partial text stays editable.
5. Type text first, then mic — new speech appends after existing words.
6. Send — mic stops; message sends as usual.
7. Firefox or unsupported contexts — mic hidden; no broken layout.

### 2.4 Turn progress, streaming, cancel, regenerate (#19–#21)

1. Send a question that triggers tools (e.g. **"How many bookings are pending review?"**). Expect a **Working…** card with phased steps or live tool labels — not three bouncing dots.
2. On a text-heavy answer, expect prose to appear incrementally before structured cards finalize.
3. On a multi-tool turn (e.g. finance + booking lookup), expect a collapsible **What I did** timeline on the finished message and, when 2+ tools ran in one round, a **task plan** checklist.
4. While a turn is in flight, tap the composer **Stop** (square icon). Expect the wait UI to clear. On an existing thread, the conversation reloads from the server (no orphan user bubble if the turn had not finished and no Tier-1 writes were committed; if the reply had already been saved, it appears). **Tier-1 auto writes** only commit after synthesis — stopping during tools or synthesis must leave bookings/settings unchanged. Usage should not increment for a cancelled unfinished turn.
5. _(Optional hard case)_ Trigger a Tier-1 auto write (e.g. safe forward status move), then Stop during the **Applying changes** phase if visible — expect a banner listing changes already applied; booking audit should reflect partial writes.
6. After a completed text turn, hover the last assistant message — **Regenerate** appears. Tap it — the assistant reply is replaced with a new one; the user message is **not** duplicated in history. Pending Confirm cards from the prior reply are expired.
7. Send a message with an attachment, complete the turn — **Regenerate** should not be offered on that reply.
8. Open **History** while a turn is in flight and select another conversation — the in-flight turn aborts; the loaded thread is not polluted with the other reply.
9. Panel header shows a **today / daily limit** pill (e.g. `3/50`); count increments after a successful send (not after cancel of an unfinished turn).

Per-module pin (open the assistant from that page; icon ≥ 44×44px; chip appears; send a short question that should name the pinned item):

| Page                           | Expect                                                                |
| ------------------------------ | --------------------------------------------------------------------- |
| Properties / property settings | Building icon → property list; **This page** on a property admin page |
| Team                           | Users icon → members (name + email)                                   |
| Finance                        | Ticket icon → transactions grouped by month                           |
| Maintenance                    | Wrench icon → reminders                                               |
| Parking bookings               | Parking icon → parking stays by check-in month                        |
| Inbox                          | Chat icon → threads; Web / Facebook / Instagram filters               |
| Marketing                      | Template icon → templates grouped by type                             |
| Calendar / parking pricing     | Calendar icon → month grid; tapping a day pins that date              |
| Notifications                  | Bell icon → Staff / Finance / Maintenance / Marketing / Admin         |
| Public pages                   | Page icon → Stay guide                                                |
| Help & Support tickets         | Life-ring icon → tickets; **This page** on a ticket thread            |

10. Open the bookmark pin → module list first, then drill into a module. Item rows show a leading visual (guest initials, platform badge, finance amount, marketing thumb when saved, video play badge + first-scene still when available, etc.) plus a **Load more** control when the list exceeds 12 rows. **Pricing** opens a lite month grid (rates, booked, blocked) from `property-pricing` — tap a date to pin. Use the top search bar or **Cmd/Ctrl+K** for cross-module search.

---

## 3. Tier 0 — read questions (#2)

1. Open the assistant panel. Ask: **"How many bookings are pending review right now?"**
2. Expect a plain-language answer with a real number (cross-check against the bookings list) — no Confirm/Cancel buttons anywhere in the response.
3. Ask: **"What does PENDING_DOCUMENTS mean?"** — expect an answer sourced from the route-guide knowledge base, not a generic LLM explanation. If this comes back empty/generic, the `ai_dashboard_assistant_knowledge_base` table is stale — re-run `bun run sync:ai-knowledge-base` (or `:dev` against hosted dev) to re-ingest the "Host-facing knowledge" sections from `docs/guides/routes/**/*.md`. This has no automatic trigger yet — re-run it manually whenever a route guide's knowledge section changes.
4. Ask about a specific booking by ID (copy one from the bookings list): **"Tell me about booking `<id>`"** — expect a `booking_card`-style rendering: guest name, status badge, dates, property, balance.
5. Ask: **"What can I do next with booking `<id>`?"** — expect the same set of transitions the booking's own Workflow panel shows.
6. Pin a **Ready for Check-out** booking and ask **"What's pending, and how much is the SD refund?"** — expect a human status (**Ready for Check-out**, never `READY_FOR_CHECKOUT`), a real pending-task sentence (not an empty pill), and the peso refund amount.
7. Ask **"What are the booked dates for this month?"** on a property that has stays — expect a table with guest names and check-in/out dates, not a header-only empty table. If the month is empty, expect a short "no booked stays" line instead of blank rows.
8. Pin a booking that has an **Approved GAF** on the Files tab and ask **"Provide the approved GAF for this booking"** — expect a file card (PDF preview), not only a booking summary. If that booking has no approved GAF, expect a short "not on file" line (the GAF request PDF may still show if it exists).
9. Pin a booking that is mid-pipeline and ask **"Guide me through this booking's remaining steps"** — expect a compact journey card with **Open**. Opening it shows a stepper whose current stage matches the booking Workflow panel. Confirming the embedded action still round-trips `dashboard-assistant-confirm` (status on the booking changes; the stepper card updates). It must **not** move more than one stage in one confirm.

---

## 4. Tier 1 — auto-executed action (#3)

1. Find a booking in **Pending Documents** with all documents already complete (or **Pending Review** ready to advance) — check its Workflow panel first so you know what a manual click would do.
2. Ask the assistant: **"Move booking `<id>` to the next status"** (or name the target status explicitly, e.g. "Ready for Check-in").
3. Expect the response to include an `action_confirmation` card already in the **"Done automatically"** state — no buttons, just a done notice.
4. Reload the booking detail page — status should already reflect the change (workflow panel + header badge).
5. Confirm the **"Actions taken by AI assistant"** card on that booking now lists this action (§7).

If the assistant instead proposes and waits for confirmation, check whether the target transition actually involves a price/deposit field or an override edge — that's correct Tier-2 behavior, not a bug (see the tier table in the feature doc).

---

## 5. Tier 2 — propose → confirm / deny / expire (#4, #5, #6, #7)

### 5.1 Confirm path

1. Ask the assistant to **cancel** a non-terminal booking: **"Cancel booking `<id>`"**.
2. Expect a card with a summary, **Confirm** and **Cancel** buttons, status "proposed" — the booking must **not** be cancelled yet. Verify on the bookings list.
3. Click **Confirm**. Expect the card to flip to a resolved state and the booking to actually show `CANCELLED` after a refresh.
4. Click **Confirm** again (or refresh and try) — expect nothing to happen a second time (no error, no double-cancel); the card should already read as resolved.

### 5.2 Deny path

1. Propose another Tier-2 action (e.g. cancel a different booking).
2. Click **Cancel** on the card instead of Confirm.
3. Expect the card to show a "cancelled — no changes made" state and the booking's actual status to be untouched.

### 5.3 Expiry (optional — needs a 15-minute wait or a DB edit)

1. Propose a Tier-2 action but don't resolve it.
2. Either wait 15 minutes, or in the local DB: `update ai_dashboard_assistant_pending_actions set expires_at = now() - interval '1 minute' where status = 'pending';`
3. Click **Confirm** on the stale card (or resend the same request). Expect a clear "this action expired" response, not a silent failure or a stale execute.

---

## 6. Guardrails (#8, #9, #10)

### 6.1 Permission re-check

1. Create (or use) a property-team member on the **Read Only** template (or a custom set without `bookings.detail.workflow:edit`).
2. Sign in as that member, open the assistant, and ask it to move or cancel a booking.
3. Expect a plain refusal ("access restricted" wording) — **never** a Confirm/Cancel card. The point is the tool executor rejects it server-side even if the model attempted the call; a card here would mean the RBAC re-check isn't wired correctly.

### 6.2 Cross-scope escalation

1. Open a booking detail page for booking **A** (so `pageContext.bookingId` = A).
2. In the assistant, ask it to move a **different** booking, **B**, that would otherwise qualify as Tier 1 (safe forward, no price change).
3. Expect it to require confirmation anyway — the mismatch between the open booking and the target booking forces Tier 2.

### 6.3 Bulk escalation

1. From a page with no specific booking open, ask the assistant to do two write actions in one message, e.g. **"Move booking `<id1>` to the next status and re-run receipt validation on booking `<id2>`"**.
2. Expect **both** actions to require confirmation, even if each individually would normally auto-execute.

---

## 7. Booking-detail audit trail (#11)

1. Open the detail page for a booking that had at least one Tier-1 or confirmed Tier-2 action taken via the assistant in this session.
2. Scroll the **Stay** tab — expect an **"Actions taken by AI assistant"** card below the booking meta card, listing each action (label, done-automatically vs. host-confirmed, timestamp), newest first.
3. Open a booking that's never had an assistant action — expect the card to be absent entirely, not an empty state.

---

## 8. Quota (#14)

1. Org Settings → AI assistant → set **Daily message limit** to `1` → Save.
2. Send one message in the assistant (uses up the day's quota).
3. Send a second message. Expect a friendly "you've hit today's message limit" response instead of an error or a hang.
4. Reset the limit back to a normal value (e.g. `50`) when done.

---

## 9. Mobile (#15)

1. Resize to 375×667 (iPhone SE) or use device emulation.
2. Confirm **Assistant** is a bottom tab (not a floating button overlapping the dock) and is at least 44×44px. Tap it — the same slide-over opens.
3. Open the panel — it should be wider than a typical `md` sheet on desktop (`sm:max-w-xl` when chat-only), composer stays one row (pin, attach, mic when supported, send) and reachable above the keyboard, Confirm/Cancel buttons are each ≥44px tall.
4. Scroll a long conversation — thread scrolls independently of the page.
5. **Canvas:** ask for a booking journey (or a table with more than 8 rows). At **375** and **768**, **Open** replaces the chat; **Back** returns to the thread with composer text still there. At **1024+**, the sheet widens, canvas is on the left, chat (~24rem) stays on the right. Suggested chips fill the composer and do not send.

---

## 10. API-level smoke test (what's actually been verified so far)

No browser pass exists yet — this is the exact curl-based verification already run against local Supabase, useful for a fast backend-only regression check without touching the UI. Requires local Supabase (`bun run start:supabase` + `bun run dev:api`) and a self-minted local JWT (HS256, signed with the local `JWT_SECRET` from `bun run status:supabase`) for a known org owner.

```bash
JWT=<self-minted local JWT>
ANON=<local anon key from `bun run status:supabase`>

# Enable both kill switches first (see §1.1) via
#   PATCH dashboard-assistant-global-settings   { "enabled": true }
#   PATCH dashboard-assistant-settings?org_slug=<slug>   { "enabled": true }
# and the underlying Phase-A platform gate:
#   PATCH ai-platform-global-settings   { "allowedFeatures": ["dashboard_assistant", ...] }
#   PATCH ai-platform-settings?org_slug=<slug>   { "enabled": true }

# Tier-0 read
curl -s -X POST "http://127.0.0.1:54321/functions/v1/dashboard-assistant-chat" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"orgSlug":"<slug>","pageContext":{},"message":"How many bookings are pending review right now?"}'

# Tier-0 booking journey (expect a stepper in blocks, no status change)
curl -s -X POST "http://127.0.0.1:54321/functions/v1/dashboard-assistant-chat" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"orgSlug":"<slug>","pageContext":{"bookingId":"<id>"},"message":"Guide me through this booking remaining steps"}'

# Tier-2 propose (cancel) — note the actionId in the response
curl -s -X POST "http://127.0.0.1:54321/functions/v1/dashboard-assistant-chat" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"orgSlug":"<slug>","pageContext":{"bookingId":"<id>"},"message":"Cancel booking <id> please."}'

# Confirm — repeat this call twice; the second must return alreadyResolved:true, not a double-cancel
curl -s -X POST "http://127.0.0.1:54321/functions/v1/dashboard-assistant-confirm" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"actionId":"<actionId>","confirm":true}'
```

Pass when: the Tier-0 call returns a real number matching the DB; the propose call returns `status: "proposed"` **and does not change the booking's status**; the first confirm call flips the booking to `CANCELLED`; the second confirm call returns `{"status":"executed","alreadyResolved":true}`.
