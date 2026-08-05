---
title: 'Planned work'
status: active
tags: [workflow, planned]
updated: 2026-08-05
stage: planned
kind: reference
---

# Planned work

Not yet shipped. See [`../done/`](../done/) for completed plans.

| Plan                                                                                   | Status          | Summary                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ai-dashboard-assistant.md`](./ai-dashboard-assistant.md)                             | not started     | RBAC-scoped admin chat assistant                                                                                                                                                                          |
| [`custom-pages-module.md`](./custom-pages-module.md)                                   | not started     | Custom Pages module + stay-guide redesign                                                                                                                                                                 |
| [`refine-footer-public-pages.md`](./refine-footer-public-pages.md)                     | not started     | Footer trim + About/Contact/Support pages                                                                                                                                                                 |
| [`google-oauth-verification.md`](./google-oauth-verification.md)                       | not started     | Inbound email webhook for PMO approvals                                                                                                                                                                   |
| [`ai-opportunities-roadmap.md`](./ai-opportunities-roadmap.md)                         | not started     | AI opportunity backlog across guest/host/admin/dev                                                                                                                                                        |
| [`booking-workflow-multi-tenancy.md`](./booking-workflow-multi-tenancy.md)             | not started     | Multi-property booking workflow audit, design & backlog                                                                                                                                                   |
| [`unit-handoff-active-uniqueness.md`](./unit-handoff-active-uniqueness.md)             | pointer         | [#120](https://github.com/sprmke/kame-homes/issues/120) — see [`../done/unit-handoff-phase-a.md`](../done/unit-handoff-phase-a.md) + [`../done/unit-handoff-phase-b.md`](../done/unit-handoff-phase-b.md) |
| [`host-verification-tiers.md`](./host-verification-tiers.md)                           | Phase 3 partial | Phases 1–2 shipped; admin queue priority shipped; browse search boost deferred until public listings API                                                                                                  |
| [`property-public-pages-shell-redesign.md`](./property-public-pages-shell-redesign.md) | not started     | Persistent shell unifying property detail + calendar/form/chat/sd-form/pay-parking layout, media showcase panel, native transitions                                                                       |
| [`dev-staging-environment.md`](./dev-staging-environment.md)                           | in progress     | Dev Supabase + Vercel Preview + local mode picker — scripts/runbook shipped; operator bootstrap pending                                                                                                   |
| [`in-app-notifications.md`](./in-app-notifications.md)                                 | not started     | Notification center: bell + toast for chat, booking workflow events & Gmail auto-approvals                                                                                                                |
| [`listing-search-pagination.md`](./listing-search-pagination.md)                       | not started     | Server-side page enrichment + scale for thousands of public listings/search results; location-group lazy load as Phase 2 — **no listing UX redesign**                                                     |
| [`google-map-listing-view.md`](./google-map-listing-view.md)                           | not started     | Real Google Maps view on `/properties` + `/search` categories; page pins + bbox “Search this area”; shared ListingMapView                                                                                 |
| [`smart-ai-data-importer.md`](./smart-ai-data-importer.md)                             | not started     | AI-assisted CSV bookings importer via a modal beside "New booking"; auto column-mapping, new `IMPORTED` status, preview/commit/revert                                                                     |

**Done (recent):** [`review-approval-workflow.md`](../done/review-approval-workflow.md), [`native-mobile-brand-hero-reskin.md`](../done/native-mobile-brand-hero-reskin.md), [`mobile-sticky-chrome-morph.md`](../done/mobile-sticky-chrome-morph.md), [`unit-handoff-phase-a.md`](../done/unit-handoff-phase-a.md)

**Done (earlier):** [`booking-workflow-configurable-docs.md`](../done/booking-workflow-configurable-docs.md), [`property-calendar-page.md`](../done/property-calendar-page.md), [`unit-handoff-phase-b.md`](../done/unit-handoff-phase-b.md), [`guest-form-configurable-sections.md`](../done/guest-form-configurable-sections.md)

## Naming

`<kebab-case-slug>.md` — **no date prefix**. Use frontmatter `updated:` for timestamps.

Back to [workflow index](../README.md).
