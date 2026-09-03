---
stage: planned
title: 'Smart Pricing — AI-assisted dynamic nightly rates'
status: planned
tags: [workflow, planned, pricing, ai, plans, revenue]
updated: 2026-09-04
kind: plan
---

# Smart Pricing — AI-assisted dynamic nightly rates

**Supersedes / expands** the shortlist item #9 "Dynamic pricing suggestions" in
[`ai-opportunities-roadmap.md`](./ai-opportunities-roadmap.md). Sibling power-tool to
[Channel Sync](../../guides/routes/org/property/pricing.md#channel-sync-airbnb-ical) — same
Pricing-page surface, same Pro+ gate shape.

---

## 1. Problem & goal

The Pricing calendar (`/org/:orgSlug/property/:propertySlug/pricing`) is fully manual today:
a host sets a weekday rate, a weekend rate, PH holiday rules, and per-date overrides by hand.
There is **no signal** on which future nights are underpriced (peak weeks left at base) or
overpriced (dead shoulder weeks that never book), and no way to react to how the calendar is
actually filling.

**Goal:** a paid "Smart Pricing" feature, launched from the Pricing page, that:

1. Analyses the property's **own historical calendar** (booked nights, lead times, day-of-week
   and seasonal patterns) plus its **current forward occupancy** and a bundled PH
   season/holiday model, and produces a **recommended nightly rate for every future night** in
   a rolling window.
2. Offers **two ways to use it**: _Autopilot_ (a nightly cron keeps rates optimised
   automatically) and _Review suggestions_ (a diff preview the host applies all / by range /
   dismisses).
3. Is **easy to run with zero config** (sensible defaults) but exposes **Advanced settings**
   (min/max price, aggressiveness, day-of-week, last-minute, orphan-gap, seasonal profiles,
   rounding) for hosts who want fine control.
4. Produces **realistic, defensible** prices — every recommendation carries a factor
   breakdown ("Base ₱2,799 · Weekend +7% · Peak +25% · Booking pace +8% → ₱3,750"), and an
   optional AI pass writes a plain-language rationale and flags where the engine looks off.

### What "attract more guests" means here (scope honesty)

We have **first-party data only** — this property's `guest_submissions` history and forward
calendar. We are **not** buying market/comparable data (no AirDNA, no scraping). So v1
optimises _this listing against its own demand curve_ (fill orphan gaps, discount dead
lead-time, premium-price proven peak weeks), not against the neighbourhood. That is still the
bulk of the revenue lift the popular tools deliver; the market-comp layer is a documented
future phase, not a v1 promise.

---

## 2. How the popular apps do this (research summary)

| Tool                           | Engine shape                                                                             | Host controls                                                                                                                                                                                     | Signals                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Airbnb Smart Pricing**       | Platform algorithm, daily updates                                                        | **Min & max price** (hard bounds), per-date opt-out, custom price still wins                                                                                                                      | Area booking behaviour, lead time, season, day-of-week, local events        |
| **PriceLabs**                  | Deterministic rule + demand engine ("Hyper Local Pulse"), daily                          | **Base price = midpoint anchor** (not floor/ceiling), min price, max price (~3–4× base), min-stay, last-minute & far-out curves, DOW, orphan-gap, occupancy-based rules, custom seasonal profiles | Search volume, booking pace, comp availability, historical occupancy curves |
| **Beyond / Wheelhouse / DPGO** | Same family — base price × stacked multipliers, clamped to min/max, ML demand multiplier | Aggressiveness / "health" profile, 15+ rule knobs (DOW, LOS discounts, orphan days, last-minute, far-out)                                                                                         | PMS occupancy + pace, DOW patterns, seasonality, events                     |

**Key takeaways we adopt:**

- **None of them are LLM-priced.** The number comes from a **deterministic `base × Π(multipliers)` clamped to `[min, max]`** engine. LLMs hallucinate prices — ours does rationale + sanity-check only.
- **Base price is the anchor**, not a bound. Min price is "the single most consequential decision a host makes" — so we surface it hard, and the AI pass suggests one when unset.
- Multiplier stack, in the order the industry uses: **seasonality → day-of-week → holiday/event → lead-time / booking-pace → forward-occupancy tilt → orphan-gap → last-minute / far-out → rounding**.
- Occupancy heuristics: >80% forward occupancy ⇒ stop discounting / premium; <70% ⇒ 10–20% last-minute reduction. Orphan (1–2 night) gaps ⇒ 10–25% fill discount.
- Custom/host-locked prices and per-date opt-out always win over the algorithm.

_Sources: PriceLabs algorithm overview & setup guides (hello.pricelabs.co), Airbnb "What is
Smart Pricing" (airbnb.com/resources), Hostaway & Guesty dynamic-pricing guides, MagicBNB
"PriceLabs vs Wheelhouse vs Beyond 2026"._

---

## 3. Product design

### 3.1 Entry point

New header action on `PropertyPricingPage.tsx`, right of **Channel sync**: **Smart Pricing**
(desktop outline button with a `Sparkles` icon; mobile hero icon). Below the plan tier it
carries a `TierBadge` / `TierBadgeAnchor` on `feature="smartPricing"` (same pattern as
`calendarSync`). Opens `SmartPricingDialog` — a `ResponsiveModal`, **preview-open** below the
gate (browsable), with writes blocked → upgrade modal.

### 3.2 Dialog tabs

**Overview**

- Master **Enable Smart Pricing** switch.
- **Mode**: `Autopilot` (cron keeps rates updated) · `Review only` (never auto-applies; host applies from the Suggestions tab).
- **Min price / Max price** (nightly ₱). Empty allowed but strongly nudged; if empty, engine uses conservative internal bounds (`0.6×`–`2.5×` base) and the AI pass proposes real numbers.
- **Aggressiveness**: `Conservative` / `Balanced` / `Aggressive` — scales how far every multiplier is allowed to deviate from `1.0` (e.g. `0.5×` / `1.0×` / `1.5×` deviation gain).
- **Projected impact** readout: over the next 90 days, `N nights` change, avg `+X%`, "recommended" total vs current total. Read-only, recomputed on open.
- **Last run**: timestamp + trigger (cron / manual) + "Recompute now" button.

**Advanced** (all optional; every field has a safe default)

- **Base price source**: `Use my weekday/weekend rates` (default) · `Set a Smart Pricing base` (weekday + weekend fields).
- **Day-of-week adjustments**: 7 sliders (−30%…+50%), pre-filled from the learned DOW curve, host-overridable.
- **Seasonal profiles**: list of `{name, startDate, endDate, percentage}` — this is the existing `pricing_holiday_rules` concept widened to ranges/seasons. Seeded from `phHolidayRules.ts` + a bundled PH seasonal curve (dry-season Nov–May uplift, wet-season Jun–Oct softening, Holy Week, Christmas–New Year, long weekends).
- **Lead-time curve**: `last-minute` (−% within 3 / 7 / 14 days when that window is under-occupied) and `far-out` (+% beyond 120 days on peak-season nights). Tiered inputs.
- **Orphan-gap fill**: discount % applied to 1–2 night gaps sandwiched between two bookings (default −15%).
- **Forward-occupancy tilt**: rolling 30/60/90-day forward occupancy → global ± up to the aggressiveness cap (>80% ⇒ up, <60% ⇒ down).
- **Length-of-stay discounts**: weekly (≥7 nights) and monthly (≥28 nights) %. _Phase 4 — needs guest-quote support; hidden until then._
- **Rounding**: `nearest 50` (default) / `nearest 99` / `nearest 100` / `none`.
- **Per-night control**: a host-set custom price on the calendar is a **lock** — Smart Pricing never touches it. Each locked night gets a "Let Smart Pricing manage this" affordance to release it.

**Suggestions** (Review-only mode, or "preview before autopilot")

- Diff table: date / contiguous range · list price → **smart price** · Δ% · factor chips.
- Actions: **Apply all**, **Apply range**, **Dismiss** — reusing the frozen-diff pattern from [`ai-assistant-bulk-pricing-chat.md`](./ai-assistant-bulk-pricing-chat.md): the apply call carries the previewed `run_id` and only writes rows that still match, so a stale preview can never blind-replace the calendar.
- Optional AI rationale block per season/segment when the AI pass ran.

### 3.3 Calendar surface

`PricingCalendarGrid` day cells:

- Applied smart nights render the smart price with a small **sparkle** marker, visually
  distinct from a host **custom** (locked) override's existing marker.
- Tooltip = full factor breakdown line.
- `PricingStatsRow` gains a **Smart Pricing: On / Off** chip and an **Avg uplift (90d)** stat.
- Resolution precedence (see §4.3) is implemented once in `getPriceForDate` and mirrored server-side.

---

## 4. Architecture

### 4.1 The engine — `_shared/smartPricingEngine.ts` (pure, deterministic, no I/O)

```
computeSmartRates(input: {
  window: { start: string; end: string };          // rolling forward, e.g. today+1 … today+365
  base: { weekday: number; weekend: number };
  bounds: { min: number | null; max: number | null };
  aggressiveness: 'conservative' | 'balanced' | 'aggressive';
  seasons: SeasonRule[];                            // widened holiday rules
  dowAdjust: Record<0..6, number>;                  // learned + host overrides, %
  leadTime: { lastMinute: Tier[]; farOut: Tier[] };
  orphanGapDiscountPct: number;
  occupancyTilt: { d30: number; d60: number; d90: number };   // forward occupancy ratios
  rounding: 'r50' | 'r99' | 'r100' | 'none';
  bookedDateKeys: Set<string>;                      // never repriced
  blockedDateKeys: Set<string>;
  lockedDateKeys: Set<string>;                      // host custom overrides — skipped
  historyFeatures: HistoryFeatures;                 // from smartPricingData.ts
  today: string;
}): Array<{
  date: string;
  baseRate: number;
  recommendedRate: number;
  factors: Array<{ key: string; label: string; multiplier: number }>;
  clampedBy?: 'min' | 'max';
}>
```

Per night: `raw = base(dow) × seasonMult × dowMult × holidayMult × leadTimeMult ×
occupancyTiltMult × orphanGapMult`, each multiplier's deviation from `1.0` scaled by the
aggressiveness gain, then `clamp(min, max)` then `round(rounding)`. Booked / blocked / locked
nights are emitted with `recommendedRate = null`-equivalent (skipped on write). Fully
unit-testable with synthetic `historyFeatures`; no DB, no network.

### 4.2 Feature extraction — `_shared/smartPricingData.ts`

Reads (service client, per property):

- `guest_submissions` last 24 months (non-`CANCELLED`, non-`IMPORTED`): expand occupied
  nights → **DOW booking distribution**, **month-of-year occupancy index**, **lead-time
  histogram** (submission→check-in), **avg realised nightly** (`booking_rate / number_of_nights`)
  per season bucket.
- Forward calendar (`loadBookedDateKeys` + `loadBlockedDateKeys`) → **d30/d60/d90 forward
  occupancy** and **orphan-gap detection**.
- Cold-start (thin history, < ~15 booked nights): fall back to the bundled PH seasonal curve +
  `pricing_holiday_rules`, force `aggressiveness = conservative`, and rely more on the AI
  sanity pass + host min/max. `historyFeatures.confidence` is surfaced in the UI.

### 4.3 Rate resolution precedence (single source of truth, mirrored client + server)

```
host lock (property_pricing_date_overrides row)         ← unchanged, always wins
  > blocked night
  > booked night (stay pill, no list price)             ← unchanged
  > applied smart recommendation (autopilot on, applied) ← NEW layer
  > holiday / season rule
  > weekend / weekday base
```

Implemented in `_shared/propertyPricing.ts#resolveNightlyRateForDate` (add a
`smartRecommendations?: Record<string, number>` option, resolved just above holiday rules) and
mirrored in `ui/.../pricing/lib/pricingCompute.ts#resolveNightlyRateForDate`. Guest-facing
paths that must pick up smart rates: `get-booked-dates` quote, `submit-form` price
computation, `property-pricing` GET (`calendarBookings` unaffected; add `smartRecommendations`

- `smartPricingEnabled` to the DTO), and the booking pricing-review default
  (`computeDefaultBookingRateFromDefaults`).

> **Decision — keep smart recs in their own table, merge at read.** Not folded into
> `property_pricing_date_overrides`. Clean downgrade (feature lost ⇒ recs ignored, host
> overrides untouched), no change to `savePropertyPricing`, and the "is this custom?" UI check
> stays correct.

### 4.4 Data model (new migrations — never edit shipped ones)

`property_smart_pricing_settings` (1:1 property)
: `property_id PK/FK`, `enabled bool default false`, `mode text check in ('autopilot','review_only') default 'review_only'`, `base_source text check in ('property_rates','custom') default 'property_rates'`, `base_weekday numeric`, `base_weekend numeric`, `min_price numeric`, `max_price numeric`, `aggressiveness text default 'balanced'`, `dow_adjust jsonb`, `season_rules jsonb`, `lead_time jsonb`, `orphan_gap_discount_pct numeric default 15`, `occupancy_tilt_enabled bool default true`, `los_discounts jsonb`, `rounding text default 'r50'`, `window_days int default 365`, `ai_rationale_enabled bool default false`, `last_run_at timestamptz`, `updated_by uuid`, timestamps.

`property_smart_pricing_recommendations` (property × date)
: `property_id FK`, `pricing_date date`, `base_rate numeric`, `recommended_rate numeric`, `factors jsonb`, `applied bool default false`, `applied_at timestamptz`, `source text check in ('engine','engine_ai')`, `run_id uuid FK`, `updated_at`. PK `(property_id, pricing_date)`.

`property_smart_pricing_runs` (audit)
: `id uuid PK`, `property_id FK`, `trigger text check in ('cron','manual_preview','manual_apply')`, `window_start date`, `window_end date`, `nights_computed int`, `nights_changed int`, `avg_delta_pct numeric`, `ai_used bool`, `credits_consumed numeric`, `error text`, `created_by uuid`, `created_at`.

RLS: `ENABLE ROW LEVEL SECURITY` + `GRANT ALL … TO service_role`, no client SELECT policy
(all reads go through edge functions), matching every other property-scoped table.

### 4.5 Edge functions (`serveAuthenticated` / `serveCronPost`, register in `config.toml`, `verify_jwt = false`)

| Function                 | Method                          | Auth / gate                                                                                                                                                    | Job                                                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `smart-pricing-settings` | GET / PATCH                     | `resolveScopedPropertyAccess('pricing:view')`; PATCH also `pricing.rates:edit` + `requirePropertyFeature(propertyId,'smartPricing')` + `catchPlanFeatureError` | Load/save `property_smart_pricing_settings`. GET ungated (preview-open).                                                                                                                                                                                                              |
| `smart-pricing-preview`  | POST                            | `pricing.rates:edit` + `smartPricing` gate                                                                                                                     | Run `smartPricingData` → `computeSmartRates` (+ optional AI pass) **without persisting** applied state; write a `runs` row + `recommendations` rows with `applied=false`; return the diff + `run_id`.                                                                                 |
| `smart-pricing-apply`    | POST `{ run_id, ranges? }`      | `pricing.rates:edit` + `smartPricing` gate                                                                                                                     | Freeze-apply: set `applied=true` on the frozen `run_id` rows within `ranges` (or all), skipping any night that became booked/blocked/locked since the preview. Bump `last_run_at`.                                                                                                    |
| `smart-pricing-cron`     | POST (pg_cron + pg_net, hosted) | shared cron secret                                                                                                                                             | For every property with `enabled && mode='autopilot'` **and** a live `smartPricing` entitlement: recompute the rolling window, upsert recs, mark `applied=true`, emit a `smart_pricing_updated` notification when `nights_changed` or `avg_delta_pct` exceed a threshold. Idempotent. |

Shared: `_shared/smartPricingEngine.ts` (pure), `_shared/smartPricingData.ts` (feature
extraction), `_shared/smartPricingAi.ts` (optional Gemini rationale + sanity flags + min/max
suggestion).

### 4.6 AI layer — additive, credit-metered, never sets raw prices

- Register `smart_pricing` in `_shared/aiModelRouter.ts` `AI_FEATURES` + `FEATURE_MODELS`
  (`gemini-2.5-flash`, `flash` tier, `0.3 / 2.5` per 1M, `defaultMaxOutputTokens ~768`).
  Est. ~$0.002/run ⇒ ~2 credits at `credit_unit_usd = 0.001`.
- `smart-pricing-preview` and (optionally, throttled to weekly) `smart-pricing-cron` call
  `assertOrgAndPropertyAiQuota(orgId, propertyId, 'smart_pricing')` → Gemini → `recordAiUsage({… feature:'smart_pricing', actorType: manual ? 'staff' : 'system' })`. Credits count against `aiMonthlyCreditAllowance`; a quota error degrades gracefully to **engine-only** output (no hard failure — the deterministic curve still returns).
- AI input: the computed curve + `historyFeatures` summary + property context (bed count,
  reviews avg if available, holiday rules). AI output (structured JSON): `seasonRationales[]`,
  `warnings[]` (e.g. "Christmas week only +10% vs. historical +45% realised"),
  `suggestedMinPrice` / `suggestedMaxPrice` when host left them blank. Reuse
  `geminiToolCallClient` / the `marketingTemplateGenerationAi` structured-output shape.
- Global kill switch, per-feature allowlist, cache, and `upgradeHook` behaviour come for free
  from `aiUsageService`.

### 4.7 Plans & permissions

- **New `PlanFeatures` key `smartPricing: boolean`** in `supabase/functions/_shared/planFeatures.ts` **and** the UI mirror `ui/src/features/dashboard/plans/lib/planFeatures.ts` (+ `DEFAULT_PLAN_FEATURES`, `PLAN_FEATURE_LABELS: 'Smart Pricing'`).
- **Seed migration** (mirror `20261213120300_calendar_sync_plan_feature.sql`): `smartPricing: true` on `growth` / `pro` / `managed` / `business_plus`; `false` on `free` / `starter` / `commission`. ⇒ **Pro (`growth`) and above**, same as Channel Sync.
  - _Open decision:_ if the user wants it Business-only (like `aiDashboardAssistant`), flip `growth` to `false`. Recommendation: **Pro+**, because it is a Pricing-page operational tool paired with Channel Sync, and its AI usage is already bounded by `aiMonthlyCreditAllowance` (Pro = 1000 credits/mo).
- **Server gates:** `requirePropertyFeature(propertyId, 'smartPricing')` on all three write
  functions + per-property in the cron sweep (`orgHasPropertyWithFeature` not needed — always
  property-scoped).
- **Client gate:** `useFeatureGate('smartPricing')` for the button + dialog writes;
  `TierBadge feature="smartPricing"`; modal preview-open; `FEATURE_GATE_COPY.smartPricing`.
- **RBAC:** reuse `pricing.rates:edit` (managing Smart Pricing == editing rates) — no new team
  permission leaf. Note in `team.md` / `propertyTeamPermissions.ts` docs that `pricing.rates:edit`
  now also governs Smart Pricing.
- **Compare matrix / cards:** add a `boolRow` for `smartPricing` to `PLAN_FEATURE_ROWS`
  (`pricing` group) in `planPresentation.ts`; add a bullet to `PLAN_TIER_CARD_GAINS.growth`;
  confirm `/for-hosts/pricing` and `/org/:orgSlug/plans` still tell the same story.
- **Downgrade safety:** losing `smartPricing` ⇒ cron skips the property, applied recs stop
  being merged into guest quotes and the calendar (ignored, **not deleted**), settings row
  kept. `SmartPricingDialog` + a Pricing-page banner explain "Smart Pricing paused — your
  manual rates are active." Re-upgrading resumes from the stored settings. This is the
  "view-past-output vs generate-new-output" split from `plans-feature-matrix.md`.

---

## 5. Phased delivery (each phase independently shippable)

### Phase 0 — Schema + entitlement + deterministic engine (no UI, no guest impact)

1. Migrations: three tables (§4.4) + `get_advisors` clean.
2. `planFeatures` key `smartPricing` (both copies) + seed migration + `plans-feature-matrix.md` row.
3. `_shared/smartPricingEngine.ts` (pure) + `_shared/smartPricingData.ts`.
4. `smart-pricing-settings` GET/PATCH + `config.toml` registration.
5. Verification: `type-check`/`lint`/`build`; a `scripts/dev/` determinism harness feeding
   synthetic `historyFeatures` through `computeSmartRates` and asserting clamp/rounding/factor
   math; `get_advisors`.

### Phase 1 — Rate resolution wiring + manual Review/Apply

1. Add `smartRecommendations` option to `resolveNightlyRateForDate` (server + client) and the
   guest quote / availability / pricing-review paths (§4.3). Feature-flagged: only merges when
   `property_smart_pricing_settings.enabled`.
2. `property-pricing` GET DTO: `+ smartRecommendations`, `+ smartPricingEnabled`.
3. `smart-pricing-preview` + `smart-pricing-apply` (engine-only, no AI yet).
4. `SmartPricingDialog` (Overview + Advanced + Suggestions tabs), Pricing-page header button
   with `TierBadge`, calendar sparkle marker + factor tooltip, `PricingStatsRow` chip.
5. Verification: Playwright pass on the dialog + calendar; a night with an applied rec quotes
   at the smart price through `submit-form` and `get-booked-dates`; host lock still wins;
   booked/blocked nights untouched; downgrade path (toggle entitlement off in seed → recs
   ignored).

### Phase 2 — Autopilot cron + notifications + downgrade UX

1. `smart-pricing-cron` + hosted `pg_cron`/`pg_net` schedule (per
   `docs/archive/operations/scheduled-jobs-and-testing.md`) — **not** `config.toml` schedule.
2. `smart_pricing_updated` notification type (`notificationService.ts` +
   `features/dashboard/notifications`) — "Smart Pricing updated N nights (avg +X%)".
3. Downgrade banner + paused-state copy; `reconcile`-style skip in the cron for lost
   entitlement.
4. Verification: run the cron locally against a seeded property; idempotent re-run; notification
   fires only above threshold; disabled/`review_only` properties skipped.

### Phase 3 — AI rationale + sanity flags + min/max suggestion

1. `smart_pricing` in `aiModelRouter` + `_shared/smartPricingAi.ts`.
2. Wire into `smart-pricing-preview` (always) and `smart-pricing-cron` (weekly throttle,
   `ai_rationale_enabled` gate). Graceful degrade to engine-only on quota error.
3. UI: rationale block in Suggestions; "Suggested min ₱X / max ₱Y" prefill when blank;
   warning chips on flagged nights.
4. Verification: credits recorded against `aiMonthlyCreditAllowance`; quota-exhausted org still
   gets engine output; kill-switch respected.

### Phase 4 — Later / optional (separate follow-up plans)

- Length-of-stay (weekly/monthly) discounts — needs guest-quote LOS support first.
- Min-stay-by-season — needs booking-form min-stay enforcement.
- Market/comparable-listing signals — needs an external data source; explicitly out of scope
  until one is chosen.
- Parking-listing parity (`/org/:orgSlug/parking/:parkingSlug/pricing` — base rates only).
- Push smart rates to Airbnb — blocked: Channel Sync is **availability-only** by design.

---

## 6. Risks & mitigations

| Risk                                                          | Mitigation                                                                                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LLM invents unrealistic prices                                | Engine is deterministic; AI does rationale + flags + (blank-only) min/max suggestions, never the raw curve.                                                                    |
| Cold-start property with no history                           | `historyFeatures.confidence`; force conservative aggressiveness; PH seasonal curve fallback; lean on host min/max + AI pass. UI shows "Learning — limited history".            |
| Autopilot surprises a host with a big price swing             | Hard min/max clamp; aggressiveness cap on every multiplier; `smart_pricing_updated` notification; Review-only is the default mode; per-night lock + release.                   |
| Stale preview blind-replaces the calendar                     | `smart-pricing-apply` freezes on `run_id` and re-checks booked/blocked/locked per night (same pattern as `ai-assistant-bulk-pricing-chat.md`).                                 |
| Guest quote / admin pricing-review disagree with the calendar | Single `resolveNightlyRateForDate` precedence, mirrored client/server, with the smart layer in exactly one place.                                                              |
| AI credit blowout from the cron                               | Deterministic core is free; AI pass on cron is weekly-throttled and `ai_rationale_enabled`-gated; per-run cost ~2 credits; counts against existing `aiMonthlyCreditAllowance`. |
| Downgrade leaves stale smart prices live                      | Merge is `enabled && entitled`-gated at read time; recs ignored (not deleted) on downgrade; banner explains.                                                                   |
| Booked nights get repriced                                    | Engine skips `bookedDateKeys`; unchanged existing rule ("no rate change on booked nights").                                                                                    |

---

## 7. Docs to update in the same change (per `documentation-maintenance` + `route-guides`)

- **New:** `docs/architecture/smart-pricing.md` — engine formula, factor list, data model, resolution precedence, cron.
- `docs/PROJECT.md` — new routes/functions/env, `smart_pricing_*` tables, `smartPricing` feature key.
- `docs/guides/routes/org/property/pricing.md` — Smart Pricing section (Host-facing knowledge Q&A, permissions row, API/data table, edge cases) — **`route-guides` skill, mandatory**.
- `docs/architecture/plans-feature-matrix.md` — `smartPricing` row + tier decision + gate inventory entries.
- `docs/guides/routes/org/plans.md` + `for-hosts.md` + `/for-hosts/pricing` copy (`planPresentation.ts`).
- `.cursor/rules/booking-workflow.mdc` — note the smart layer in the nightly-rate resolution order (pricing feeds the booking pricing-review default).
- `docs/archive/operations/scheduled-jobs-and-testing.md` — `smart-pricing-cron`.
- `ai-opportunities-roadmap.md` — mark #9 as promoted to this plan.
- `docs/workflow/planned/README.md` — add the row (done with this plan).

---

## 8. Open decisions for the user

1. **Tier gate:** Pro (`growth`) + [recommended, matches Channel Sync] vs Business (`pro`) + [matches `aiDashboardAssistant`].
2. **Default mode:** `review_only` [recommended — safer first impression] vs `autopilot`.
3. **Rolling window length:** 365 days [recommended] vs 180.
4. **AI rationale on by default?** Off by default (`ai_rationale_enabled=false`), host opts in — keeps credit spend predictable. Confirm.
5. **Rounding default:** `nearest 50` PHP — confirm vs `nearest 99`.
6. Whether to add a dedicated `pricing.smart:manage` RBAC leaf (default: no, reuse `pricing.rates:edit`).

---

Back to [planned work index](./README.md).
