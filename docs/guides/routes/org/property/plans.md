---
title: 'Property Plans — operator guide'
status: active
tags: [guides, routes, org, property]
updated: 2026-08-18
---

# Property Plans — operator guide

Route: `/org/:orgSlug/property/:propertySlug/plans`

> **Status:** Documented

## Progress overview

| Section | E2E save | Validation | Docs | Notes                           |
| ------- | -------- | ---------- | ---- | ------------------------------- |
| Plans   | Yes      | Server     | Done | Free assign + PayMongo checkout |

---

## Overview

Property-scoped subscription tier comparison (5 flat monthly plans). Owners can switch to the Free tier immediately or pay for a paid tier via PayMongo (QRPH, Maya, online banking).

**Access:** any property member with **`settings:view`**. Plan changes require org **owner** (or platform admin).

**Page title:** `${Property Name} - Plans`

**Page description:** “Manage the subscription for this listing — upgrade anytime as you grow.” (desktop header; mobile inline below hero).

---

## Behavior

- **Layout:** current-plan banner, then **Plans / Compare / Billing** tabs (PMA-style). No Usage tab — property billing is per listing, not org-wide. Each tab shows a section title (**Choose your plan**, **Compare features**, **Billing**).
- **Plans tab:** responsive plan carousel — **1** card on phone, **2** from `md` (tablet), **3** from `lg` (desktop). Full incremental feature list on each card. When there are more tiers than fit one row, **prev/next arrows** beside **Choose your plan** advance by **almost a full page** (desktop: **2** cards) so the last view stays **filled** — e.g. Free–Pro → Pro–Managed — with a **horizontal slide** animation (respects reduced motion). Opens with your current or recommended tier in view.
- **Plans cards:** full incremental feature list for each tier (no “+N more” truncation). Free through Business use curated copy that merges **new seat/publish/search limits** with the **previous middle- and top-tier feature sets**. **All tier cards share the same height** — feature lists use a shared min-height so CTAs align across the row. Free tier price shows **₱0/mo**. Paid tiers show a **teal `{n}% off` pill**, **discounted host price** (whole pesos, rounded down), and **struck-through list price** when `discount_percent` &gt; 0. Plan titles use **text-lg**. Promo pills (**Best value** on Starter, **Most popular** on Pro, **Recommended** on Business, **Hands-off hosting** on Managed) and **Current** sit on a **second row below the title** on typical **14–16″ laptop** widths (below **1800px** viewport); from **1800px** up they align **inline beside the title** on one row. **Current** plan card uses a primary border, white surface, light ring, and a **soft primary** “Current plan” control (not a greyed-out disabled outline).
- **Upgrade actions:** every upgrade tier uses the primary button; only **Current** and **Downgrade** stay outline. **Managed** uses **Contact sales** and opens **Help & Support → New ticket** (business inquiry) instead of PayMongo checkout.
- **Compare tab:** dedicated scrollable feature matrix with sticky feature column, grouped headers (**Core tools** baseline rows on every tier; **Managed hosting** for Managed-only perks), and per-column actions — not a collapsible accordion. Column headers use a fixed two-row price block (strikethrough list price + **nowrap** discount pill, then discounted price + `/month`) so tiers stay aligned.
- **Billing tab:** subscription summary (plan, amount, renewal) plus **Recent payments** list.
- **FAQs:** accordion below the tabs — per-listing billing, PayMongo renewal, grace/suspension, downgrades, AI credits, and Managed sales flow.
- Current plan is ring-highlighted with a **Current** badge; the next step uses the solid primary button and **Recommended** badge.
- **Owner:** **Select** / **Upgrade** opens a review dialog — **Confirm plan** on Free calls **`property-plan`** POST; **Continue to payment** on paid tiers calls **`create-subscription-checkout`** and redirects to PayMongo.
- **Non-owner:** view-only (no action buttons in tier or compare rows).
- **Current plan summary:** PMA-style banner — primary gradient border, **tier-specific icon** (Free = circle, Starter = zap, Pro = trending-up, Business = sparkles, Managed = heart-handshake, Commission = percent), **{Plan} plan** title with **Current** badge, **₱X/month · Next billing: …** line, and owner actions **Manage subscription** (Billing tab) plus **Upgrade to {tier}** / **Contact sales** for Managed. **Pay now** / **Resume payment** when billing needs attention.
- **Recent payments:** up to 10 **`property_payment_transactions`** rows with status badges and payment method.
- After successful payment, **`paymongo-webhook`** assigns the plan and sets **`current_period_start`** / **`current_period_end`** (+1 month).
- **`past_due`:** banner on property routes; full access until grace expires.
- **`suspended`:** dashboard restricted to **Plans** and **Help & Support** only (`RequirePropertySubscriptionAccess`); guest-facing booking flows unaffected.

**Upgrade modal CTA:** **`SubscriptionUpgradeModal`** routes paid-feature prompts to this page.

## Tier ladder (host-facing)

Internal plan codes stay stable in the database; hosts see these names:

| Display name | Internal code | Monthly (PHP)       | Highlights                                                                                                   |
| ------------ | ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Free**     | `free`        | ₱0                  | Dashboard, manual bookings, guest form, manual documents, finance, maintenance, notifications                |
| **Starter**  | `starter`     | ₱499 → **₱399**     | 20% off list · pricing management, public listing, automated documents, verified badge, 3 team members       |
| **Pro**      | `growth`      | ₱999 → **₱799**     | 20% off list · 5 seats, 30 publishes/channel, top-30 search, AI validation, recommended badge, 1k AI credits |
| **Business** | `pro`         | ₱1,799 → **₱1,439** | 20% off list · 10 seats, unlimited publishing, top-15 search, full AI toolkit, 10k AI credits                |
| **Managed**  | `managed`     | ₱4,999 → **₱3,999** | 20% off list · Business capabilities + 30k AI credits/mo, full-service ops                                   |

---

## API

| Method | Edge function                  | Auth            | Notes                      |
| ------ | ------------------------------ | --------------- | -------------------------- |
| GET    | `property-plan`                | `settings:view` | `?property_id=`            |
| POST   | `property-plan`                | Owner only      | Free plan only; paid → 400 |
| POST   | `create-subscription-checkout` | Owner only      | Returns **`checkoutUrl`**  |

---

## Implementation map

| Layer         | Path                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| Page          | `ui/src/features/dashboard/plans/pages/PropertyPlansPage.tsx`             |
| Summary card  | `ui/src/features/dashboard/plans/components/CurrentPlanSummary.tsx`       |
| Tier carousel | `ui/src/features/dashboard/plans/components/PlanTierRail.tsx`             |
| Billing tab   | `ui/src/features/dashboard/plans/components/PlanBillingPanel.tsx`         |
| Matrix        | `ui/src/features/dashboard/plans/components/PlanFeatureMatrix.tsx`        |
| FAQs          | `ui/src/features/dashboard/plans/components/PlanFaqSection.tsx`           |
| Review dialog | `ui/src/features/dashboard/plans/components/PlanReviewDialog.tsx`         |
| Payments list | `ui/src/features/dashboard/plans/components/PropertyPlanTransactions.tsx` |
| Hook          | `ui/src/features/dashboard/plans/hooks/usePropertyPlan.ts`                |
| API           | `ui/src/features/dashboard/plans/lib/propertyPlanApi.ts`                  |
| Edge          | `property-plan`, `create-subscription-checkout`, `paymongo-webhook`       |

---

## Host-facing knowledge

- Pricing is **per listing**, not per organization.
- Paid upgrades open PayMongo in the browser; the plan activates after payment clears (usually within seconds).
- Downgrading to Free takes effect immediately for the listing.
- Renewal reminder emails are sent before period end; unpaid listings become **past due**, then **suspended** after the grace period — pay from Plans to restore dashboard access.
