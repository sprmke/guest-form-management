---
title: 'Super Admin Support Tickets — operator guide'
status: active
tags: [guides, routes, admin, help-support]
updated: 2026-08-17
---

# Super Admin Support Tickets — operator guide

Route: `/admin/support` (+ `/admin/support/faqs`)

> **Status:** Documented

## Progress overview

| Section              | E2E save | Validation | Docs | Notes                                      |
| -------------------- | -------- | ---------- | ---- | ------------------------------------------ |
| Ticket list          | Done     | N/A        | Done | Search + category/status filters, all orgs |
| Ticket detail dialog | Done     | Done       | Done | Reply thread + status/priority controls    |
| FAQ editor           | Done     | Done       | Done | Add/edit/reorder/publish-toggle/delete     |

---

## Overview

Platform super-admins triage every host-filed support ticket across all organizations, reply to hosts, and manage status/priority. A separate sub-page manages the curated FAQ list hosts see on their own Help & Support overview page.

**Access:** `RequireSuperAdmin` (`SUPER_ADMIN_EMAILS`), same tier as Approvals/Hosts/Developments.

---

## Host-facing knowledge

_(Platform operator, not a host — this page isn't visible to hosts.)_

The platform team reviews every ticket hosts file through their Help & Support page here, replies, and closes them out. Replying to a host sends them an email with a link back to the ticket.

**Common host questions**

- Q: How do I reply to a host's ticket?
  A: Open the ticket from the list, type your reply at the bottom of the detail panel, and send. The host gets an email notification.
- Q: Does replying change the ticket status?
  A: An "Open" ticket automatically moves to "In progress" once you reply. You can also set status and priority manually from the same panel.
- Q: How do I add or edit an FAQ?
  A: Use the "Manage FAQs" button on this page, or go directly to `/admin/support/faqs`. Add, edit, reorder (up/down arrows within a category), publish/unpublish, or delete from there.

---

## Ticket list

### Sections

Search (subject / org name / submitter email) + category filter + status filter, all applied client-side over one full ticket fetch. Responsive card list (not a literal table — the four visible fields don't gain anything from tabular columns).

### Behavior / edge cases

Clicking a ticket opens `SuperAdminTicketDetailDialog` (bottom sheet on mobile, centered dialog on desktop via `ResponsiveModal`).

## Ticket detail dialog

### Fields

| Field    | Storage                        | Validation                             |
| -------- | ------------------------------ | -------------------------------------- |
| Status   | `support_tickets.status`       | open / in_progress / resolved / closed |
| Priority | `support_tickets.priority`     | low / medium / high / none             |
| Reply    | `support_ticket_messages.body` | Required, ≤5000 chars                  |

### Save path

1. Reply → **`reply-support-ticket-admin`** (POST) → inserts a `sender_type='admin'` message, auto-reopens an `open` ticket to `in_progress`, sends `sendSupportTicketReplyNotify` to the host (best-effort).
2. Status/priority change → **`update-support-ticket-status`** (POST) → independent fields, either can be set alone.

## FAQ editor (`/admin/support/faqs`)

Category-grouped rows. Up/down arrows swap `sort_order` with the adjacent row in the same category (two `update-help-center-faq` calls). Publish toggle is a `Switch` bound directly to `is_published`. Delete asks for confirmation via `AlertDialog`. Add/edit opens a shared dialog form (category — free text with a datalist of existing categories, question, answer).

## API reference

| Action                            | Endpoint                            |
| --------------------------------- | ----------------------------------- |
| List tickets (all orgs)           | `GET list-support-tickets-admin`    |
| Get ticket + thread               | `GET get-support-ticket-admin`      |
| Reply as admin                    | `POST reply-support-ticket-admin`   |
| Update status/priority            | `POST update-support-ticket-status` |
| List all FAQs (incl. unpublished) | `GET list-help-center-faqs-admin`   |
| Create FAQ                        | `POST create-help-center-faq`       |
| Update FAQ (also reorder)         | `POST update-help-center-faq`       |
| Delete FAQ                        | `POST delete-help-center-faq`       |

## Implementation map

| Concern            | Path                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Pages              | `ui/src/features/dashboard/super-admin/pages/SuperAdminSupportPage.tsx`, `SuperAdminHelpFaqsPage.tsx`                                      |
| Components         | `ui/src/features/dashboard/super-admin/components/super-admin-support/*.tsx`                                                               |
| Hooks              | `ui/src/features/dashboard/super-admin/hooks/{useSupportTicketsAdmin,useHelpCenterFaqsAdmin}.ts`                                           |
| Edge functions     | `supabase/functions/{list,get,reply}-support-ticket-admin`, `update-support-ticket-status`, `{list,create,update,delete}-help-center-faq*` |
| Route registration | `ui/src/features/dashboard/super-admin/routes/index.tsx`, `superAdminPaths.ts`                                                             |

## Related docs

- [Route index](../README.md)
- [Property Help & Support](../org/property/help-support.md) (host-facing counterpart)
- [`docs/PROJECT.md`](../../PROJECT.md)
- [`docs/workflow/in-progress/help-support-center.md`](../../workflow/in-progress/help-support-center.md)

## Pending / follow-ups

- [ ] None — Phase 5 of the Help & Support plan shipped this in full.
