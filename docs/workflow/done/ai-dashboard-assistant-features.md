---
title: 'AI Dashboard Assistant — Feature List'
status: v1 shipped
tags: [workflow, done, ai, reference]
updated: 2026-08-19
---

# AI Dashboard Assistant — what shipped

A companion reference to [`ai-platform-hardening-handoff.md`](./ai-platform-hardening-handoff.md) (full build log) and [`ai-dashboard-assistant.md`](./ai-dashboard-assistant.md) (original design plan). This doc lists **what the feature actually does today**, in plain terms, for anyone who wasn't in the build sessions. Manual test flows: [`docs/guides/testing/ai-dashboard-assistant-manual.md`](../../guides/testing/ai-dashboard-assistant-manual.md).

## What it is

A chat assistant embedded in the admin dashboard. Hosts and property managers can ask natural-language questions about their operational data and, for a fixed set of actions, ask the assistant to make changes — with guardrails that scale to how risky the action is.

## Core capabilities

### 1. Ask questions about live data (read-only, always allowed)

- **Search the knowledge base** — "how does PENDING_DOCUMENTS work?", "what does Ready for Check-in mean?" — answered from the 219 Q&A entries synced from the 67 operator route guides, not the model's memory.
- **Look up a single booking** — status, guest name, dates, property, balance due, and files already on the booking (approved GAF, receipts, IDs) as in-chat previews.
- **List bookings** — filtered by property, status, or date range.
- **See what a booking can do next** — the exact set of status transitions available right now, same source of truth the workflow panel uses.
- **Guide a booking through remaining steps** — a stepper that matches the booking pipeline (done / current / upcoming). Confirming the current step still uses the same Confirm card as any other status move — it does not batch the whole journey.
- **Dashboard stats** — check-ins/check-outs/occupancy for a property or the whole org.
- **Finance summary** — income, expenses, net for a property (only visible to users with finance access).
- **Finance bookings list** — bookings with finance figures for a property.
- **Maintenance summary** — open/completed maintenance items for a property (only visible to users with maintenance access).
- **Maintenance items list** — scheduled maintenance for a property.

None of these can ever modify data — they're wired so a read tool physically cannot call the booking-transition machinery.

### 2. Take action, with three levels of trust

Every action the assistant can propose is automatically classified into one of three tiers **by reading the same rules the rest of the app already enforces** — never by asking the AI model to judge its own risk:

| Tier                            | What it means                                                                                                                                                                                          | Example                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **Tier 0 — Read**               | No confirmation, ever — it's just a question.                                                                                                                                                          | "How many bookings are pending review?"                                                |
| **Tier 1 — Done automatically** | A safe, forward, non-financial action executes immediately; the assistant tells you it did it.                                                                                                         | "Move this booking to Ready for Check-in" (once documents are ready, no price changes) |
| **Tier 2 — Needs your OK**      | Anything destructive, a backward/override move, anything touching money, or anything on a booking you're not currently looking at — the assistant proposes it and waits for an explicit Confirm click. | "Cancel this booking", any refund finalization, any price/deposit change               |

Concretely, the actions available today:

- **Re-run receipt validation** on a booking (idempotent AI re-check — Tier 1).
- **Move a booking to a new status** (Tier 1 if it's a plain forward step with no price change; Tier 2 if it involves money, a status override/rollback, or a cancellation).
- **Cancel a booking** (always Tier 2, no exceptions).

If the assistant tries to act on a booking or property the host isn't currently viewing, or bundles more than one write action into a single request, that also automatically escalates to Tier 2 — "confirm before we touch something you didn't ask about."

### 3. Guardrails that don't trust the AI model

- Every tool independently re-checks the requesting user's actual permissions against the database — the model asking for something is never sufficient on its own.
- Immediately before any action executes (whether auto-run or confirmed), the risk tier is **recomputed from the booking's current status** — not the status from when the action was first proposed. If anything changed in between, the mismatch blocks execution.
- Every chat response is checked that its numbers and facts actually came from real data loaded for that request — not invented by the model.
- A confirmed Tier-2 action can only be executed once, by the same person who asked for it, through a separate confirm step — never as a side effect of the model "changing its mind" or a retried request.
- Tier-2 proposals expire after 15 minutes if nobody confirms them.

### 4. Where you see it

- A floating assistant button on every admin dashboard page (org, property, and parking admin views) — hidden on super-admin pages and hidden entirely if the assistant isn't turned on.
- A slide-over chat panel: ask a question, get an answer rendered as readable cards (booking cards, stat lists, tables, links, file previews, photos, a booking-journey stepper, suggested follow-up chips) — never raw text dumps or hallucinated HTML.
- **Starter prompts:** new chat centers a **Questions / Actions** mode switch (filled teal pill, not page tabs) and **5 randomized** prompt cards. Tapping one sends it as a message. The pool covers bookings, finance, maintenance, parking, inbox, marketing, team, pricing, Help & Support, and Telegram — mapped to tools that exist (or knowledge-base how-tos).
- **Composer attachments + context pin:** paperclip menu (Photo / File) and a **module quick-picker** beside the message box. The picker follows the page you are on (calendar on Bookings, building on Properties, wrench on Maintenance, and so on). **Search all modules…** at the bottom of that list (or **Cmd/Ctrl+K**) opens a grouped search across modules. Pinning adds a chip (`attachedContext`); it does not replace the page you are on. You can pin more than one item (up to 8), including mixed types if you switch pages or search across modules.
- **Context pickers by module** (icon on that page's composer):
  - Bookings / dashboard — stays, grouped by check-in month
  - Properties / plans / settings — properties
  - Team — org, property, or parking members
  - Finance — income/expense rows
  - Maintenance — reminders
  - Parking bookings — parking stays
  - Inbox — conversations, filterable by Web / Facebook / Instagram
  - Marketing — templates
  - Calendar / parking pricing — a date on the month grid
  - Notifications — Staff / Finance / Maintenance / Marketing / Admin
  - Public pages / templates — Stay guide (and any other custom pages)
  - Help & Support — tickets
- **History:** clock icon lists your chats grouped by day, with search. Titles wrap (UUIDs stripped for the preview). Trash deletes that conversation after confirm — only yours, and it cannot be undone.
- Every proposed action renders as a card with **Confirm** / **Cancel** buttons; once resolved it flips to "done automatically" / "cancelled" / "expired" so the history stays readable.
- **Canvas:** a long table (more than 8 rows) or a booking-journey stepper shows a compact card in the thread with **Open**. On a laptop the sheet widens and the canvas sits beside chat; on a phone the canvas replaces chat until **Back**. Suggested chips **fill** the message box — they do not send.
- **Booking detail pages** show a read-only "Actions taken by AI assistant" trail — every automatic or confirmed action taken on that specific booking, with when and what.

### 5. Who controls it

- **Platform-wide switch** (super-admin) — turns the assistant off everywhere in one click, independent of every other AI feature in the app.
- **Per-org switch** (org owner/admin) — each organization opts in; off by default.
- **Per-property opt-out** — an org can enable the assistant overall but exclude specific properties.
- **Daily and monthly message limits** + **daily write-action limit** per org, configurable in org settings — hitting the limit shows a friendly "upgrade for more" message instead of failing.

## What it can't do (by design, not by accident)

- No parking **broadcast** fan-out from chat (claim/decline of a single parking stay is available).
- Attached files are sent to the model on the turn they are uploaded, not replayed on later messages in the same thread.
- No direct editing of arbitrary booking fields (guest info, pricing line items outside a status-change payload) — those backend endpoints don't exist yet, so there's nothing for the assistant to wrap.
- No cross-organization actions, ever.
- No unattended/scheduled runs — every action is a direct result of something a signed-in user typed.
- No real-time token streaming — replies arrive as a complete message, not word-by-word.
