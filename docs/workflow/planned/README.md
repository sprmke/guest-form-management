---
title: 'Planned work'
status: active
tags: [workflow, planned]
updated: 2026-08-11
stage: planned
kind: reference
---

# Planned work

Approved plans **not yet started**. Once implementation begins (even a partial slice), run `/workflow-start` → [`../in-progress/`](../in-progress/). See [`../done/`](../done/) for completed plans.

| Plan                                                                                   | Status      | Summary                                                                                        |
| -------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| [`ai-dashboard-assistant.md`](./ai-dashboard-assistant.md)                             | not started | RBAC-scoped admin chat assistant                                                               |
| [`custom-pages-module.md`](./custom-pages-module.md)                                   | not started | Custom Pages module + stay-guide redesign                                                      |
| [`refine-footer-public-pages.md`](./refine-footer-public-pages.md)                     | not started | Footer trim + About/Contact/Support pages (footer links exist; routes/pages not built)         |
| [`google-oauth-verification.md`](./google-oauth-verification.md)                       | not started | Inbound email webhook for PMO approvals (Gmail CASA pivot)                                     |
| [`ai-opportunities-roadmap.md`](./ai-opportunities-roadmap.md)                         | not started | AI opportunity backlog across guest/host/admin/dev                                             |
| [`property-public-pages-shell-redesign.md`](./property-public-pages-shell-redesign.md) | not started | Persistent shell unifying property detail + calendar/form/chat/sd-form/pay-parking layout      |
| [`in-app-notifications.md`](./in-app-notifications.md)                                 | not started | Notification center: bell + toast for chat, booking workflow events & Gmail auto-approvals     |
| [`dashboard-ground-up-redesign.md`](./dashboard-ground-up-redesign.md)                 | not started | Ground-up desktop visual redesign of the admin dashboard, isolated from public pages           |
| [`parking-e2e-phase1-overview.md`](./parking-e2e-phase1-overview.md)                   | not started | Parking E2E Phase 0/1 production plan: broadcast claim, realtime status (index + 5 companions) |
| [`parking-e2e-later-phases.md`](./parking-e2e-later-phases.md)                         | not started | Parking E2E Phase 2a/2b/3/4 stubs only — plan after Phase 1                                    |

Moved to in-progress: [`listing-contract-renewal-modal.md`](../in-progress/listing-contract-renewal-modal.md), [`ci-cd-dev-prod.md`](../in-progress/ci-cd-environments/ci-cd-dev-prod.md) (Phases A–C shipped; Phase F still open — see [`ci-cd-environments/`](../in-progress/ci-cd-environments/README.md)).

**In progress:** [`../in-progress/README.md`](../in-progress/README.md) — includes partial plans (Phases 1–2 shipped but plan not closed, v1 slice shipped but backlog open, etc.).

**Done (recent):** [`supabase-deploy-guardrails-and-rollback.md`](../done/supabase-deploy-guardrails-and-rollback.md), [`unit-handoff-active-uniqueness.md`](../done/unit-handoff-active-uniqueness.md), [`google-map-listing-view.md`](../done/google-map-listing-view.md), [`smart-ai-data-importer.md`](../done/smart-ai-data-importer.md), [`import-preview-fix-queue.md`](../done/import-preview-fix-queue.md), [`booking-workflow-configurable-docs.md`](../done/booking-workflow-configurable-docs.md)

## Naming

`<kebab-case-slug>.md` — **no date prefix**. Use frontmatter `updated:` for timestamps.

Back to [workflow index](../README.md).
