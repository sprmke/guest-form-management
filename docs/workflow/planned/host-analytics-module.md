---
stage: planned
title: 'Host Analytics module — performance insights + AI coaching'
status: planned
tags: [planning, planned-modules, analytics, ai, plans, rbac, dashboard]
updated: 2026-09-06
---

# Host Analytics module — performance insights + AI coaching

## Goal

Give hosts a dedicated **Analytics** page in the dashboard that turns their own booking
history into decisions: see how the listing is performing now, compare it to the previous
period **and** the same period last year, look forward at what is already on the books for
the next 90–180 days, and — AI-first — get a plain-language review of **what is working**,
**what to improve** (with a concrete action + deep link), and **what to stop doing**, plus a
curated playbook of tips and tutorials matched to the gaps the data shows. The full module
(deterministic analytics + all three AI surfaces) is a **Pro-tier paid capability**; Free and
Starter see a teaser with an upgrade CTA.

## Scope

### In

- New property-scoped module `features/dashboard/analytics/` at
  `/org/:orgSlug/property/:propertySlug/analytics` (new `PropertySection` `'analytics'`).
- Deterministic metrics service (`_shared/analyticsService.ts`) computed on-read from
  `guest_submissions` + `guest_reviews`: occupancy, ADR, RevPAR, revenue/net, booking pace
  ("on the books"), pickup, lead time / booking window, length-of-stay mix, channel/source
  mix, cancellation rate, rating trend, repeat-guest rate — each with **period-over-period**
  and **year-over-year** deltas, plus a **forward 90/180-day** on-the-books view with unbooked
  high-value gap nights.
- Three AI surfaces, all on the existing Gemini router + AI-quota + credit model:
  1. **AI Performance Review** — weekly cron + on-demand `analytics-ai-review`; structured
     `strengths` / `improvements` / `avoid` with impact estimate, specific action, and an
     in-app deep link; stored in `property_analytics_reviews`; Notification Center ping on a
     material score change. Advisory only — never mutates a rate or setting.
  2. **Ask Analytics** — a Tier-0 read tool added to the **existing AI Dashboard Assistant**
     (`get_property_analytics` / `explain_metric`), not a second chat. "Ask about these
     numbers" on the page opens the assistant with the analytics context pinned.
  3. **Improvement Playbook** — seeded `host_playbook_articles` (curated tips/tutorials:
     pricing, photos, amenities, response time, min-stay, promos, calendar hygiene, review
     replies); the AI review's `improvements[]` link to the relevant article(s).
- Plans gating: new `PlanFeatureKey` **`analyticsInsights`** (Pro `growth` / Business `pro` /
  Managed). Full end-to-end: seed migration, both `planFeatures.ts`, `useFeatureGate` +
  `requirePropertyFeature`, feature matrix, `planPresentation` compare row + tier-card gain,
  public `/for-hosts/pricing`.
- Team RBAC: new leaves `analytics:view` + `analytics:export` (property) and mirror
  `org:analytics:view` — catalog, server allow-list, seeded role templates, nav + route +
  edge gates.
- Org portfolio rollup `/org/:orgSlug/analytics` (per-property leaderboard + portfolio KPIs)
  and CSV/PDF export — Phase 5.

### Out (explicitly)

- **Parking analytics** — parking is a separate vertical with simpler economics; a
  `parking/.../analytics` mirror is a later follow-up, noted at the end.
- **External market / comp-set data** (AirDNA-style) — no third-party data purchase. A
  privacy-guarded "vs Kame median for similar listings in your area/size" benchmark built
  from platform aggregate is **Phase 5, optional**, behind a minimum-sample threshold.
- A separate analytics chatbot — reuse the AI Dashboard Assistant.
- Real-time streaming metrics — analytics is daily-grain, cache-friendly.
- `analytics_daily_rollup` perf table — Phase 6, only if on-read aggregation shows strain.

## Competitive UX brief — host analytics

**Job:** host wants to understand listing performance and know what to change to get more
bookings. **Role:** operator (host / co-host).

- **Guesty Advanced Analytics** — switchable dashboards (Revenue YoY, **Pace Report** =
  current year vs same day last year for revenue / ANR / booked days, Reservations breakdown
  by channel/status/LOS), a **custom report builder**, an **AI data-analysis agent** that
  surfaces insights on request, and downloadable reports gated to the premium tier (Standard
  vs Advanced Analytics).
- **Hostaway** — real-time Occupancy, ADR, **RevPAR**, channel mix, **booking pace**, owner
  payouts, profitability / net income, income forecast; custom dashboard widgets on Pro.
- **PriceLabs Portfolio Analytics** — revenue, occupancy, ADR, RevPAR, **booking pace**,
  **booking pickup**, lead time, LOS, all **paced against last year**, per listing / group /
  portfolio; separate Market Dashboards for competitive context; group sandbox to test a
  strategy change before applying.
- **Airbnb host Insights** — Views→conversion, search visibility, response rate; Occupancy &
  Rates with **366 days past + 180 days future**; a free **competitor set** showing above/
  below the 50th percentile; everything framed as "every dip is an opportunity".
- **Lodgify** — occupancy / revenue / booking trends, filter by property / date / channel,
  owner statements.
- **Hospitable Copilot** — conversational AI with access to bookings, reviews, tasks,
  calendar: "ask a simple question, get an actionable insight."

### Adopt for Kame Homes

- Standard KPI vocabulary: **Occupancy, ADR, RevPAR, Revenue/Net, Booking pace, Pickup,
  Lead time, LOS, Channel mix, Cancellation rate, Rating**. Hosts and any PMS-savvy user
  expect these exact names.
- **Dual comparison**: previous period _and_ same period last year (Guesty Pace Report +
  PriceLabs pacing). A single comparison toggle.
- **Forward-looking on-the-books** panel (Airbnb 180-day future, PriceLabs pace/pickup):
  next-90/180-day occupancy already booked, revenue on the books, high-value gap nights.
- **"Opportunity" framing** for the AI review — strengths / improvements / avoid, each with
  a concrete next step, mirroring Guesty's AI agent + Hospitable Copilot but as a persistent
  card, not only a chat.
- **Premium gate** on the full module (Guesty Advanced Analytics, Hostaway Pro widgets,
  PriceLabs market layer). Teaser for Free/Starter.
- **Ask about these numbers** → the existing assistant (Hospitable Copilot pattern) instead
  of a bespoke report builder — lower build cost, already has tools/quota/safety/blocks.

### Adapt / skip

- No competitor-set / market data at launch (no third-party data spend); optional
  platform-aggregate benchmark later with a privacy floor.
- No custom report builder — fixed, well-chosen sections + assistant Q&A + CSV export.
- Minimal copy (`minimal-ui-copy`), `Asia/Manila`, PHP, mobile-first — house rules.
- Compute on-read from `guest_submissions` (low per-listing booking volume); no rollup table
  until proven necessary.

## Approach

### Placement & tiers of the surface

| Surface            | Route                                            | Phase | Notes                                 |
| ------------------ | ------------------------------------------------ | ----- | ------------------------------------- |
| Property Analytics | `/org/:orgSlug/property/:propertySlug/analytics` | 1     | primary build                         |
| Org portfolio      | `/org/:orgSlug/analytics`                        | 5     | leaderboard + portfolio KPIs + export |
| Parking            | —                                                | later | separate follow-up, not in this plan  |

### Data model

**Fact source:** `guest_submissions` (property bookings) + `guest_reviews` (ratings). No new
booking fields needed. Key columns already present: `check_in_date` / `check_out_date`
(text `MM-DD-YYYY` → normalize with `_shared/utils.ts`), `number_of_nights`, `booking_rate`,
`down_payment`, `balance`, `security_deposit`, `guest_additional_fee`, `status`,
`created_at` (reservation timestamp → lead time + pace), `booking_source` /
`booking_booking_channel` / `external_source` / `find_us` (channel/source mix),
`number_of_adults` / `number_of_children`, `status_updated_at`, `settled_at`. Money helpers
reuse `_shared/bookingFinance.ts`; cancellation logic reuses `_shared/superhostMetrics.ts`
(incl. the OTA feed-drop exclusion).

**New tables**

- `property_analytics_reviews` — one row per generated AI review (pattern:
  `superhost_assessment_runs`). Columns: `id`, `property_id` (FK, cascade), `organization_id`
  (FK, cascade), `period_start` / `period_end` (date), `generated_at`, `generated_by`
  (nullable — null = cron), `model`, `headline` text, `score` int (0–100), `score_delta`
  int, `payload` jsonb `{ strengths[], improvements[], avoid[], metricsSnapshot }`,
  `is_latest` bool. Indexes: `(property_id, generated_at desc)`, partial `(property_id) where
is_latest`. RLS on, `GRANT ALL … service_role` (edge-gated, like every other table).
- `host_playbook_articles` — `id`, `slug` unique, `category` text, `title`, `body_md`,
  `applies_when` jsonb (metric-condition matcher the AI/deterministic picker reads, e.g.
  `{ metric: "occupancy", op: "lt", value: 0.5 }`), `sort_order`, `is_active`. Seed ~15–20
  curated articles in the migration. Super-admin CRUD reuses the help-center-FAQ admin
  pattern (Phase 4).
- Seed migration adds `analyticsInsights: true` to `pricing_plans.features` for `growth`,
  `pro`, `managed` (mirrors `20261213120300_calendar_sync_plan_feature.sql`).

**Optional later:** `analytics_daily_rollup` (property_id, date, nights_booked,
nights_available, revenue, reservations_made) + backfill + incremental cron — Phase 6, only
if profiling shows on-read aggregation is too slow at scale.

### Metrics service — `supabase/functions/_shared/analyticsService.ts`

Pure functions + a loader, styled after `dashboardService.ts` / `superhostMetrics.ts`
(unit-tested with Deno). Produces one `AnalyticsBundle`:

- **KPIs** (period, prior-period, same-period-last-year): occupancy %, ADR, RevPAR, gross
  revenue, net profit, reservations, nights booked, avg lead time, cancellation rate, avg
  rating, repeat-guest %. Each carries `value`, `changePctVsPrior`, `changePctVsLastYear`.
- **Trend series** — daily/weekly/monthly buckets (reuse `dashboardService.ts` bucketing) of
  occupancy, ADR, revenue.
- **Booking pace** — for the trailing + next few months, cumulative reservations & revenue
  "as of N days before month start" vs the same curve last year (the Guesty Pace Report).
- **Pickup** — net new reservations in the last 7 / 30 days for future check-ins.
- **Distributions** — LOS histogram, lead-time histogram, channel/source mix, pax mix.
- **Forward** — next 90 / 180 days: nights already booked, occupancy on the books, revenue
  on the books, list of unbooked nights above a value threshold ("gap nights").
- **Data-sufficiency flags** — per section `sampleSize` + `enough` bool (gate the UI like
  superhost sample-size gating; "analytics unlock after ~10 completed stays").

### AI design (AI-first)

New `AiFeature` **`host_analytics`** in `_shared/aiModelRouter.ts` (`flash` tier — structured
JSON, multi-field reasoning; same class as `smart_pricing`). All three surfaces:

1. **AI Performance Review** (`analytics-ai-review` fn + `_shared/analyticsAiReview.ts`) —
   input: the `AnalyticsBundle` + property context (amenities, pricing config, min-stay,
   review themes, plan). Gemini returns a fixed JSON schema:
   `{ headline, score, scoreDelta, strengths[{title, evidence}],
improvements[{title, why, action, expectedImpact, deepLink}],
avoid[{title, why, deepLink}] }`. Pattern is `smartPricingAi.ts` verbatim:
   `assertOrgAndPropertyAiQuota('host_analytics')` → generate → `recordAiUsage` → on any
   failure (no keys / quota / kill switch / bad JSON) return `null` and the card shows the
   deterministic bundle only. **Never writes** a setting. `deepLink` values are resolved
   server-side from a small allow-list of route builders (pricing, calendar-sync, marketing,
   public-pages, settings) so the model can't emit arbitrary URLs.
2. **Ask Analytics** — `_shared/dashboardAssistantAnalyticsTools.ts`: Tier-0 read tools
   `get_property_analytics({ period })` and `explain_metric({ metric })` returning the bundle
   - a `chart` block. Registered in `dashboardAssistantTools.ts`; gated by
     `requirePropertyFeature('analyticsInsights')` inside the tool (like `calendarSync` tools
     in `dashboardAssistantOpsTools.ts`). Page CTA "Ask about these numbers" opens the panel
     via `ai-assistant/lib/assistantOpenStore.ts` with the analytics page pinned as context.
3. **Improvement Playbook** — deterministic matcher (`applies_when` vs the bundle) proposes a
   candidate set; the AI review's `improvements[]` reference article slugs so the list is
   ordered by what actually matters for this listing. Articles render as expandable cards
   with a "Do this" deep link.

**Weekly cron** `analytics-ai-review-cron` (`serveCronPost`, hosted `pg_cron` + `pg_net`):
for each active property on a Pro+ org with `enough` data, regenerate the review, set
`is_latest`, and if `abs(scoreDelta) >= threshold` emit a Notification Center event
(`analyticsReviewUpdated`) via `notificationService.ts`. On-demand **Regenerate** button →
`analytics-ai-review` POST, rate-limited 1 / hour / property (reuse the durable rate limiter
from `_shared/requestRateLimits` or the settings-verification pattern).

### Plans + Team RBAC (mandatory decision)

| Control       | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plans**     | **YES.** New `PlanFeatureKey` `analyticsInsights`, entitled on `growth` (Pro) / `pro` (Business) / `managed`. Free + Starter get a **teaser**: the KPI strip with period-over-period only (data the dashboard already exposes) + a locked "Insights, pace & AI review" panel with an upgrade CTA. Full bundle, forward-looking, all 3 AI surfaces, and export require the entitlement. AI surfaces additionally consume `aiMonthlyCreditAllowance` (double-gated, like Smart Pricing). Rationale: analytics + AI coaching is the classic "grow revenue" upsell and belongs with Smart Pricing / calendar sync / marketing studio, which are already Pro+. |
| **Team RBAC** | **YES.** New property leaves `analytics:view` (see the page) and `analytics:export` (CSV/PDF). Org mirror `org:analytics:view` for the portfolio page. Seeded: owner + co-host → view + export; manager → view; others → none by default (configurable). Nav item hidden without `analytics:view`; `RequirePropertyPermission`; `resolveScopedPropertyAccess(req, 'analytics:view')` on `analytics-summary`, `:export` on `analytics-export`.                                                                                                                                                                                                             |

### UI

`features/dashboard/analytics/` — `components/ hooks/ lib/ pages/ routes/`. `AnalyticsPage`
composed of section cards (reuse `recharts`, `ui/src/lib/charts/` palette + styles,
`ui/src/components/charts/`, shadcn, TanStack Query):

1. **Controls** — date-range preset (This month / Last 30d / QTD / YTD / Last 12mo / custom)
   - comparison toggle (Previous period ↔ Same period last year).
2. **KPI strip** — Occupancy, ADR, RevPAR, Revenue, Net, Reservations, Avg lead time,
   Cancellation, Rating — each with ▲/▼ vs the selected comparison.
3. **Occupancy & rate trend** — combo line/area (occupancy vs ADR) over the period.
4. **Booking pace** — cumulative on-the-books vs last-year curve, per upcoming month.
5. **Forward — Next 90 days** — occupancy-on-the-books gauge, revenue on the books, gap-night
   list with a "Set a promo / adjust price" deep link.
6. **Channel & source mix** — donut + table.
7. **Lead time & length of stay** — two histograms.
8. **Cancellations & rating** — small trend + latest review themes.
9. **AI Performance Review card** — headline + score dial, three columns (Working / Improve /
   Avoid), each item expandable with action + deep link; `Regenerate` (rate-limited);
   `Ask about these numbers` opens the assistant.
10. **Playbook** — matched tip/tutorial cards.

States: **loading** skeletons per card; **teaser** (Free/Starter) — KPI strip live, rest
behind a blurred lock + `FeatureGate` CTA; **empty** — "Not enough booking history yet"
with the sample-size needed; **AI-unavailable** — card falls back to deterministic bundle
with a quiet "AI review paused" note. Mobile: single column, each chart in an
`overflow-x:auto` container, 44px targets (`mobile-responsive`).

### Edge functions

| Function                   | Method     | Guard                                                                                    | Purpose                                                          |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `analytics-summary`        | GET        | `serveAuthenticated` + `resolveScopedPropertyAccess('analytics:view')`                   | `?property_id=` / `?org_id=`, `?from=&to=&compare=prior          | yoy`. Full `AnalyticsBundle`when`requirePropertyFeature('analyticsInsights')`passes; slim`{ tier: 'teaser', kpis }` otherwise. |
| `analytics-ai-review`      | GET / POST | same + `requirePropertyFeature` + `assertOrgAndPropertyAiQuota('host_analytics')` (POST) | GET latest row; POST regenerate (rate-limited 1/h/property).     |
| `analytics-ai-review-cron` | POST       | `serveCronPost` (secret)                                                                 | weekly batch refresh + Notification Center ping on score change. |
| `analytics-export`         | GET        | same + `analytics:export`                                                                | CSV (Phase 5) / PDF (`pdfService` pattern).                      |
| AI Dashboard Assistant     | —          | existing                                                                                 | + `get_property_analytics` / `explain_metric` Tier-0 read tools. |

`config.toml`: register the new functions (`verify_jwt = false`); `analytics-ai-review-cron`

- `analytics-export` (PDF) need the `static_files` email/template block only if they render
  templates — otherwise none. Scheduled job via hosted `pg_cron` + `pg_net` (see
  `docs/archive/operations/scheduled-jobs-and-testing.md`), not `config.toml`.

## Implementation tasks

### Phase 0 — Foundation & gating (no visible UI)

- [ ] Migration `…_host_analytics_foundation.sql`: `property_analytics_reviews`,
      `host_playbook_articles` (+ seed rows), `analyticsInsights` → `pricing_plans.features`
      for `growth` / `pro` / `managed`. RLS on, service-role grant.
- [ ] `supabase/functions/_shared/planFeatures.ts` + `ui/src/features/dashboard/plans/lib/planFeatures.ts`
      — add `analyticsInsights: boolean` to type, `DEFAULT_PLAN_FEATURES`, `parsePlanFeatures`
      (keep the two files byte-identical per the matrix doc note).
- [ ] `_shared/planEntitlements.ts` — no change needed if `requirePropertyFeature` is
      key-generic; confirm and add a test.
- [ ] Team RBAC: `analytics:view` / `analytics:export` in
      `ui/src/features/dashboard/team/lib/propertyTeamConstants.ts` +
      `supabase/functions/_shared/propertyTeamPermissions.ts` (kept in sync),
      `propertyPermissionCatalog` (+ `COARSE_PLAN_FEATURES` link to `analyticsInsights`),
      seeded role templates, `org:analytics:view` mirror in `orgPermissions` +
      `propertyTeamPermissions` org catalog.
- [ ] `PropertySection` `'analytics'` in `ui/src/features/dashboard/team/lib/propertyPermissions.ts`;
      `PROPERTY_NAV_VIEW_PERMISSION['Analytics'] = 'analytics:view'` in `adminSidebarNav.ts`;
      nav item (icon `BarChart3`) after **Pricing**; `propertySectionPath` already generic.
- [ ] `_shared/analyticsService.ts` + `_shared/analyticsService_test.ts` — the full
      `AnalyticsBundle` (KPIs w/ prior + YoY deltas, trend, pace, pickup, distributions,
      forward, sufficiency flags). Deterministic, timezone-correct (`Asia/Manila`).
- [ ] `analytics-summary` edge fn + `config.toml` entry; teaser vs full payload.
- [ ] `ui` data layer: `features/dashboard/analytics/hooks/useAnalyticsSummary.ts`
      (TanStack Query, query key includes range + compare), types in `lib/analyticsTypes.ts`.
- [ ] Docs: `plans-feature-matrix.md` row, route-guide stub
      `docs/guides/routes/org/property/analytics.md`, `PROJECT.md` module paragraph,
      `edge-functions.md` row.

### Phase 1 — Analytics page (deterministic)

- [ ] `pages/AnalyticsPage.tsx` + `routes/index.tsx`; register in the property route merge.
- [ ] Controls (`DateRangeControl`, `ComparisonToggle`), KPI strip (`AnalyticsKpiStrip`),
      `OccupancyRateTrendCard`, `ChannelMixCard`, `LeadTimeLosCard`,
      `CancellationRatingCard`.
- [ ] `RequirePropertyPermission section="analytics"`; `FeatureGate('analyticsInsights')`
      teaser wrapper; empty + loading states; mobile pass (`mobile-responsive`).
- [ ] Route guide: fill in `docs/guides/routes/org/property/analytics.md` (sections, save
      = none, permission table, plan gate, empty/teaser states).

### Phase 2 — Forward-looking

- [ ] `BookingPaceCard` (on-the-books vs last-year), `PickupCard`, `NextNinetyDaysCard`
      (occupancy-on-books gauge + gap-night list with deep links).
- [ ] `compare=yoy` mode wired through `analytics-summary` + toggle.
- [ ] Route guide + `PROJECT.md` update.

### Phase 3 — AI Performance Review

- [ ] `host_analytics` in `_shared/aiModelRouter.ts` (`AI_FEATURES` + `FEATURE_MODELS`, flash
      rates) and `isValidAiFeature`; add to `super-admin` AI feature list surfaces.
- [ ] `_shared/analyticsAiReview.ts` (Gemini call, fixed schema, deep-link allow-list,
      `null` on failure) + `_shared/analyticsAiReview_test.ts`.
- [ ] `analytics-ai-review` fn (GET latest / POST regenerate, feature + AI quota gated,
      1/h/property rate limit, `recordAiUsage`) + `config.toml`.
- [ ] `analytics-ai-review-cron` fn + hosted `pg_cron` + `pg_net` schedule; Notification
      Center `analyticsReviewUpdated` event type in `notificationService.ts` +
      `ui/.../notifications`.
- [ ] `AIPerformanceReviewCard` (score dial, 3 columns, expandable items, Regenerate,
      AI-unavailable fallback).
- [ ] Docs: `ai-dashboard-assistant.md` (new `host_analytics` feature), route guide,
      `edge-functions.md`, `PROJECT.md`.

### Phase 4 — Ask Analytics + Playbook

- [ ] `_shared/dashboardAssistantAnalyticsTools.ts` — `get_property_analytics`,
      `explain_metric` (Tier-0, `requirePropertyFeature('analyticsInsights')`); register in
      `dashboardAssistantTools.ts`; add to the assistant tool-count + parity tests.
- [ ] Page "Ask about these numbers" → `assistantOpenStore.ts` with analytics context pinned.
- [ ] `host_playbook_articles` matcher (`_shared/hostPlaybook.ts`) + `PlaybookList` UI;
      wire AI review `improvements[].articleSlugs`.
- [ ] Super-admin Playbook CRUD (reuse `create/update/delete-help-center-faq` +
      `SuperAdmin… ` pattern) at `/admin/playbook` — optional within this phase.
- [ ] Docs: assistant doc tool table, route guide, `admin/*` route guide if the CRUD lands.

### Phase 5 — Org portfolio rollup + export

- [ ] `/org/:orgSlug/analytics` page: portfolio KPIs + per-property leaderboard (reuse
      `analyticsService` per property, aggregate); `org:analytics:view` gate; org nav item.
- [ ] `analytics-export` (CSV always; PDF via `pdfService`) gated by `analytics:export`.
- [ ] Optional privacy-guarded benchmark ("vs Kame median for similar listings"): aggregate
      query with a `>= N` listing minimum, never exposing another listing's figures.
- [ ] Docs: `docs/guides/routes/org/analytics.md`, `PROJECT.md`, matrix export note.

### Phase 6 — Perf (only if needed)

- [ ] `analytics_daily_rollup` + backfill script + incremental nightly cron; switch
      `analyticsService` loader to read the rollup with a live-tail for today.

## Docs to update

- `docs/PROJECT.md` — new Analytics module, routes, edge fns, tables (no new env vars).
- `docs/architecture/edge-functions.md` — `analytics-summary`, `analytics-ai-review`,
  `analytics-ai-review-cron`, `analytics-export` + assistant tools.
- `docs/architecture/plans-feature-matrix.md` — `analyticsInsights` row + tier column values.
- `docs/architecture/ai-dashboard-assistant.md` — `host_analytics` feature, new read tools.
- `docs/guides/routes/org/property/analytics.md` (**new**) and
  `docs/guides/routes/org/analytics.md` (**new**, Phase 5) — sections, permission table,
  plan gate, empty/teaser/AI-unavailable states, "Host-facing knowledge".
- `ui/src/features/dashboard/plans/lib/planPresentation.ts` — compare-matrix row (Dashboard
  or a new "Analytics" group) + `PLAN_TIER_CARD_GAINS` for Pro; then re-check
  `/for-hosts/pricing` and `/org/:orgSlug/plans` tell the same story.
- `docs/guides/routes/for-hosts.md` — pricing/marketing copy for the new capability.
- Route-guide permission tables + `.cursor/rules/route-guides.mdc` route→file map for the new
  routes; `.cursor/rules/plans-and-permissions.mdc` reference-impl list (add `analyticsInsights`).
- `docs/archive/operations/scheduled-jobs-and-testing.md` — the weekly review cron.
- `docs/archive/operations/migration-runbook.md` — the seed/backfill migration.
- `docs/workflow/planned/README.md` — index row (done in this write); on start, move via
  `/workflow-start` and sync `docs/workflow/intake/_to-prompt.md` / `_to-plan.md`.

## Open questions

- **Benchmark minimum-sample threshold** for the optional Phase 5 "vs Kame median" (privacy
  floor) — pick a number when Phase 5 is scoped (candidate: ≥ 8 comparable active listings).
- **Playbook authoring** — ship the ~15–20 seed articles as part of Phase 0's migration
  (proposed), or hand-author in the super-admin CRUD after Phase 4 lands. Proposed: seed now
  so Phase 4's matcher has content, refine later via CRUD.
