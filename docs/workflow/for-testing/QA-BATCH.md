---
title: 'QA batch — for-testing modules'
status: active
tags: [workflow, for-testing, qa]
updated: 2026-09-02
stage: for-testing
kind: reference
---

# QA batch — for-testing modules

**Goal:** Run manual verification on every module in [`./`](./README.md), then `/workflow-done <slug>` each one. No code changes unless QA finds bugs — move the module back to [`../in-progress/`](../in-progress/) if it does.

**Before you start:** `bun run ci:quality` green on the branch you are testing.

---

## Recommended order

| #   | Module                                                                    | Effort  | Blockers                                         | Done when                                                            |
| --- | ------------------------------------------------------------------------- | ------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| 1   | [Superhost program](./superhost-program.md)                               | ~30 min | None — no deploy config                          | [`20-superhost.md`](../qa/property-dashboard/20-superhost.md) passes |
| 2   | [Onboarding verification simplify](./onboarding-verification-simplify.md) | ~45 min | Local or dev stack + test org                    | Plan § Verify passes                                                 |
| 3   | [Host verification tiers](./host-verification-tiers.md)                   | ~30 min | Same + admin access                              | Phase 3 admin-queue checklist passes (search boost stays deferred)   |
| 4   | [CAPTCHA & anti-spam](./captcha-anti-spam-hardening.md)                   | ~45 min | Cloudflare Turnstile keys per env                | Plan § FOR TESTING — pass + fail test keys                           |
| 5   | [PWA install / offline / push](./pwa-installable-offline-push.md)         | ~2 h    | Dev Supabase deploy + VAPID secrets + UI rebuild | Plan § Manual QA + real-device push                                  |

---

## 1. Superhost program

**Checklist:** [`../qa/property-dashboard/20-superhost.md`](../qa/property-dashboard/20-superhost.md)

**Smoke path:**

- Org Settings → **Trust** — four criteria + next assessment date visible
- Public property listing shows Superhost badge when `organizations.settings.superhost.earned === true`
- Cron path optional locally — trust UI + badge wiring is the sign-off

---

## 2. Onboarding verification simplify

**Checklist:** [`onboarding-verification-simplify.md`](./onboarding-verification-simplify.md) § Verify

**Smoke path:**

- New org onboarding: Step 2 Property/Parking Rights required
- Step 3: Valid ID + Facebook Page only — Finish setup succeeds on Free
- Listing Verification does **not** show ownership proof as "missing" immediately after onboarding
- `/admin/approvals`: approve host ID + FB + listing rights → listing `ACTIVE`
- Get Verified Recommended still requires Facebook Page

---

## 3. Host verification tiers

**Checklist:** [`host-verification-tiers.md`](./host-verification-tiers.md) § Phase 3 testing checklist

**Smoke path:**

- Host: Verified + Recommended upload flows; admin dialog tabs
- `/admin/approvals`: Recommended-pending org sorts **above** Verified-only pending (same filter)
- **Do not block done on:** Explore/search boost (deferred until public listings API)

---

## 4. CAPTCHA & anti-spam hardening

**Checklist:** [`captcha-anti-spam-hardening.md`](./captcha-anti-spam-hardening.md) § FOR TESTING

**Ops first (one environment):**

1. Cloudflare Turnstile widget → `VITE_TURNSTILE_SITE_KEY` (UI) + `TURNSTILE_SECRET_KEY` (edge)
2. Optional: `CAPTCHA_MODE=monitor` before enforce
3. Enable `[auth.captcha]` locally or Attack Protection on hosted Auth

**Smoke path:**

- Auth OTP: Continue + Resend both work with widget mounted
- Guest form / SD form / guest review: submit succeeds with real user timing (>1.5 s on page)
- Cloudflare **fail** test keys → human-verification error, not silent 500
- Rate limit: rapid team-invite resend → 429 with friendly copy

**Note:** Without keys, the layer is inert — safe for local dev, but QA cannot sign off until keys exist.

---

## 5. PWA installable / offline / push

**Checklist:** [`pwa-installable-offline-push.md`](./pwa-installable-offline-push.md) § FOR TESTING

**Ops first (dev):**

1. `bun run deploy:supabase:dev` — push migrations + `push-*` functions
2. VAPID keys + `PUSH_FANOUT_SECRET` + Vault secret (see plan config table)
3. Vercel: `VITE_VAPID_PUBLIC_KEY` → **redeploy UI**

**Smoke path:**

- `bun run build && cd ui && bun run preview` — SW registered, manifest valid
- Install on desktop + one mobile browser
- Offline read on Bookings / Inbox / Notifications
- Offline inbox text reply → sync when back online
- Push: host notification → device banner (requires deployed stack + real subscription)

---

## After QA

| Result               | Action                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| All checklists pass  | `bash scripts/dev/workflow-move.sh done <slug>` for each module                                              |
| Bug needs code       | Fix → re-run QA → then done                                                                                  |
| Product defers a gap | Document in [`../planned/`](../planned/) or GitHub Issue → still OK to done if gap was never in module scope |

Back to [for-testing index](./README.md) · In-progress disposition: [`../in-progress/README.md`](../in-progress/README.md)
