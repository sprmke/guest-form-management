---
title: 'Planned work'
status: active
tags: [workflow, planned]
updated: 2026-08-24
stage: planned
kind: reference
---

# Planned work

Approved plans **not yet started**. Once implementation begins (even a partial slice), run `/workflow-start` → [`../in-progress/`](../in-progress/). See [`../done/`](../done/) for completed plans.

| Plan                                                           | Status      | Summary                                                     |
| -------------------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| [`ai-opportunities-roadmap.md`](./ai-opportunities-roadmap.md) | not started | AI opportunity backlog across guest/host/admin/dev          |
| [`parking-e2e-later-phases.md`](./parking-e2e-later-phases.md) | not started | Parking E2E Phase 2a/2b/3/4 stubs only — plan after Phase 1 |

Moved to in-progress: [`ai-usage-metering-credits-foundation.md`](../in-progress/ai-usage-metering-credits-foundation.md) (Phases 1–3 shipped; Phase 4 deferred), [`ci-cd-dev-prod.md`](../in-progress/ci-cd-environments/ci-cd-dev-prod.md) (Phases A–C shipped; Phase F still open — see [`ci-cd-environments/`](../in-progress/ci-cd-environments/README.md)), [`booking-workflow-multi-tenancy.md`](../in-progress/booking-workflow-multi-tenancy.md), [`marketing-module-refinement.md`](../in-progress/marketing-module-refinement.md), [`mobile-native-redesign.md`](../in-progress/mobile-native-redesign.md), [`host-verification-tiers.md`](../in-progress/host-verification-tiers.md), [`parking-property-parity.md`](../in-progress/parking-property-parity.md) (v1 shipped; org-plan gating pending), [`tier-feature-alignment-audit.md`](../in-progress/tier-feature-alignment-audit.md) (Phases 1-8 shipped; Phases 9-10 open), [`pricing-portfolio-bundling.md`](../in-progress/pricing-portfolio-bundling.md) (Phases 1-4 shipped as Phase 8 of the audit above; mid-bundle changes + org-level proration + billing-cycle automation open).

Moved to done: [`page-editor-public-pages.md`](../done/page-editor-public-pages.md) (Phases 0–7 shipped; Phase 8 backlog), [`inbox-share-links-and-files.md`](../done/inbox-share-links-and-files.md) (2026-08-22), [`parking-e2e-phase1-overview.md`](../done/parking-e2e-phase1-overview.md) (+ 5 companions), [`guest-inbox-meta-hardening.md`](../done/guest-inbox-meta-hardening.md).

**Won't do:** [`google-oauth-verification.md`](../wont-do/google-oauth-verification.md) — superseded by Resend inbound approvals ([`remove-google-calendar-sheets.md`](../done/remove-google-calendar-sheets.md)). [`property-public-pages-shell-redesign.md`](../wont-do/property-public-pages-shell-redesign.md) — superseded by [`page-editor-public-pages.md`](../done/page-editor-public-pages.md), which owns `PropertyDetailPage.tsx` section-config work.

**In progress:** [`../in-progress/README.md`](../in-progress/README.md).

**Done (recent):** [`ai-assistant-universal-context-pickers.md`](../done/ai-assistant-universal-context-pickers.md), [`host-plans-and-pricing-tiers.md`](../done/host-plans-and-pricing-tiers.md), [`host-plans-pricing-page.md`](../done/host-plans-pricing-page.md), [`paymongo-subscription-billing.md`](../done/paymongo-subscription-billing.md), [`feature-gating-subscription-upgrade.md`](../done/feature-gating-subscription-upgrade.md), [`help-support-center.md`](../done/help-support-center.md), [`marketing-ai-generated-templates.md`](../done/marketing-ai-generated-templates.md), [`verification-scope-split.md`](../done/verification-scope-split.md), [`listing-contract-renewal-modal.md`](../done/listing-contract-renewal-modal.md), [`ai-dashboard-assistant-v2-full-coverage.md`](../done/ai-dashboard-assistant-v2-full-coverage.md), [`custom-pages-module.md`](../done/custom-pages-module.md), [`in-app-notifications.md`](../done/in-app-notifications.md)

## Naming

`<kebab-case-slug>.md` — **no date prefix**. Use frontmatter `updated:` for timestamps.

Back to [workflow index](../README.md).
