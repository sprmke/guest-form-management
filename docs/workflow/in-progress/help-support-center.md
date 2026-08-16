---
stage: in-progress
title: 'Help & Support (org + property + parking)'
status: in progress — Phase 3 (FAQ module) done
updated: 2026-08-17
tags: [help-support, documentation, ai-assistant, support-tickets, faqs, super-admin]
related:
  - docs/workflow/done/ai-dashboard-assistant-features.md
  - docs/workflow/planned/refine-footer-public-pages.md
---

# Help & Support (org + property + parking) — Documentation, AI Chat, Ticket Support, FAQs

## Context

Now that the AI Dashboard Assistant has shipped, the next piece is a **Help & Support** surface for hosts — a single place to get documentation, talk to the AI assistant, file a support ticket with us, and browse FAQs. The sidebar already has disabled "Help & Support" placeholders at org/property/parking scope waiting for this (`adminSidebarNav.ts:109,184,236`), so this closes a gap that was already anticipated.

The user wants `docs/guides/` to become the single source of truth ("dictionary") behind all four modules, with the important constraint that **nothing sensitive or internal leaks to hosts** — every route guide already has a vetted **"Host-facing knowledge" Q&A section** (plain language, no code/DB columns/file paths, enforced by the `route-guides` skill), while the rest of the file (implementation maps, DB columns, env vars) does not. There's already a working precedent for this exact pipeline: `scripts/sync-ai-knowledge-base.ts` extracts only those Q&A blocks into `ai_dashboard_assistant_knowledge_base` (Postgres FTS), which the AI assistant's `search_knowledge_base` tool already queries. This plan **reuses that same table and pipeline** for the new Documentation and AI Chat modules instead of building parallel infrastructure, and adds the two genuinely new things: a Ticket support system, and a curated FAQ table.

Decisions locked in with the user:

1. **Ticket replies** = in-app + one-way email notify (no new inbound-email pipeline — the existing Resend inbound webhook is narrowly scoped to GAF/pet approvals and extending it for generic two-way threading is out of scope for v1).
2. **Documentation content** = Host-facing Q&A sections only (already vetted, no audit pass needed).
3. **FAQs** = one-time AI-curated seed (20–50 items) **plus** a super-admin CRUD editor for ongoing curation.
4. **Sync automation** = CI-triggered auto-sync on `docs/guides/routes/**/*.md` changes merging to `develop`/`main`, so the knowledge base and Documentation content never go stale.

## Content pipeline (shared foundation for Documentation + AI Chat + FAQ seeding)

- **`ai_dashboard_assistant_knowledge_base` is already the correct source** for both AI Chat (existing) and the new Documentation module — no new table needed for raw Q&A. Its RLS already allows any `authenticated` user to `SELECT` (`ai_dashboard_assistant_knowledge_base_select ... USING (TRUE)`, `supabase/migrations/20261018120000_ai_dashboard_assistant.sql:272-275`), matching the "not tenant-scoped, just needs to be signed in" nature of help content.
- Add a **`title` extraction** to the existing parser so Documentation can group entries into readable "articles" per guide instead of a flat Q&A list. `scripts/sync-ai-knowledge-base.ts` already has `extractRoutePath()` — add a sibling `extractTitle()` that reads the `title:` frontmatter line, and store it via a new `route_guide_title TEXT` column on `ai_dashboard_assistant_knowledge_base` (migration `<ts>_help_center_article_titles.sql`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS route_guide_title TEXT`). Update the upsert payload in `sync-ai-knowledge-base.ts` to include it. This is the only schema change needed to the existing table — everything else (module grouping, e.g. "Org / Property / Parking / Bookings") is derived client-side from `route_guide_path` folder segments (e.g. `docs/guides/routes/org/property/bookings.md` → module `Property`).
- **CI auto-sync**: new workflow `.github/workflows/sync-help-center-content.yml`, triggered on `push` to `develop`/`main` with `paths: ['docs/guides/routes/**/*.md']`. Two jobs (mirroring `cd-dev.yml`'s `environment:` pattern for secrets): one runs `bun scripts/sync-ai-knowledge-base.ts --dev` against the `development` GitHub Environment secrets on `develop`, the other runs the prod variant on `main` using the `production` environment's `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_URL` (already present as deploy secrets per `cd-prod.yml` — verify exact secret names when implementing). This does **not** touch the "no prod deploy without kamewave" rule — it's a content sync of already-committed, already-reviewed markdown, not a schema/function deploy, so it's safe to run unattended in CI like the existing `quality` job.

## Module 1 — Documentation

- New edge function `list-help-center-articles` (Deno, `serveAdmin`-style but only needs _any signed-in admin session_, not org/property RBAC — content isn't tenant-scoped) — selects from `ai_dashboard_assistant_knowledge_base`, groups by `route_guide_path`/`route_guide_title` server-side, returns `{ module, title, routePath, qaItems: [{question, answer}] }[]`.
- New page `ui/src/features/dashboard/help-support/pages/HelpDocumentationPage.tsx` — module-grouped accordion/list with a client-side search box (filter over question/answer text), reusing the existing card/accordion primitives already in `ui/src/components/ui/`. No new visual system needed; follow `SupportPage.tsx`'s `MarketingPublicFaqList`-style layout but as an admin-shell page.
- Route: `/org/:orgSlug/help-support/docs`, `/org/:orgSlug/property/:propertySlug/help-support/docs`, `/org/:orgSlug/parking/:parkingSlug/help-support/docs`.

## Module 2 — AI Chat

- Trivial: an "Open AI Chat" card/button on the Help & Support overview page needs to toggle `assistantOpen`, which today is local state owned by `AdminLayoutShell` (`ui/src/features/dashboard/bookings/components/AdminLayout.tsx:338,592-603`) and not exposed anywhere else.
- Follow the codebase's existing **external-store pattern** already used for cross-component signals (`orgSettingsIssuesStore.ts` / `propertySettingsIssuesStore.ts`, consumed via `useSyncExternalStore` in `AdminLayout.tsx:327-336`) rather than introducing React Context. Add `ui/src/features/dashboard/ai-assistant/lib/assistantOpenStore.ts` exporting `openAiAssistant()` / `subscribeAssistantOpenRequest()`; `AdminLayoutShell` subscribes and calls `setAssistantOpen(true)` when a request comes in (mirrors how `toggleAssistant` already works, just triggered externally instead of from the FAB/bottom-tab).
- No new route — this is just a button on the Help & Support overview page.

## Module 3 — Ticket / App Support

**Data model** — new migration `supabase/migrations/<ts>_support_tickets.sql` (mirrors the shape of `ai_dashboard_assistant_attachments`/`ai_dashboard_assistant.sql`):

- `support_tickets`: `id`, `organization_id` (FK, required), `property_id`/`parking_id` (nullable FK, whichever scope it was filed from), `submitted_by_user_id` (FK `auth.users`), `submitted_by_name`, `submitted_by_email`, `category TEXT CHECK IN ('bug_report','feature_suggestion','general_inquiry','business_inquiry')`, `subject TEXT`, `status TEXT CHECK IN ('open','in_progress','resolved','closed') DEFAULT 'open'`, `priority TEXT CHECK IN ('low','medium','high')` nullable, `category_fields JSONB DEFAULT '{}'` (the dynamic bits: `page_url`, `browser_info`, `steps_to_reproduce`, `severity` for bugs; `expected_benefit` for suggestions; `contact_preference` for business), `created_at`, `updated_at`.
- `support_ticket_messages`: `id`, `ticket_id` (FK), `sender_type TEXT CHECK IN ('host','admin')`, `sender_user_id`, `sender_name`, `body TEXT`, `attachments JSONB DEFAULT '[]'`, `created_at`.
- Storage bucket `support-ticket-attachments` — private, service-role-only, same shape as the `ai-assistant-attachments` bucket migration (`supabase/migrations/20261019120000_ai_assistant_attachments.sql`), but `allowed_mime_types` also includes `video/mp4`/`video/quicktime` (bug-report screenshots/videos) and a larger `file_size_limit` (e.g. 20MB) than the 4MB image-only bucket.
- RLS: reuse the `user_can_access_ai_dashboard_assistant_org(org_id)` SECURITY DEFINER helper pattern (already defined in `20261018120000_ai_dashboard_assistant.sql:208`) for a new `user_can_access_org_support_tickets` check so hosts can only `SELECT` their own org's tickets/messages; all writes go through service-role edge functions (matches the rest of the codebase's "RLS isn't the access layer, edge functions are" convention).

**Edge functions** (Deno, `_shared/serveEdge.ts` helpers):

- `submit-support-ticket` — org/property-scoped auth via `verifyOrgAccess`/`verifyPropertyAccess`, creates the ticket + first `support_ticket_messages` row, calls `uploadService.uploadSupportTicketAttachment(...)` for each attachment, then `emailService.sendSupportTicketNotify(ticket)`.
- `list-support-tickets` / `get-support-ticket` — host-facing "My Tickets" list + detail+thread, scoped to the caller's org.
- `reply-support-ticket` — host adds a `sender_type='host'` message.
- `upload-support-ticket-attachment` — mirrors `upload-guest-chat-asset`/`dashboardAssistantAttachments.ts`, returns a storage path (bucket is private, so reads need a signed URL, not a public URL like `uploadPaymentReceipt`).
- Super-admin side (gated by `RequireSuperAdmin`/`serveSuperAdmin`): `list-support-tickets-admin` (filters: category/status/org), `get-support-ticket-admin`, `reply-support-ticket-admin` (adds `sender_type='admin'` + calls `emailService.sendSupportTicketReplyNotify(ticket, message)`), `update-support-ticket-status` (status/priority).

**`_shared/emailService.ts` additions** — follow the file's existing convention of one inline `fetch('https://api.resend.com/emails', ...)` per send function (there's no shared `sendViaResend` helper to reuse — every function in this file does this itself, e.g. `sendNewBookingRequestNotify` at line 673). Both new functions skip `resolveAppSettings`/`renderPropertyTemplateSendEmail` (both property-scoped) since tickets are platform-level:

- `sendSupportTicketNotify(ticket)` → reads a new `SUPPORT_TEAM_EMAIL` env var directly via `Deno.env.get(...)` (no existing var covers a fixed, non-property-scoped team inbox — closest analog is `EMAIL_REPLY_TO`, which is property-scoped). Add to `supabase/.env.example` under a new `# --- Support Tickets ---` banner, following the `EMAIL_TO`/`PARKING_OWNER_EMAILS` documentation style (lines 77-85, 103-106).
- `sendSupportTicketReplyNotify(ticket, message)` → sends to `ticket.submitted_by_email` with a link back to `/org/:orgSlug/help-support/tickets/:ticketId`.

**Form** — `ui/src/features/dashboard/help-support/lib/supportTicketSchema.ts`, a `z.discriminatedUnion('category', [...])` following the exact pattern in `ui/src/features/guest/sd-form/lib/sdFormSchema.ts` (each branch a `z.object({ category: z.literal(...), ...branch fields })`):

- `bug_report`: subject, description, `pageUrl` (auto-filled from `window.location.href`, editable), `browserInfo` (auto-filled `navigator.userAgent`, hidden), `severity` enum, attachments (0-3 files, image or video).
- `feature_suggestion`: title, description, optional `expectedBenefit`.
- `general_inquiry`: subject, message.
- `business_inquiry`: subject, message, optional `contactPreference`.

**UI**:

- `SubmitTicketPage.tsx` — category selector (cards) driving conditional fields via `form.watch('category')` (same idiom as `GuestForm.tsx`'s `form.watch('hasPets')`). For the bug-report attachment field, reuse the video-capable dropzone pattern from `PropertyMediaUpload.tsx` (only component in the repo that already handles image _and_ video preview) rather than the image-only `ImageUploadDropzone`.
- `MyTicketsPage.tsx` — list of the host's submitted tickets with status badges.
- `TicketDetailPage.tsx` — thread + reply composer, modeled directly on `InboxConversationView.tsx`'s composer (`draft` state + `onSend(text): Promise<void>` callback wired to a TanStack Query mutation, same shape as `InboxPage.tsx:325-333`'s `sendReply.mutateAsync` wiring) — simplified to drop the `privateReply`/`replyToMessageId` options since tickets don't need per-message threading.
- Super-admin: `/admin/support` → `SuperAdminSupportPage.tsx`, list + filters + table/card-grid switch modeled exactly on `SuperAdminApprovalsPage.tsx` (`useSupportTickets()` hook, `isMobileLayout` from `useIsBelowLg()`, single `selectedTicket` state instead of the dual-type dialog state that page uses) plus a detail view with the same reply-thread UI as the host-facing `TicketDetailPage.tsx` and status/priority controls. Register in `superAdminRoutes` (`ui/src/features/dashboard/super-admin/routes/index.tsx`) and add `support: '/admin/support'` to `superAdminPaths.ts`.

## Module 4 — FAQs

- New table `help_center_faqs` (id, `category TEXT`, `question TEXT`, `answer TEXT`, `sort_order INT`, `is_published BOOLEAN DEFAULT TRUE`, `source_route_guide_path TEXT` nullable, `created_by`, `updated_at`) — same migration file as the support tickets or its own, RLS: `SELECT` open to `authenticated` where `is_published`, writes via service role.
- **Seed content**: as an implementation step (not part of this plan doc), analyze the `ai_dashboard_assistant_knowledge_base` entries (i.e. all Host-facing Q&A across every guide) and hand-curate 20-50 cross-cutting FAQ items grouped by category (Bookings, Parking, Property Settings, Team & Permissions, AI Assistant, Billing, etc.), written as a one-time SQL seed migration.
- Edge functions: `list-help-center-faqs` (host-facing, published only) and super-admin CRUD (`list/create/update/delete-help-center-faq`, plus reordering).
- UI: a new `HelpCenterFaqAccordion.tsx` (dashboard-scoped, not the guest-marketing `MarketingPublicFaqList` which takes static hardcoded items) rendered on the Help & Support overview page, grouped/searchable by category. Super-admin editor `SuperAdminHelpFaqsPage.tsx` at `/admin/support/faqs` (add/edit/reorder/publish-toggle/delete).

## Nav + routing wiring

- Enable the three disabled `{ label: 'Help & Support', Icon: HelpCircle, disabled: true }` entries in `ui/src/features/dashboard/bookings/lib/adminSidebarNav.ts` (lines 109, 184, 236) with real `href`s pointing at a new overview route per scope.
- Add `'help-support'` to `OrgSection`/`PropertySection`/`ParkingSection` types and their `*_SECTION_VIEW_PERMISSION` maps (`orgPermissions.ts`, `propertyPermissions.ts`, `parkingPermissions.ts`). Since Help & Support should be visible to **every** team member regardless of role, map it to the same baseline permission each scope already uses for Dashboard: `org:dashboard:view` (org), `bookings:view` (property and parking — confirmed as the shared baseline in `propertyPermissions.ts:40` and `parkingPermissions.ts:49`). Deliberately **don't** add an entry to `*_NAV_VIEW_PERMISSION` (the nav-filter maps) — those are optional per-label lookups, and omitting the label means `filterOrgNavSections`/etc. always show the item (confirmed: `if (!required) return true;`).
- Register routes: overview (`/help-support`) + docs (`/help-support/docs`) + tickets list (`/help-support/tickets`) + submit (`/help-support/tickets/new`) + ticket detail (`/help-support/tickets/:ticketId`) under each of `orgAdminRoutes`, `propertyShellRoute`'s children, and `parkingShellRoute`'s children, using the existing `orgRoute()`/`propertyRoute()`/`parkingRoute()` guard wrappers (`ui/src/features/dashboard/org/routes/guards.tsx`).

## Docs to update (per `documentation-maintenance.mdc` / `route-guides` skill)

- New route guides: `docs/guides/routes/org/help-support.md`, `org/property/help-support.md`, `org/parking/help-support.md`, `admin/support.md` (super-admin ticket management) — each following the existing `_template.md` structure with a Host-facing knowledge Q&A section (which will itself flow into the knowledge base / Documentation module once synced — the feature documents itself).
- Update `docs/guides/routes/README.md` table with the new routes.
- Update `docs/PROJECT.md` if new env vars (`SUPPORT_TEAM_EMAIL`) or architecture pieces are added.

## Suggested phasing

1. **Foundation**: `route_guide_title` column + updated sync script + CI auto-sync workflow.
2. **Documentation module** (quick win, reuses foundation) + **AI Chat** wiring (trivial once the overview page exists).
3. **FAQ module**: table + seed content + read endpoint + accordion UI.
4. **Ticket support** (largest chunk): migration, storage bucket, edge functions, email, host-facing form/list/detail pages.
5. **Super-admin**: ticket list/detail/reply/status page + FAQ CRUD editor.
6. **Nav enable + route registration** across all three scopes, then docs updates.

## Verification

- `bun run type-check && bun run lint && bun run check:filenames && bun run build` after each phase.
- Local: `bun run db:migrate` for new migrations; `bun scripts/sync-ai-knowledge-base.ts --dry-run` to confirm the `route_guide_title` extraction works before wiring CI.
- Manual E2E via `./dev.sh`: enable nav → open Help & Support at org, property, and parking scope → verify Documentation search returns grouped articles, AI Chat opens the existing assistant panel, submit a ticket with attachments in each of the 4 categories and confirm the team-inbox email + `support_tickets` row, reply as host and as super-admin (`/admin/support`) and confirm the reply-notify email, and confirm FAQs render and are editable from the new super-admin FAQ page.

## Progress log

- **Phase 1 (Foundation) — done.** `route_guide_title TEXT` column added (`supabase/migrations/20261020120000_help_center_article_titles.sql`); `sync-ai-knowledge-base.ts` gained `extractTitle()` + upsert wiring; verified locally (`db:migrate` + real sync run against local Supabase) — all 68 guides resolve a title, 226 Q&A entries synced.
- CI auto-sync scoped to **dev only** for now (`.github/workflows/sync-help-center-content.yml`, push to `develop` on `docs/guides/routes/**/*.md`). No `main`/prod job — `mt-prod` doesn't exist yet and `cd-prod.yml` is still an inactive placeholder behind a cutover gate; add a mirrored job once that lands.
- **Action needed from you before this workflow can run**: add a `DEV_SUPABASE_SERVICE_ROLE_KEY` secret to the `development` GitHub Environment — no existing workflow sets a real service-role key today (`cd-dev.yml`'s deploy job only uses `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` via the Supabase CLI).
- Found and fixed an unrelated local blocker while testing: an **untracked** WIP migration (`20261018120000_parking_broadcast_expire_cron.sql`) shared its timestamp with an already-applied migration, colliding on `schema_migrations_pkey`. Renamed it to `20261018120001_...` (content untouched) so `db:migrate` could proceed — flagging in case that timestamp was meaningful to other in-progress work.
- Found a **content bug** (not fixed, out of scope for this phase): `docs/guides/routes/org/parking/notifications.md`'s Host-facing knowledge section is missing a `- Q:` line before "No for the bot — one shared token is enough…" (line 66), so that answer merged into the previous question's answer and left a stale orphaned row (null title) in the knowledge base table. Worth a follow-up fix since it'll surface as a broken Q&A entry in the future Documentation module.
- **Phase 2 (Documentation + AI Chat) — done.**
  - `list-help-center-articles` edge function (auth: `verifyAuthenticatedUser` via `serveAuthenticated`, not `serveAdmin` — this app's admin-dashboard sessions are org/property JWTs, and `serveAdmin` is the legacy `ADMIN_ALLOWED_EMAILS` allow-list, which doesn't apply here). Groups knowledge-base rows into per-guide articles, derives a `module` label from `route_guide_path` segments (`org/property/**` → `Property`, `org/parking/**` → `Parking`, bare `org/*.md` → `Org`, everything else by its first path segment or `General`), and excludes `docs/guides/routes/admin/**` (super-admin-only docs, not relevant to hosts). Registered in `config.toml` (`verify_jwt = false`, matching the rest of the `verifyAuthenticatedUser` functions).
  - Smoke-tested end to end against local Supabase with a real signed-in session (created + deleted a throwaway GoTrue user): 52 articles, correct module distribution (`Property: 15, Parking: 7, Org: 7, General: 17, Account: 4, Properties: 1, Bookings: 1`), zero `admin/` leakage.
  - `HelpDocumentationPage.tsx` — search box (client-side, filters by title/question/answer) + per-module `AdminSection` cards, each article a native `<details>` disclosure (no shadcn accordion primitive exists in this repo, so used the platform-standard alternative rather than adding a new UI primitive for one page).
  - AI Chat: `assistantOpenStore.ts` (external-store request-counter pattern, mirrors `orgSettingsIssuesStore.ts`) + `AdminLayoutShell` now subscribes and opens the assistant panel on request, closing the more-sheet/notifications first (same mutual-exclusion behavior the FAB already had).
  - **Not done yet, by design**: routes for `/help-support/docs` (org/property/parking) — the plan's own "Nav + routing wiring" section bundles route registration with the `OrgSection`/`PropertySection`/`ParkingSection` permission-map changes, both scheduled for Phase 6. `HelpDocumentationPage.tsx` exists and type-checks/builds but isn't reachable via the router yet.
- **Phase 3 (FAQ module) — done.**
  - `help_center_faqs` table + seed migration, curated directly from the already-vetted knowledge base Q&A (reused verbatim, not paraphrased) — 36 items across 10 categories (Getting Started, Team & Permissions, Bookings, Parking, Property Settings, Notifications, Guest Communication, Billing & Finance, Maintenance & Operations, AI Assistant).
  - `list-help-center-faqs` edge function (published-only, same `verifyAuthenticatedUser` auth as the Documentation endpoint) + `HelpCenterFaqAccordion.tsx` (search + per-category collapsible items).
  - **Caught and fixed my own bug during smoke-testing**: the table migration created `help_center_faqs` without `GRANT ALL ... TO service_role` — every other new-table migration in this codebase (`ai_dashboard_assistant.sql`, `notifications.sql`, `custom_pages.sql`, etc.) grants this explicitly since there's no schema-level default-privileges setup, and I missed it initially. First smoke test failed with `permission denied for table help_center_faqs` even though RLS was correctly configured — RLS filters rows, it doesn't substitute for the underlying GRANT. Fixed the migration file (still untracked/unshipped, so edited directly) and patched the already-created local table to match; re-verified end to end (36/36 FAQs returned).
  - Super-admin CRUD editor for FAQs is intentionally deferred to Phase 5 per the plan's phasing.
