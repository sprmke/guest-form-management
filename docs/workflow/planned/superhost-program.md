---
title: 'Superhost program — dual-track trust badge (detailed plan)'
status: active
tags: [workflow, planned, superhost, trust, moderation, production-readiness]
updated: 2026-08-30
stage: planned
kind: plan
---

# Superhost program — dual-track trust badge

**Authoritative implementation plan** for the Kame Homes Superhost module. Use this doc for go/no-go, task breakdown, and acceptance criteria. When implementation starts, run `/workflow-start` and move tracking to [`../in-progress/`](../in-progress/).

**Related (already shipped partial):**

- Property settings submit UI + public badge wiring
- [`docs/guides/routes/org/property/settings.md`](../../guides/routes/org/property/settings.md) § Superhost
- [`docs/guides/routes/admin/approvals.md`](../../guides/routes/admin/approvals.md) — Superhost moderation listed as pending
- [`docs/archive/todos/BACKLOG_DRAFT.md`](../../archive/todos/BACKLOG_DRAFT.md) § External reviews, Superhost

---

## TL;DR

| Item                    | Decision                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **What we're building** | Dual-track Superhost: **Track A** imported Airbnb proof (complete moderation) + **Track B** earned Kame Superhost (Airbnb-style metrics) |
| **Track A scope**       | Per **property** — proof URL + screenshot, super-admin approve/reject, 12-month expiry                                                   |
| **Track B scope**       | Per **organization** — rolling 365-day criteria, quarterly assessment cron                                                               |
| **Public badge**        | `isSuperhost = importedApprovedNotExpired OR orgEarnedSuperhost`                                                                         |
| **Ship order**          | Phase 0 moderation first → expiry → metrics → engine → host UX → QA                                                                      |
| **Effort**              | ~8–13 focused dev days across all phases                                                                                                 |
| **Hard dependency**     | Track B response-rate metric needs inbox instrumentation (Phase 2)                                                                       |

---

## 1. Goal and success criteria

### 1.1 Goal

Ship a production-ready Superhost module so:

1. Hosts can **import** an existing Airbnb Superhost status (proof + moderation) or **earn** Kame Superhost through platform performance.
2. Guests see a credible **Superhost badge** on public property pages, showcase templates, search cards, and host cards when either track qualifies.
3. Platform operators can **moderate imported claims** from `/admin/approvals` with the same patterns as external reviews.
4. The system **reassesses earned status quarterly** and **expires imported proof annually** — no stale badges.

### 1.2 Definition of done (program-level)

- [ ] Host submits imported proof → row appears in super-admin queue within one list refresh.
- [ ] Super-admin approve → public `isSuperhost: true` on that property (Track A).
- [ ] Super-admin reject with reason → host sees Rejected + reason; badge hidden.
- [ ] Org meeting all four earned criteria at assessment → all org properties show badge (Track B).
- [ ] Org losing criteria at next assessment → badge removed org-wide (Track B).
- [ ] Imported proof older than 12 months without re-proof → `expired`; badge hidden unless Track B earned.
- [ ] Host org settings shows four criterion rows with current values and next assessment date.
- [ ] All new edge functions documented in `docs/PROJECT.md` and `docs/architecture/edge-functions.md`.
- [ ] Route guides updated; QA doc `docs/workflow/qa/property-dashboard/20-superhost.md` written.
- [ ] `bun run ci:quality` passes after each phase merge.

---

## 2. Competitive UX research

### 2.1 Frame

| Question         | Answer                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Job**          | Signal host reliability so guests book direct with confidence                                                                     |
| **Role**         | Host (submit/earn) · Operator (moderate) · Guest (see badge)                                                                      |
| **Surface**      | Property settings (host) · Org settings (host progress) · `/admin/approvals` (operator) · Public property/search/showcase (guest) |
| **Commit point** | Super-admin approve (imported) · Quarterly cron flip (earned)                                                                     |

### 2.2 Airbnb (primary benchmark)

**Model:** Automatic earned badge — no application button.

**Four criteria** (all required simultaneously, rolling **365 days**):

| Criterion         | Threshold                                                   |
| ----------------- | ----------------------------------------------------------- |
| Overall rating    | ≥ 4.8 / 5                                                   |
| Response rate     | ≥ 90% of new inquiries answered within **24 hours**         |
| Cancellation rate | < 1% (host-initiated)                                       |
| Activity          | ≥ 10 completed stays **OR** ≥ 3 stays totaling ≥ 100 nights |

**Assessment calendar:** Quarterly on **Jan 1, Apr 1, Jul 1, Oct 1** (Asia/Manila for Kame). Badge granted within ~1 week of assessment if eligible; **revoked with no grace period** if criteria slip.

**Scope:** **Account-level** (host owner). Co-host listings excluded on Airbnb — Kame uses org owner + team RBAC instead.

**Benefits (Airbnb):** Search ranking boost, filter, profile badge, optional travel credits. **Kame v1:** badge display only; search boost deferred.

**Sources:** [Airbnb Help — Superhost requirements](https://www.airbnb.com/help/article/829), [Airbnb Resource Center](https://www.airbnb.com/resources/hosting-homes/a/how-to-become-a-superhost-702).

### 2.3 PMS leaders (Guesty, Hostaway, Lodgify, Hospitable)

| Pattern                    | Finding                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| Native Superhost program   | **None** — PMS tools verify **guests**, not host Superhost status |
| Host trust on direct sites | Embedded OTA reviews (Revyoos), HTTPS, displayed star ratings     |
| Operator vetting           | Manual onboarding / KYC separate from guest-facing badge          |

**Implication:** Kame owns the guest marketplace — a **native earned badge** is differentiated. **Imported Airbnb proof** bootstraps trust while Kame booking volume is still low.

### 2.4 Adopt / adapt / skip for Kame Homes

| Adopt                            | Adapt                                  | Skip (v1)                    |
| -------------------------------- | -------------------------------------- | ---------------------------- |
| Dual path: import + earn         | Per-property import, per-org earn      | Airbnb travel coupons        |
| Four Airbnb criteria for Track B | Kame reviews only for rating (v1)      | Co-host exclusion logic      |
| Quarterly assessment dates       | Manila TZ; cron + idempotent markers   | Auto-scrape Airbnb profile   |
| Super-admin moderation queue     | Mirror external review dialog          | Parking-scoped Superhost     |
| Minimal copy (`minimal-ui-copy`) | Org settings section vs new nav item   | Search ranking boost         |
| Existing public badge components | Merge Track A + B in one `isSuperhost` | Superhost-only voucher perks |

---

## 3. Locked product decisions

These defaults apply unless explicitly overridden before Phase 0 starts.

| #   | Topic                       | Decision                                                                                                    | Rationale                                                                                 |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| D1  | Program model               | Dual-track (imported + earned)                                                                              | Matches market leader + bootstraps low-volume hosts                                       |
| D2  | Imported scope              | Per **property**                                                                                            | Airbnb proof is listing/host-profile specific                                             |
| D3  | Earned scope                | Per **organization**                                                                                        | Matches Airbnb account-level Superhost                                                    |
| D4  | Badge propagation (Track B) | All **active** properties in org inherit earned badge                                                       | Default `superhost_inherit_org_badge: true` on property settings (optional opt-out later) |
| D5  | Track precedence            | **Either track qualifies** — OR logic for public badge                                                      | Earned org badge survives imported expiry on that property                                |
| D6  | Rating source (Track B)     | **`guest_reviews` only** for v1                                                                             | Clean audit trail; external OTA stars excluded from earned average                        |
| D7  | Activity window             | Rolling **365 days**, org-wide `COMPLETED` bookings                                                         | Same as Airbnb                                                                            |
| D8  | Response rate window        | Rolling **365 days** for assessment; per-thread 24h SLA                                                     | Aligns with Airbnb annual window                                                          |
| D9  | Cancellation attribution    | **`CANCELLED` via admin `cancel-booking`** counts as host-initiated; guest form self-cancel TBD (see §12.3) | Conservative: only confirmed admin cancels in v1                                          |
| D10 | Imported expiry             | **12 months** from `superhost_approved_at` → `expired`                                                      | Annual re-proof                                                                           |
| D11 | Resubmit on edit            | Any change to verification URL or proof image → `pending` (existing behavior)                               | Re-moderation required                                                                    |
| D12 | Reject reason               | **Required** short note stored + shown to host                                                              | Same as verification tiers                                                                |
| D13 | Plan tier gate              | **None** — all tiers                                                                                        | Trust is not paywalled                                                                    |
| D14 | Host progress UI            | **Org settings → Trust** section                                                                            | Avoid nav sprawl                                                                          |
| D15 | Super-admin revoke          | Approve/Reject on pending; **Revoke** action on approved imported (sets `rejected` + reason)                | Ops needs clawback without host edit                                                      |
| D16 | Parking                     | Out of v1                                                                                                   | Property bookings only                                                                    |
| D17 | Notifications               | Email org owner on: import approve/reject/revoke, earned gained, earned lost                                | No Telegram in v1                                                                         |

---

## 4. Current state inventory

### 4.1 Database (shipped)

Migration: `supabase/migrations/20260714210000_property_external_reviews.sql`

| Column                                    | Type   | Notes                                                        |
| ----------------------------------------- | ------ | ------------------------------------------------------------ |
| `app_settings.superhost_verification_url` | `TEXT` | Optional Airbnb profile URL                                  |
| `app_settings.superhost_proof_image_url`  | `TEXT` | Storage path / public URL                                    |
| `app_settings.superhost_status`           | `TEXT` | `none \| pending \| approved \| rejected` (CHECK constraint) |

**Not yet in DB:** `superhost_approved_at`, `superhost_rejection_reason`, `expired` status, org-level earned JSONB, inbox metrics table.

### 4.2 Edge functions (shipped)

| Function                    | Superhost behavior                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `app-settings` PATCH        | Sets URL; touching URL/proof sets `superhost_status = pending` unless already approved (proof-only touch still pending on non-approved) |
| `upload-app-settings-asset` | `assetType: superhost_proof` uploads image; sets `pending`                                                                              |
| `get-public-property`       | `isSuperhost = superhost_status === 'approved'`                                                                                         |
| `list-public-properties`    | Page-level superhost enrichment                                                                                                         |
| `list-public-place-groups`  | Facet enrichment                                                                                                                        |

**Not shipped:** `moderate-superhost`, `get-superhost-assets`, `get-org-superhost-progress`, crons.

### 4.3 Shared server modules (shipped)

| File                                                     | Role                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `supabase/functions/_shared/propertyExternalReviews.ts`  | `SuperhostStatus`, `normalizeSuperhostStatus()`                                    |
| `supabase/functions/_shared/appSettings.ts`              | DTO fields `superhostVerificationUrl`, `superhostProofImageUrl`, `superhostStatus` |
| `supabase/functions/_shared/publicPropertyService.ts`    | Resolves `isSuperhost` for public detail                                           |
| `supabase/functions/_shared/settingsPatchPermissions.ts` | `superhostVerificationUrl` → `settings.socials:edit`                               |

### 4.4 UI (shipped)

| File                                                                                         | Role                                    |
| -------------------------------------------------------------------------------------------- | --------------------------------------- |
| `ui/.../property-settings/PropertySuperhostVerificationBlock.tsx`                            | Manage modal: URL + proof upload        |
| `ui/.../property-settings/PropertyGuestRewardsSection.tsx`                                   | Embeds Superhost block in Guest rewards |
| `ui/.../org/lib/propertyExternalReviews.ts`                                                  | Client mirror of status types + labels  |
| `ui/.../org/lib/propertySettingsSave.ts`                                                     | Save path + field error mapping         |
| `ui/.../org/lib/propertySettingsCompletion.ts`                                               | URL validation                          |
| `ui/src/features/guest/marketing/properties/components/property-detail/PropertyOverview.tsx` | Superhost badge + tooltip               |
| `ui/src/features/guest/marketing/shared/components/ListingHostCard.tsx`                      | Host card badge                         |
| `ui/src/features/guest/marketing/showcase/templates/haven/HavenSections.tsx`                 | Showcase host label                     |

### 4.5 Gaps (must ship)

| Gap                                        | Impact                                |
| ------------------------------------------ | ------------------------------------- |
| No super-admin queue row                   | Hosts stuck in `pending` forever      |
| No moderate endpoint                       | Cannot approve/reject                 |
| No rejection reason column                 | Host gets no feedback                 |
| No expiry                                  | Stale imported badges                 |
| No earned engine                           | No Kame-native Superhost              |
| No inbox response metrics                  | Cannot compute Track B response rate  |
| No host progress UI                        | Hosts cannot see path to earned badge |
| `publicPropertyService` ignores org earned | Track B invisible on public pages     |

---

## 5. Target architecture

### 5.1 System diagram

```mermaid
flowchart TB
  subgraph HostProperty [Property dashboard]
    PS[Property Settings Guest rewards]
    PS -->|URL + proof| AS[app-settings PATCH]
    AS -->|pending| DB[(app_settings)]
  end

  subgraph HostOrg [Org dashboard]
    OS[Org Settings Trust section]
    OS -->|read progress| GOP[get-org-superhost-progress]
  end

  subgraph SuperAdmin [Platform admin]
    AQ[/admin/approvals]
    AQ --> LSA[list-super-admin-approvals]
    AQ --> MS[moderate-superhost]
    MS --> DB
  end

  subgraph Cron [Scheduled jobs]
    IE[superhost-import-expiry-cron]
    SA[superhost-assessment-cron]
    IE --> DB
    SA --> MET[superhostMetrics]
    SA --> ORG[(organizations.settings.superhost)]
  end

  subgraph Public [Guest-facing]
    GPP[get-public-property]
    LPP[list-public-properties]
    GPP --> RES{isSuperhost?}
    RES -->|Track A| DB
    RES -->|Track B| ORG
  end

  subgraph Inbox [Inbox layer]
    SM[social_messages]
    ITM[inbox_thread_metrics]
    SM --> ITM
    MET --> ITM
    MET --> GR[(guest_reviews)]
    MET --> GS[(guest_submissions)]
```

### 5.2 Public badge resolution algorithm

```typescript
function resolveIsSuperhost(input: {
  superhostStatus: SuperhostStatus;
  superhostApprovedAt: string | null;
  orgSuperhostEarned: boolean;
  now: Date;
}): boolean {
  const importedActive =
    input.superhostStatus === 'approved' &&
    !isImportedSuperhostExpired(input.superhostApprovedAt, input.now);

  return importedActive || input.orgSuperhostEarned;
}

function isImportedSuperhostExpired(approvedAt: string | null, now: Date): boolean {
  if (!approvedAt) return false; // legacy rows: treat as non-expired until backfill + cron
  const expiry = addMonths(parseISO(approvedAt), 12);
  return now >= expiry;
}
```

**Call sites to update (Phase 1 + 3):**

- `supabase/functions/_shared/publicPropertyService.ts`
- `supabase/functions/list-public-properties/index.ts` (batch enrichment)
- `supabase/functions/list-public-place-groups/index.ts` (if applicable)
- `ui/src/features/guest/marketing/properties/lib/mapPublicPropertyDetail.ts` (if client-side mirror exists)

### 5.3 State machine — Track A (imported)

```text
                    ┌─────────┐
         initial ──►│  none   │
                    └────┬────┘
                         │ host saves URL or uploads proof
                         ▼
                    ┌─────────┐
              ┌────►│ pending │◄────┐
              │     └────┬────┘     │ host edits proof / resubmit
              │          │          │
              │   approve│   reject │
              │          ▼          ▼
              │     ┌─────────┐ ┌─────────┐
              │     │approved │ │rejected │
              │     └────┬────┘ └────┬────┘
              │          │           │
              │   12mo   │           │ host resubmits
              │   cron   ▼           └──────────┐
              │     ┌─────────┐                   │
              └─────│ expired │◄── super-admin revoke (from approved)
                    └─────────┘
```

| Transition            | Actor              | Side effects                                     |
| --------------------- | ------------------ | ------------------------------------------------ |
| `none → pending`      | Host save / upload | Queue row appears                                |
| `pending → approved`  | Super-admin        | Set `superhost_approved_at = now()`; email owner |
| `pending → rejected`  | Super-admin        | Set `superhost_rejection_reason`; email owner    |
| `approved → pending`  | Host edits proof   | Clear `superhost_approved_at`; hide badge        |
| `approved → expired`  | Cron (12mo)        | Email owner; hide badge unless Track B           |
| `approved → rejected` | Super-admin revoke | Set reason; email owner                          |
| `rejected → pending`  | Host resubmit      | Clear reason                                     |

### 5.4 State machine — Track B (earned)

```text
each quarterly assessment (org-level):

  compute criteria snapshot
       │
       ├─ all four met AND previously not earned ──► earned = true, earnedAt = now, email "earned"
       ├─ all four met AND already earned ──► refresh snapshot only
       ├─ any not met AND previously earned ──► earned = false, email "lost"
       └─ any not met AND not earned ──► earned = false, update snapshot
```

**Idempotency:** Store `lastAssessmentKey` (e.g. `2026-Q3`) in org JSONB; skip if already processed for that key unless manual re-run.

---

## 6. Data model (new migrations)

### 6.1 Phase 1 — Track A columns

**Migration:** `supabase/migrations/YYYYMMDDHHMMSS_superhost_import_hardening.sql`

```sql
-- Extend status enum
ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_superhost_status_check;
ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_superhost_status_check
  CHECK (superhost_status IN ('none', 'pending', 'approved', 'rejected', 'expired'));

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS superhost_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superhost_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS superhost_submitted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.app_settings.superhost_approved_at IS
  'Set on super-admin approve; used for 12-month imported expiry.';
COMMENT ON COLUMN public.app_settings.superhost_rejection_reason IS
  'Required on super-admin reject/revoke; shown to host.';
COMMENT ON COLUMN public.app_settings.superhost_submitted_at IS
  'Last time host submitted or resubmitted proof (pending start).';
```

**Backfill (same migration):**

- Rows with `superhost_status = 'approved'` and null `superhost_approved_at` → set `superhost_approved_at = updated_at` (best effort).
- Rows with `superhost_status = 'pending'` → set `superhost_submitted_at = updated_at`.

### 6.2 Phase 2 — Inbox response metrics

**Migration:** `supabase/migrations/YYYYMMDDHHMMSS_inbox_thread_metrics.sql`

```sql
CREATE TABLE IF NOT EXISTS public.inbox_thread_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.social_conversations (id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties (id) ON DELETE SET NULL,
  first_guest_message_at TIMESTAMPTZ NOT NULL,
  first_host_reply_at TIMESTAMPTZ,
  responded_within_24h BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inbox_thread_metrics_conversation_unique UNIQUE (conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_thread_metrics_org_first_guest
  ON public.inbox_thread_metrics (organization_id, first_guest_message_at DESC);

ALTER TABLE public.inbox_thread_metrics ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.inbox_thread_metrics TO service_role;
```

**Metric row lifecycle:**

1. On first **inbound** message in a conversation (guest/message from external participant): insert row with `first_guest_message_at`.
2. On first **outbound** host reply after that inbound: set `first_host_reply_at`, compute `responded_within_24h = (reply - first_guest) <= 24 hours`.
3. Ignore subsequent messages in same conversation for Superhost (Airbnb counts thread-level first response).

**Backfill script:** `scripts/dev/backfill-inbox-thread-metrics.mjs` — read `social_messages` ordered by `created_at`, best-effort populate historical rows. Non-blocking for Phase 2 ship.

### 6.3 Phase 3 — Org earned snapshot

**Storage:** `organizations.settings.superhost` JSONB (no new table).

**TypeScript shape** (mirror in `_shared/superhostAssessment.ts` + `ui/.../org/lib/superhost.ts`):

```typescript
type OrgSuperhostSettings = {
  earned: boolean;
  earnedAt: string | null;
  lostAt: string | null;
  lastAssessmentAt: string | null;
  lastAssessmentKey: string | null; // e.g. "2026-Q3"
  nextAssessmentAt: string | null; // ISO, Asia/Manila midnight
  criteria: {
    rating: SuperhostCriterionSnapshot;
    responseRate: SuperhostCriterionSnapshot;
    cancellationRate: SuperhostCriterionSnapshot;
    activity: SuperhostActivityCriterionSnapshot;
  };
  history: SuperhostAssessmentHistoryEntry[]; // cap at 8 entries
};

type SuperhostCriterionSnapshot = {
  value: number | null; // null = insufficient data
  required: number;
  met: boolean;
  sampleSize: number; // e.g. review count, thread count
};

type SuperhostActivityCriterionSnapshot = SuperhostCriterionSnapshot & {
  completedStays: number;
  qualifyingLongStayGroups: number; // stays in 100+ night groups
  metVia: 'ten_stays' | 'long_stays' | 'none';
};
```

**Assessment idempotency table (optional but recommended):**

```sql
CREATE TABLE IF NOT EXISTS public.superhost_assessment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_key TEXT NOT NULL, -- "2026-Q3"
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  earned_before BOOLEAN NOT NULL,
  earned_after BOOLEAN NOT NULL,
  criteria_snapshot JSONB NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger TEXT NOT NULL DEFAULT 'cron', -- 'cron' | 'manual'
  CONSTRAINT superhost_assessment_runs_unique UNIQUE (assessment_key, organization_id)
);
```

---

## 7. Metric computation (Track B)

All metrics computed in `_shared/superhostMetrics.ts` with signature:

```typescript
export async function computeOrgSuperhostMetrics(
  organizationId: string,
  windowEnd: Date, // assessment instant, Manila
  windowDays = 365
): Promise<OrgSuperhostMetrics>;
```

### 7.1 Overall rating (≥ 4.8)

**Source:** `guest_reviews` joined to `properties.organization_id`.

```sql
SELECT AVG(star_rating::numeric), COUNT(*)
FROM guest_reviews gr
JOIN properties p ON p.id = gr.property_id
WHERE p.organization_id = $orgId
  AND gr.created_at >= $windowStart
  AND gr.created_at < $windowEnd;
```

| Rule           | Detail                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Minimum sample | **≥ 3 reviews** in window to evaluate; else `value: null`, `met: false`, UI shows "Need more reviews" |
| Rounding       | Store `value` to 2 decimal places; `met = value >= 4.8`                                               |
| Excluded       | External reviews (Airbnb/Facebook JSONB), parking-only orgs with zero property reviews                |

### 7.2 Response rate (≥ 90% within 24h)

**Source:** `inbox_thread_metrics` for org where `first_guest_message_at` in window.

```typescript
const eligible = rows.filter((r) => r.first_guest_message_at in window);
const responded = eligible.filter((r) => r.first_host_reply_at != null);
const within24h = responded.filter((r) => r.responded_within_24h === true);
const rate = responded.length === 0 ? null : within24h.length / eligible.length;
// met = rate !== null && rate >= 0.9
```

| Rule               | Detail                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Minimum sample     | **≥ 5 threads** with inbound in window; else insufficient data                           |
| Unanswered threads | Count as **not** within 24h (denominator = all eligible threads)                         |
| Scope              | Org-level inbox (property_id optional on metrics row for future per-property drill-down) |

### 7.3 Cancellation rate (< 1%)

**Source:** `guest_submissions` for org properties.

**Denominator:** Bookings with `check_in_date` (normalized) falling in `[windowStart, windowEnd)` and status **not** a pre-arrival discard (include `COMPLETED`, `CANCELLED`, and in-pipeline statuses that represent accepted bookings — **exclude** `PENDING_REVIEW` that never proceeded if never confirmed — see §12.3).

**Numerator:** Bookings transitioned to `CANCELLED` via **`cancel-booking`** edge (admin/host-initiated) in window.

```typescript
const rate = denominator === 0 ? null : numerator / denominator;
// met = rate !== null && rate < 0.01
```

| Rule              | Detail                                                                        |
| ----------------- | ----------------------------------------------------------------------------- |
| Minimum sample    | **≥ 10 denominator bookings**; else insufficient data                         |
| Guest self-cancel | **Excluded from numerator in v1** unless we add `cancelled_by` column (§12.3) |

### 7.4 Activity (≥ 10 stays OR ≥ 3 stays totaling ≥ 100 nights)

**Source:** `guest_submissions` where `status = 'COMPLETED'` and checkout in window (or checkout/completion timestamp if available).

```typescript
const completed = /* COMPLETED stays in window, org-wide */;
const stayCount = completed.length;
const nightTotals = completed.map(b => nightsBetween(b.checkIn, b.checkOut));
const longStayGroups = /* count groups of stays each >= 100 nights total across >= 3 reservations */;
const met =
  stayCount >= 10 ||
  (longStayGroups >= 3 && sumTop3LongStays >= 100);
```

| Rule               | Detail                                                        |
| ------------------ | ------------------------------------------------------------- |
| Nights calculation | Use existing date normalizers (`_shared/utils.ts`, Manila TZ) |
| Cross-property     | Sum across all properties in org                              |

### 7.5 Assessment schedule helper

```typescript
const ASSESSMENT_MONTHS = [1, 4, 7, 10]; // Jan, Apr, Jul, Oct
const ASSESSMENT_DAY = 1;
const TZ = 'Asia/Manila';

function currentAssessmentKey(now: Date): string {
  // Returns e.g. "2026-Q3" for the assessment period ending on this quarter date
}

function nextAssessmentAt(now: Date): Date {
  // Next Jan/Apr/Jul/Oct 00:00 Manila
}
```

---

## 8. API specification

### 8.1 Existing (changes only)

#### `app-settings` PATCH

**New behavior (Phase 1):**

- On host touch of superhost fields when status was `approved` → `pending`, clear `superhost_approved_at`, set `superhost_submitted_at = now()`.
- On host touch when `rejected` or `expired` → `pending`, clear `superhost_rejection_reason`, set `superhost_submitted_at`.

#### `get-public-property` / `list-public-properties`

**New behavior (Phase 1 + 3):** Use `resolveIsSuperhost()` (§5.2) including org earned flag.

---

### 8.2 New — `moderate-superhost`

|                  |                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **Path**         | `POST /functions/v1/moderate-superhost`                                                             |
| **Auth**         | `verifySuperAdminJwt`                                                                               |
| **Body**         | `{ propertyId: string, decision: 'approved' \| 'rejected' \| 'revoked', reason?: string }`          |
| **Rules**        | `approved` only when `superhost_status = pending`; `rejected` when pending; `revoked` when approved |
| **Reason**       | Required when `decision = rejected \| revoked`; max 500 chars                                       |
| **Success**      | `{ propertyId, superhostStatus, superhostApprovedAt?, superhostRejectionReason? }`                  |
| **Side effects** | Update `app_settings`; `invalidateAppSettingsCache(propertyId)`; send email to org owner            |

**Implementation:** Mirror `supabase/functions/moderate-external-review/index.ts`.

**config.toml:**

```toml
[functions.moderate-superhost]
verify_jwt = false
```

---

### 8.3 New — `get-superhost-assets`

|              |                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Path**     | `GET /functions/v1/get-superhost-assets?propertyId=`                                                                                    |
| **Auth**     | `verifySuperAdminJwt` OR org member with property access                                                                                |
| **Response** | `{ verificationUrl, proofImageUrl (signed, 1h), superhostStatus, superhostApprovedAt, superhostRejectionReason, superhostSubmittedAt }` |

---

### 8.4 New — `get-org-superhost-progress`

|              |                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Path**     | `GET /functions/v1/get-org-superhost-progress?orgId=`                                                                        |
| **Auth**     | `verifyOrgAccess` (owner / org admin / member with settings read)                                                            |
| **Response** | `{ earned, earnedAt, nextAssessmentAt, criteria: {...}, importedProperties: [{ propertyId, name, slug, superhostStatus }] }` |
| **Notes**    | Computes **live** metrics for display (does not mutate org settings); may cache 5 min per org                                |

---

### 8.5 New — `reassess-org-superhost` (super-admin manual)

|                  |                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Path**         | `POST /functions/v1/reassess-org-superhost`                                           |
| **Auth**         | `verifySuperAdminJwt`                                                                 |
| **Body**         | `{ organizationId: string, assessmentKey?: string }`                                  |
| **Side effects** | Runs same logic as cron for one org; writes assessment run row with `trigger: manual` |

---

### 8.6 Changes — `list-super-admin-approvals`

**New row type:** `SuperhostApprovalRow`

```typescript
type SuperhostApprovalRow = {
  type: 'superhost';
  propertyId: string;
  propertyName: string;
  propertySlug: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  superhostStatus: SuperhostStatus; // pending | approved | rejected | expired
  verificationUrl: string | null;
  proofImagePath: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
};
```

**Query strategy:** Same as external reviews — scan `app_settings` where `superhost_status != 'none'`, join properties + organizations.

**Type filter:** Add `superhost` to `ApprovalTypeFilter`:

```typescript
type ApprovalTypeFilter =
  'all' | 'property' | 'parking' | 'listing_verification' | 'reviews' | 'superhost';
```

When `type=superhost`, skip org/listing/review queries (push-down optimization).

**Status filter mapping:**

| Queue status | `superhost_status`                                  |
| ------------ | --------------------------------------------------- |
| pending      | `pending`                                           |
| approved     | `approved`                                          |
| rejected     | `rejected`                                          |
| changes      | _(never — superhost has no changes-requested flow)_ |
| all          | any non-`none`                                      |

**Search fields:** property name, org name, verification URL host.

**Sort:** Pending first, then `superhost_submitted_at` DESC.

---

### 8.7 Cron — `superhost-import-expiry-cron`

|                 |                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**     | `pg_cron` daily 03:00 Asia/Manila                                                                                                                   |
| **Auth**        | Cron secret header (pattern from `sd-refund-cron`)                                                                                                  |
| **Logic**       | `UPDATE app_settings SET superhost_status = 'expired' WHERE superhost_status = 'approved' AND superhost_approved_at < now() - interval '12 months'` |
| **Notify**      | Email org owner per expired property (batched one email if multiple)                                                                                |
| **Idempotency** | Status already `expired` — skip                                                                                                                     |

**Snippet:** `supabase/snippets/superhost-import-expiry-cron.sql`  
**Doc:** `docs/archive/operations/scheduled-jobs-and-testing.md`

---

### 8.8 Cron — `superhost-assessment-cron`

|                 |                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**     | `pg_cron` on Jan 1, Apr 1, Jul 1, Oct 1 04:00 Asia/Manila (+ optional daily catch-up for missed orgs)                                               |
| **Auth**        | Cron secret                                                                                                                                         |
| **Logic**       | For each org with ≥1 active property: compute metrics → update `organizations.settings.superhost` → insert assessment run → email on earn/lose flip |
| **Idempotency** | Skip if `lastAssessmentKey` matches current quarter unless `force` flag (manual endpoint)                                                           |

---

## 9. UI specification

### 9.1 Super-admin — `/admin/approvals`

**New dialog:** `SuperAdminSuperhostDialog.tsx` (clone structure from `SuperAdminExternalReviewDialog.tsx`)

| Element                    | Behavior                                               |
| -------------------------- | ------------------------------------------------------ |
| Title                      | `{propertyName}` + Superhost badge icon                |
| Subtitle                   | Org name · submitted date                              |
| Status badge               | pending / approved / rejected / expired                |
| Verification URL           | Link + "Open in new tab"                               |
| Proof screenshot           | `VerificationDocPreviewCard` + full-view lightbox      |
| Reject step                | Required reason textarea (min 10 chars) before confirm |
| Actions (pending)          | **Reject** · **Approve**                               |
| Actions (approved)         | **Revoke** (destructive confirm + reason) · Close      |
| Actions (rejected/expired) | Close only + show prior reason if rejected             |

**Table/card row:**

| Column    | Value             |
| --------- | ----------------- |
| Type      | Superhost         |
| Name      | Property name     |
| Org       | Organization name |
| Status    | Status badge      |
| Submitted | Date              |

**Hook additions in `useApprovals.ts`:**

- `useSuperhostAssets(propertyId)`
- `useModerateSuperhost()`

---

### 9.2 Property settings — Guest rewards (enhancements)

**File:** `PropertySuperhostVerificationBlock.tsx`

| Status     | Host-visible UI                                                                              |
| ---------- | -------------------------------------------------------------------------------------------- |
| `none`     | Superhost · Not submitted · Manage                                                           |
| `pending`  | Superhost · In review · Manage (read-only proof)                                             |
| `approved` | Superhost · Approved · Manage · subtle "Valid until {date}" when `superhost_approved_at` set |
| `rejected` | Superhost · Rejected · Manage · show `superhost_rejection_reason`                            |
| `expired`  | Superhost · Expired · Manage · prompt resubmit                                               |

**Attention chip:** Map in property settings attention resolver when `pending` (amber) or `rejected`/`expired` (destructive).

---

### 9.3 Org settings — Trust section (new)

**Route:** `/org/:orgSlug/settings` — new section **Trust** (or subsection under existing settings page)

**Page title:** `{Org Name} - Settings` (existing)

**Components:**

| Component                         | Content                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------- |
| `OrgSuperhostProgressSection.tsx` | Earned badge status (Earned / Not earned)                                         |
| Criterion rows × 4                | Label · current value · required threshold · met/not met icon                     |
| Next assessment                   | "Next assessment: {date}" (Manila formatted)                                      |
| Imported track link               | "Import Airbnb Superhost per property →" links to property settings Guest rewards |
| Drill-down                        | Mobile: tap row → `ResponsiveModal` with formula explanation (minimal copy)       |

**Data:** `useOrgSuperhostProgress(orgId)` → `get-org-superhost-progress`

**Empty states:**

| Condition                       | UI                                               |
| ------------------------------- | ------------------------------------------------ |
| Insufficient data for criterion | "—" value + "Need more {reviews/stays/messages}" |
| Org has zero completed stays    | Activity row shows 0 / 10                        |

---

### 9.4 Public guest UI (minimal changes)

**Existing badge locations — no layout change:**

- `PropertyOverview.tsx` — badge + tooltip
- `ListingHostCard.tsx`
- `PropertyCard.tsx` / `PropertyListItem.tsx` (if `isSuperhost` on list DTO)
- Showcase templates (`HavenSections.tsx`, etc.)

**Tooltip copy (only if earned vs imported distinction needed later):** v1 uses single "Superhost" label for both tracks.

---

## 10. Email notifications

**Template location:** `supabase/functions/_shared/email-templates/` (add fragments)

| Event             | Recipient | Subject pattern                              |
| ----------------- | --------- | -------------------------------------------- |
| Imported approved | Org owner | `Superhost approved — {property name}`       |
| Imported rejected | Org owner | `Superhost not approved — {property name}`   |
| Imported revoked  | Org owner | `Superhost status removed — {property name}` |
| Imported expired  | Org owner | `Superhost proof expired — {property name}`  |
| Earned gained     | Org owner | `You're a Kame Superhost`                    |
| Earned lost       | Org owner | `Kame Superhost status update`               |

**Implementation:** Helper in `_shared/superhostNotifications.ts` called from moderate + crons. Use existing branded property/org email shell.

**Out of v1:** Telegram, team member copies, guest-facing emails.

---

## 11. Permissions and RBAC

| Action                | Gate                                            |
| --------------------- | ----------------------------------------------- |
| Submit imported proof | `settings.socials:edit` on property (existing)  |
| View org progress     | Org member with org settings read (owner/admin) |
| Moderate imported     | `SUPER_ADMIN_EMAILS`                            |
| Manual reassess       | `SUPER_ADMIN_EMAILS`                            |
| Public badge read     | Anon via public endpoints                       |

**No new plan feature keys** in v1.

---

## 12. Edge cases and business rules

### 12.1 Imported track

| Case                            | Behavior                                               |
| ------------------------------- | ------------------------------------------------------ |
| Host clears URL and proof       | `superhost_status → none`; badge off                   |
| Host edits only URL on approved | → `pending`; badge off until re-approved               |
| Proof upload fails mid-save     | No DB change until successful upload + save            |
| Property deactivated            | Badge hidden on public (existing property status gate) |
| Org deleted                     | CASCADE removes app_settings                           |
| Duplicate pending submissions   | Impossible — one row per property                      |

### 12.2 Earned track

| Case                                  | Behavior                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Org earns, then loses at next quarter | Badge removed all properties simultaneously                                                    |
| New property added to earned org      | Immediately shows badge (inherits org earned)                                                  |
| Org with only parking listings        | Activity/rating metrics may be insufficient — likely never earns until property bookings exist |
| Manual reassess mid-quarter           | Updates snapshot; can flip earned flag early (super-admin only)                                |

### 12.3 Cancellation attribution (v1 conservative)

**Numerator:** Bookings where status is `CANCELLED` and cancellation went through `cancel-booking` (admin workflow).

**Open refinement (Phase 2+):** Add `guest_submissions.cancelled_by TEXT CHECK (cancelled_by IN ('host', 'guest', 'system'))` set in `cancel-booking` and guest self-cancel path. Until then, guest self-cancel via guest form may not count — document in host FAQ as "host cancellations via booking dashboard."

### 12.4 Insufficient data handling

| Criterion    | Insufficient when            | `met`                               |
| ------------ | ---------------------------- | ----------------------------------- |
| Rating       | < 3 reviews                  | `false`                             |
| Response     | < 5 inbound threads          | `false`                             |
| Cancellation | < 10 bookings in denominator | `false`                             |
| Activity     | < 1 completed stay           | `false` (need 10 or long-stay path) |

**All four must be `met: true` to earn** — partial progress shown in UI but no badge.

### 12.5 Legacy rows

| Case                                       | Handling                                                       |
| ------------------------------------------ | -------------------------------------------------------------- |
| `approved` without `superhost_approved_at` | Backfill from `updated_at`; expiry cron applies after backfill |
| Org settings missing `superhost` key       | Treat as `{ earned: false, criteria: {} }`                     |

---

## 13. Implementation phases (detailed task lists)

### Phase 0 — Complete Track A moderation

**Exit criteria:** End-to-end imported flow works in staging.

| ID   | Task                                                | Files                                           | Notes                              |
| ---- | --------------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| 0.1  | Add `SuperhostApprovalRow` builder                  | `_shared/superAdminSuperhostApprovals.ts` (new) | Query app_settings join properties |
| 0.2  | Extend `list-super-admin-approvals` union + filters | `list-super-admin-approvals/index.ts`           | Add `type=superhost`               |
| 0.3  | Implement `moderate-superhost`                      | `moderate-superhost/index.ts`, `config.toml`    | static_files if email              |
| 0.4  | Implement `get-superhost-assets`                    | `get-superhost-assets/index.ts`, `config.toml`  | Signed URL for proof               |
| 0.5  | Client types                                        | `super-admin/types/approval.ts`                 | `SuperhostApprovalSummary`         |
| 0.6  | Hooks                                               | `super-admin/hooks/useApprovals.ts`             | mutate + query                     |
| 0.7  | Dialog UI                                           | `SuperAdminSuperhostDialog.tsx`                 | Reject reason step                 |
| 0.8  | Wire approvals page                                 | `SuperAdminApprovalsPage.tsx`, table/card grid  | Type filter option                 |
| 0.9  | Filter URL state                                    | `lib/superAdminApprovalsFilters.ts`             | `type=superhost`                   |
| 0.10 | Email on approve/reject                             | `_shared/superhostNotifications.ts`             |                                    |
| 0.11 | Host rejection reason display                       | `PropertySuperhostVerificationBlock.tsx`        | When status rejected               |
| 0.12 | Settings attention chip                             | property settings attention map                 | pending/rejected                   |
| 0.13 | Docs                                                | approvals.md, edge-functions.md, PROJECT.md     |                                    |
| 0.14 | Manual test script                                  | §16.1                                           |                                    |

---

### Phase 1 — Imported hardening + expiry

| ID   | Task                                            | Files                                                         |
| ---- | ----------------------------------------------- | ------------------------------------------------------------- |
| 1.1  | Migration §6.1                                  | new migration                                                 |
| 1.2  | Update `normalizeSuperhostStatus` for `expired` | `_shared/propertyExternalReviews.ts`, UI mirror               |
| 1.3  | PATCH logic for submitted_at / approved_at      | `app-settings/index.ts`, `upload-app-settings-asset/index.ts` |
| 1.4  | moderate-superhost sets approved_at / reason    | `moderate-superhost/index.ts`                                 |
| 1.5  | `resolveIsSuperhost()` helper                   | `_shared/superhostBadge.ts` (new)                             |
| 1.6  | Wire publicPropertyService                      | `_shared/publicPropertyService.ts`                            |
| 1.7  | Wire list-public-properties enrichment          | `list-public-properties/index.ts`                             |
| 1.8  | `superhost-import-expiry-cron`                  | new edge + pg_cron snippet                                    |
| 1.9  | Host UI expiry date + expired state             | `PropertySuperhostVerificationBlock.tsx`                      |
| 1.10 | Super-admin revoke action                       | `SuperAdminSuperhostDialog.tsx`, moderate endpoint            |
| 1.11 | Docs + scheduled jobs doc                       |                                                               |

---

### Phase 2 — Metrics foundation

| ID  | Task                       | Files                                                           |
| --- | -------------------------- | --------------------------------------------------------------- |
| 2.1 | Migration §6.2             | inbox_thread_metrics                                            |
| 2.2 | Upsert on inbound message  | webhook handlers / message insert path                          |
| 2.3 | Update on host reply       | `_shared/inboxSendReplyAction.ts`, `social-inbox-send/index.ts` |
| 2.4 | `superhostMetrics.ts`      | compute all four criteria                                       |
| 2.5 | Deno tests                 | `_shared/superhostMetrics_test.ts`                              |
| 2.6 | Backfill script (optional) | `scripts/dev/backfill-inbox-thread-metrics.mjs`                 |
| 2.7 | Docs data-model.md         |                                                                 |

---

### Phase 3 — Earned engine

| ID  | Task                          | Files                                        |
| --- | ----------------------------- | -------------------------------------------- |
| 3.1 | `superhostAssessment.ts`      | evaluate + patch org settings                |
| 3.2 | Assessment runs table §6.3    | migration                                    |
| 3.3 | `superhost-assessment-cron`   | edge + pg_cron                               |
| 3.4 | `get-org-superhost-progress`  | new edge                                     |
| 3.5 | `reassess-org-superhost`      | new edge (super-admin)                       |
| 3.6 | Merge Track B in public badge | `_shared/superhostBadge.ts`, public services |
| 3.7 | Earn/lose emails              | `_shared/superhostNotifications.ts`          |
| 3.8 | Docs                          | data-model, PROJECT, edge-functions          |

---

### Phase 4 — Host dashboard UX

| ID  | Task                                 | Files                                                          |
| --- | ------------------------------------ | -------------------------------------------------------------- |
| 4.1 | `OrgSuperhostProgressSection.tsx`    | new component                                                  |
| 4.2 | `useOrgSuperhostProgress.ts`         | hook                                                           |
| 4.3 | Wire org settings page               | org settings sections                                          |
| 4.4 | Route guide                          | `docs/guides/routes/org/settings.md` or new `org/superhost.md` |
| 4.5 | Mobile criterion modal               | ResponsiveModal drill-down                                     |
| 4.6 | Cross-link to property Guest rewards |                                                                |

---

### Phase 5 — Production readiness

| ID  | Task                                        | Files                                                 |
| --- | ------------------------------------------- | ----------------------------------------------------- |
| 5.1 | QA doc                                      | `docs/workflow/qa/property-dashboard/20-superhost.md` |
| 5.2 | Playwright harness states                   | extend property settings harness                      |
| 5.3 | Super-admin QA scenarios                    | manual checklist in QA doc                            |
| 5.4 | `ci:quality`                                |                                                       |
| 5.5 | Staging walkthrough                         | all phases                                            |
| 5.6 | Backlog + README sync                       |                                                       |
| 5.7 | Move plan to in-progress/done when complete | workflow docs                                         |

---

## 14. Testing plan

### 14.1 Phase 0 manual script

1. Sign in as property admin → Property Settings → Guest rewards → Superhost → add valid Airbnb URL + proof → Save.
2. Confirm `superhost_status = pending` in DB; public page **no** badge.
3. Sign in super-admin → `/admin/approvals?type=superhost&status=pending` → open row → Approve.
4. Reload public property page → badge visible.
5. Reject flow on second property → host sees reason.
6. Edit proof on approved property → returns to pending; badge hidden.

### 14.2 Deno unit tests (`superhostMetrics_test.ts`)

| Test case                | Expected                              |
| ------------------------ | ------------------------------------- |
| Zero reviews             | rating `met: false`, null value       |
| 4.79 avg over 10 reviews | `met: false`                          |
| 4.80 avg over 10 reviews | `met: true`                           |
| 9/10 threads within 24h  | response `met: true`                  |
| 8/10 threads within 24h  | `met: false`                          |
| 0 cancels / 100 bookings | cancel `met: true`                    |
| 1 cancel / 50 bookings   | cancel `met: false`                   |
| 9 completed stays        | activity `met: false`                 |
| 10 completed stays       | activity `met: true`                  |
| 3 stays × 35 nights      | activity `met: true` (long-stay path) |

### 14.3 Integration / E2E (Phase 5)

Extend `ui/e2e/features/team/shared/propertyTeamRbacHarness.ts` superhost fields; add super-admin moderation spec if super-admin test auth exists (else manual QA only).

---

## 15. Documentation checklist

| Doc                                                     | Phase   | Updates                            |
| ------------------------------------------------------- | ------- | ---------------------------------- |
| `docs/PROJECT.md`                                       | 0, 3    | API table rows for new functions   |
| `docs/architecture/edge-functions.md`                   | 0, 3    | Function entries + JWT policy      |
| `docs/architecture/data-model.md`                       | 1, 2, 3 | Columns, JSONB, new tables         |
| `docs/architecture/validation-and-env.md`               | 3       | Cron secrets if new                |
| `docs/guides/routes/admin/approvals.md`                 | 0       | Superhost row + dialog + API       |
| `docs/guides/routes/org/property/settings.md`           | 0, 1    | Statuses, expiry, rejection reason |
| `docs/guides/routes/org/settings.md`                    | 4       | Trust section / earned progress    |
| `docs/guides/routes/properties.md`                      | 3       | Public `isSuperhost` resolution    |
| `docs/archive/operations/scheduled-jobs-and-testing.md` | 1, 3    | Two new crons                      |
| `docs/archive/todos/BACKLOG_DRAFT.md`                   | 5       | Mark items shipped                 |
| `docs/workflow/qa/property-dashboard/20-superhost.md`   | 5       | New QA module                      |
| `docs/workflow/qa/property-dashboard/README.md`         | 5       | Index row                          |

---

## 16. Rollout strategy

| Step | Action                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | Deploy Phase 0 to **dev** Supabase (`bun run deploy:supabase:dev`) — not prod without `kamewave` |
| 2    | Moderate any existing `pending` rows in dev                                                      |
| 3    | Phase 1 migration — backfill approved_at                                                         |
| 4    | Enable expiry cron in dev; verify with backdated `superhost_approved_at` test row                |
| 5    | Phase 2–3 — run assessment cron manually against test org with seeded bookings/reviews           |
| 6    | Phase 4 UI behind no flag (immediate)                                                            |
| 7    | Production deploy only after Phase 5 QA sign-off                                                 |

**Feature flag:** None required — incomplete Track B simply shows progress with insufficient data until metrics exist.

---

## 17. Pre-launch checklist (production)

- [ ] Phase 0 moderation live — no `pending` rows older than SLA without ops notice
- [ ] Reject reason displayed to host
- [ ] Public badge off when pending/rejected/expired
- [ ] Expiry cron registered in hosted `pg_cron`
- [ ] Assessment cron registered for next quarter date
- [ ] Emails send in dev with real Resend (spot check)
- [ ] `resolveIsSuperhost` covered in public API tests/manual script
- [ ] Org progress page loads on mobile 375px
- [ ] Super-admin revoke tested
- [ ] Docs match shipped behavior
- [ ] `bun run ci:quality` green on release branch

---

## 18. Open questions (confirm before Phase 0 code)

| #   | Question                                            | Recommendation                                  |
| --- | --------------------------------------------------- | ----------------------------------------------- |
| Q1  | Earned overrides expired import on same property?   | **Yes** (OR logic)                              |
| Q2  | Kame reviews only for earned rating?                | **Yes** for v1                                  |
| Q3  | Org progress under Org settings vs dedicated route? | **Org settings Trust section**                  |
| Q4  | Required reject/revoke reason?                      | **Yes**                                         |
| Q5  | Ship Phase 0 first before Track B?                  | **Yes**                                         |
| Q6  | Add `cancelled_by` column for accurate cancel rate? | **Defer to Phase 2** — document conservative v1 |
| Q7  | Email team members on Superhost changes?            | **No** — owner only in v1                       |

---

## 19. Effort estimate

| Phase          | Dev days | Dependencies        |
| -------------- | -------- | ------------------- |
| 0 — Moderation | 1–2      | None                |
| 1 — Expiry     | 0.5–1    | Phase 0             |
| 2 — Metrics    | 2–3      | Inbox message paths |
| 3 — Engine     | 2–3      | Phase 2             |
| 4 — Host UX    | 1–2      | Phase 3 read API    |
| 5 — QA         | 1–2      | All                 |
| **Total**      | **8–13** |                     |

---

## 20. Related work (do not duplicate)

| Doc                                                                                          | Relationship                                                            |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`host-verification-tiers.md`](../in-progress/host-verification-tiers.md)                    | Separate **Verified/Recommended** host badges — orthogonal to Superhost |
| [`parking-e2e-phase6-ranking-trust-safety.md`](./parking-e2e-phase6-ranking-trust-safety.md) | Parking marketplace ranking — different domain                          |
| External reviews moderation                                                                  | **Pattern source** for Phase 0 dialog + queue                           |
| [`plans-feature-matrix.md`](../../architecture/plans-feature-matrix.md)                      | `verifiedBadgeEligible` is plan-gated; Superhost is not                 |

---

## 21. Implementation map (target end state)

| Concern                | Path                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| Superhost status types | `_shared/propertyExternalReviews.ts`, `ui/.../propertyExternalReviews.ts`        |
| Badge resolution       | `_shared/superhostBadge.ts`                                                      |
| Metrics                | `_shared/superhostMetrics.ts`                                                    |
| Assessment             | `_shared/superhostAssessment.ts`                                                 |
| Notifications          | `_shared/superhostNotifications.ts`                                              |
| Approvals list         | `_shared/superAdminSuperhostApprovals.ts`, `list-super-admin-approvals/index.ts` |
| Moderate               | `moderate-superhost/index.ts`                                                    |
| Assets                 | `get-superhost-assets/index.ts`                                                  |
| Host progress API      | `get-org-superhost-progress/index.ts`                                            |
| Manual reassess        | `reassess-org-superhost/index.ts`                                                |
| Import expiry cron     | `superhost-import-expiry-cron/index.ts`                                          |
| Assessment cron        | `superhost-assessment-cron/index.ts`                                             |
| Property host UI       | `PropertySuperhostVerificationBlock.tsx`                                         |
| Org host UI            | `OrgSuperhostProgressSection.tsx`                                                |
| Super-admin UI         | `SuperAdminSuperhostDialog.tsx`                                                  |
| Public badge           | `PropertyOverview.tsx`, `ListingHostCard.tsx`, `publicPropertyService.ts`        |

---

_Last updated: 2026-08-30. Next action: confirm §18 open questions → `/workflow-start` → implement Phase 0._
