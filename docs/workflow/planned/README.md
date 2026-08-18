---
title: 'Planned work'
status: active
tags: [workflow, planned]
updated: 2026-08-18
stage: planned
kind: reference
---

# Planned work

Approved plans **not yet started**. Once implementation begins (even a partial slice), run `/workflow-start` → [`../in-progress/`](../in-progress/). See [`../done/`](../done/) for completed plans.

| Plan                                                                                       | Status      | Summary                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`google-oauth-verification.md`](./google-oauth-verification.md)                           | not started | Inbound email webhook for PMO approvals (Gmail CASA pivot) — superseded by [`remove-google-calendar-sheets.md`](../done/remove-google-calendar-sheets.md)                                                                                                                                                                         |
| [`ai-opportunities-roadmap.md`](./ai-opportunities-roadmap.md)                             | not started | AI opportunity backlog across guest/host/admin/dev                                                                                                                                                                                                                                                                                |
| [`property-public-pages-shell-redesign.md`](./property-public-pages-shell-redesign.md)     | not started | Persistent shell unifying property detail + calendar/form/chat/sd-form/pay-parking layout                                                                                                                                                                                                                                         |
| [`parking-e2e-later-phases.md`](./parking-e2e-later-phases.md)                             | not started | Parking E2E Phase 2a/2b/3/4 stubs only — plan after Phase 1                                                                                                                                                                                                                                                                       |
| [`ai-assistant-universal-context-pickers.md`](./ai-assistant-universal-context-pickers.md) | not started | Generalize the booking context-picker pattern to every dashboard module (property, team, finance, maintenance, parking, inbox, marketing, pricing, notifications, public pages, tickets), plus new image/stepper/quick-actions response blocks, a cross-module command palette, and a canvas overlay for rich content             |
| [`inbox-share-links-and-files.md`](./inbox-share-links-and-files.md)                       | not started | New "Share" icon in the Guest Inbox chat composer (beside Quick reply/Suggest) to insert property/booking links (Stay Guide, Property, Calendar, Messages) and booking documents (Approved GAF, Approved Pet, Parking Endorsement) as rich link cards; adds a durable guest-safe share-link token for the two private-bucket PDFs |

Moved to in-progress: [`host-plans-and-pricing-tiers.md`](../in-progress/host-plans-and-pricing-tiers.md) (foundation shipped 2026-08-18), [`host-plans-pricing-page.md`](../in-progress/host-plans-pricing-page.md) (host Plans page shipped 2026-08-18), [`feature-gating-subscription-upgrade.md`](../in-progress/feature-gating-subscription-upgrade.md), [`ai-usage-metering-credits-foundation.md`](../in-progress/ai-usage-metering-credits-foundation.md) (Phase 1 shipped), [`listing-contract-renewal-modal.md`](../in-progress/listing-contract-renewal-modal.md), [`verification-scope-split.md`](../in-progress/verification-scope-split.md), [`help-support-center.md`](../in-progress/help-support-center.md), [`parking-e2e-phase1-overview.md`](../in-progress/parking-e2e-phase1-overview.md) (+ 5 companions), [`ci-cd-dev-prod.md`](../in-progress/ci-cd-environments/ci-cd-dev-prod.md) (Phases A–C shipped; Phase F still open — see [`ci-cd-environments/`](../in-progress/ci-cd-environments/README.md)).

**In progress:** [`../in-progress/README.md`](../in-progress/README.md) — includes partial plans (Phases 1–2 shipped but plan not closed, v1 slice shipped but backlog open, etc.).

**Done (recent):** [`ai-dashboard-assistant.md`](../done/ai-dashboard-assistant.md), [`ai-dashboard-assistant-v2-full-coverage.md`](../done/ai-dashboard-assistant-v2-full-coverage.md), [`ai-platform-hardening.md`](../done/ai-platform-hardening.md), [`custom-pages-module.md`](../done/custom-pages-module.md), [`in-app-notifications.md`](../done/in-app-notifications.md), [`refine-footer-public-pages.md`](../done/refine-footer-public-pages.md), [`booking-ai-summary-validation.md`](../done/booking-ai-summary-validation.md), [`supabase-deploy-guardrails-and-rollback.md`](../done/supabase-deploy-guardrails-and-rollback.md), [`unit-handoff-active-uniqueness.md`](../done/unit-handoff-active-uniqueness.md), [`google-map-listing-view.md`](../done/google-map-listing-view.md), [`smart-ai-data-importer.md`](../done/smart-ai-data-importer.md), [`import-preview-fix-queue.md`](../done/import-preview-fix-queue.md), [`booking-workflow-configurable-docs.md`](../done/booking-workflow-configurable-docs.md)

## Naming

`<kebab-case-slug>.md` — **no date prefix**. Use frontmatter `updated:` for timestamps.

Back to [workflow index](../README.md).
