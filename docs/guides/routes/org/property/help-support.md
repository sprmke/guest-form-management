---
title: 'Property Help & Support'
status: active
tags: [guides, routes, org, property, help-support]
updated: 2026-08-17
---

# Property Help & Support

Route: `/org/:orgSlug/property/:propertySlug/help-support` (+ `/docs`, `/tickets`, `/tickets/new`, `/tickets/:ticketId`)

> **Status:** Documented

## Progress overview

| Section       | E2E | Validation | Docs | Notes                                         |
| ------------- | --- | ---------- | ---- | --------------------------------------------- |
| Overview      | Yes | N/A        | Yes  | Quick actions + FAQ accordion                 |
| Documentation | Yes | N/A        | Yes  | Read-only, reuses AI assistant knowledge base |
| AI Chat       | Yes | N/A        | Yes  | Opens the existing assistant panel, no new UI |
| My tickets    | Yes | N/A        | Yes  | Lists the caller's own submitted tickets      |
| Submit ticket | Yes | Yes        | Yes  | 4 categories, 0–3 attachments on bug reports  |
| Ticket detail | Yes | Yes        | Yes  | Reply thread; no per-message threading        |

## Overview

Property team members open Help & Support to browse documentation, chat with the AI assistant, and file support tickets with the Kame Homes team — bug reports, feature suggestions, general questions, or business inquiries. Visible to **every** team member regardless of role (same baseline as Dashboard), not gated behind a specific permission.

## Host-facing knowledge

This is where you go if you're stuck, found something broken, or want to ask us something directly. It has documentation for every page, a button to chat with the AI assistant, and a place to file a ticket with our team.

**Common host questions**

- Q: How do I report a bug?
  A: Go to Help & Support → Submit a ticket → choose "Bug report", describe what happened, and attach a screenshot or short video if you can. Our team gets notified right away.
- Q: How do I know when someone replies to my ticket?
  A: You'll get an email, and you can also check "My tickets" any time to see the latest status and read the full conversation.
- Q: Can I attach a video to a bug report?
  A: Yes — bug reports can include up to 3 files (screenshots or short videos, up to 20 MB each).
- Q: What's the difference between the AI Assistant and submitting a ticket?
  A: The AI Assistant answers questions about your bookings and data instantly. A ticket goes to our actual support team — use it for bugs, feature ideas, or anything the assistant can't help with.
- Q: Do I need a specific role to see Help & Support?
  A: No — every team member can see it, the same as the Dashboard.

## Overview page

### Sections

Four quick-action cards (Documentation, Ask the AI Assistant, My tickets, Submit a ticket) followed by a searchable FAQ accordion grouped by category.

### Behavior / edge cases

"Ask the AI Assistant" doesn't navigate — it calls `openAiAssistant()` (external-store pattern), which opens the existing assistant slide-over panel already mounted in `AdminLayoutShell`.

## Documentation

### Sections

Search box + module-grouped accordion of articles. Articles are the Host-facing knowledge Q&A sections from every route guide (this one included), synced by `scripts/sync-ai-knowledge-base.ts` into `ai_dashboard_assistant_knowledge_base`. Super-admin-only guides (`docs/guides/routes/admin/**`) are excluded.

## Submit a ticket

### Fields

| Field              | Category           | Storage                              | Validation                            |
| ------------------ | ------------------ | ------------------------------------ | ------------------------------------- |
| Subject/Title      | all                | `support_tickets.subject`            | Required, ≤200 chars                  |
| Description        | all                | first `support_ticket_messages`      | Required, ≤5000 chars                 |
| Severity           | Bug report         | `category_fields.severity`           | low / medium / high                   |
| Page URL           | Bug report         | `category_fields.page_url`           | Auto-filled, editable                 |
| Browser info       | Bug report         | `category_fields.browser_info`       | Auto-filled, hidden                   |
| Attachments        | Bug report         | Storage `support-ticket-attachments` | 0–3 files, image or video, 20 MB each |
| Expected benefit   | Feature suggestion | `category_fields.expected_benefit`   | Optional                              |
| Contact preference | Business inquiry   | `category_fields.contact_preference` | Optional                              |

### Save path

1. Host attaches files (if any) → **`upload-support-ticket-attachment`** (POST, multipart) → private storage path returned.
2. Submit → **`submit-support-ticket`** (POST) → creates `support_tickets` row + first `support_ticket_messages` row (`sender_type='host'`).
3. Team notify email sent to `SUPPORT_TEAM_EMAIL` (best-effort — failure doesn't block submission).

## My tickets / ticket detail

Lists the caller's own submitted tickets with a status badge (Open / In progress / Resolved / Closed). Detail view shows the full reply thread and a composer to add another message; replying to a resolved/closed ticket reopens it to "In progress".

## API reference

| Action              | Endpoint                                |
| ------------------- | --------------------------------------- |
| List articles       | `GET list-help-center-articles`         |
| List FAQs           | `GET list-help-center-faqs`             |
| Submit ticket       | `POST submit-support-ticket`            |
| List my tickets     | `GET list-support-tickets`              |
| Get ticket + thread | `GET get-support-ticket`                |
| Reply to ticket     | `POST reply-support-ticket`             |
| Upload attachment   | `POST upload-support-ticket-attachment` |

## Implementation map

| Concern            | Path                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Pages              | `ui/src/features/dashboard/help-support/pages/*.tsx`                                                                                 |
| Components         | `ui/src/features/dashboard/help-support/components/*.tsx`                                                                            |
| Hooks              | `ui/src/features/dashboard/help-support/hooks/*.ts`                                                                                  |
| API client         | `ui/src/features/dashboard/help-support/lib/supportTicketApi.ts`                                                                     |
| Edge functions     | `supabase/functions/{submit,list,get,reply}-support-ticket*`, `upload-support-ticket-attachment`, `list-help-center-{articles,faqs}` |
| Scope resolution   | `supabase/functions/_shared/supportTicketScope.ts`                                                                                   |
| Route registration | `ui/src/features/dashboard/help-support/routes/index.tsx`                                                                            |

## Related docs

- [Route index](../../README.md)
- [Org Help & Support](../help-support.md)
- [Parking Help & Support](../parking/help-support.md)
- [Super-admin ticket management](../../admin/support.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)
- [`docs/workflow/in-progress/help-support-center.md`](../../../workflow/in-progress/help-support-center.md)

## Pending / follow-ups

- [ ] Super-admin ticket reply/status UI is at `/admin/support` — see [admin/support.md](../../admin/support.md).
