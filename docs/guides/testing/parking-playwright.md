---
title: 'Parking Playwright'
status: active
tags: [guides, testing, parking, playwright]
updated: 2026-08-20
---

# Parking Playwright

Feature-scoped Playwright coverage for the standalone parking request flow. The suite is organized to mirror the app's parking domains instead of keeping all E2E files in one flat folder.

## Scope

- Guest parking request submit: `ui/e2e/features/parking/guest/parkingGuestRequest.spec.ts`
- Host dashboard accept flow: `ui/e2e/features/parking/host/parkingHostClaim.spec.ts`
- Decline / expiry / no-host outcomes: `ui/e2e/features/parking/flows/parkingGuestHostOutcomes.spec.ts`
- Side-by-side guest + host demo: `ui/e2e/features/parking/flows/parkingGuestHostSideBySide.spec.ts`
- Local Supabase-backed guest + host acceptance: `ui/e2e/features/parking/live/parkingGuestHostLocal.spec.ts`
- Shared mocks and state: `ui/e2e/features/parking/shared/parkingFlowHarness.ts`
- Shared local-stack helpers: `ui/e2e/features/parking/shared/parkingLiveLocalHarness.ts`

## Runner setup

- Repo config: `playwright.config.ts`
- Root scripts:
  - `bun run test:e2e`
  - `bun run test:e2e:headed`
  - `bun run test:e2e:parking`
  - `bun run test:e2e:parking:headed`
  - `bun run test:e2e:parking:side-by-side`
  - `bun run test:e2e:parking:side-by-side:slow`
  - `bun run test:e2e:parking:local`
  - `bun run test:e2e:parking:local:headed`
  - `bun run test:e2e:parking:screens`
  - `bun run test:e2e:parking:screens:local`
- Browser install: `npx playwright install chromium`

The config boots the Vite app automatically on `http://127.0.0.1:4173` and keeps Playwright artifacts under `test-results/playwright/`.

## Mocked dashboard auth

Parking dashboard routes normally require a real Supabase host session. For Playwright-only local runs, the UI accepts a dev-only localStorage session payload from `ui/src/lib/e2e/adminSession.ts`.

- Storage key: `kame:e2e-admin-session`
- Enabled only when the Vite app is running in dev mode
- Used by `useAdminSession`, `edgeClient`, and parking bookings list fetches

This keeps the production auth flow unchanged while letting Playwright enter `/org/:orgSlug/parking/:parkingSlug/...` screens without Google OAuth during mocked E2E runs.

## Local Supabase-backed flow

`bun run test:e2e:parking:local` runs a second layer against the live local stack instead of intercepting parking endpoints.

- Requires the local stack already running (`./dev.sh` is the easiest path)
- Uses the seeded parking org `kame-homes` and parking slug `monaco-level-2-slot-27`
- Signs in the seeded host account `sprmke.dev@gmail.com` through local Supabase Auth
- Writes both the real Supabase auth storage key and the dev-only `kame:e2e-admin-session` helper so dashboard fetches and direct `guest_submissions` reads both use the real session
- Cleans up the generated booking rows by guest email before and after the test

## Side-by-side demo

`bun run test:e2e:parking:side-by-side` launches two headed Chromium windows:

1. Guest request form + request status
2. Host parking dashboard bookings/detail

Both windows share the same mocked parking-request state, so accepting on the host side updates the guest status view in the same run.

### Slow / demo pacing

The side-by-side spec launches its own headed Chromium windows. To watch the flow at a readable pace:

```bash
bun run test:e2e:parking:side-by-side:slow
```

That preset uses:

- `PLAYWRIGHT_SLOW_MO=600` — delays each Playwright action (click, fill, navigation) by 600ms
- `PLAYWRIGHT_DEMO_PAUSE_MS=2000` — adds a 2s hold after each major step (guest waiting screen, host opens booking, accept, final guest reload)

Tune manually:

```bash
PLAYWRIGHT_SLOW_MO=1000 PLAYWRIGHT_DEMO_PAUSE_MS=3000 bun run test:e2e:parking:side-by-side
```

Step through interactively with the Playwright Inspector after the guest lands on the waiting screen:

```bash
PLAYWRIGHT_INSPECT=1 bun run test:e2e:parking:side-by-side
```

Record the run regardless of pass/fail:

```bash
bun run test:e2e:parking:side-by-side -- --video=on
```

## Screen captures

Parking E2E can write full-page PNGs for every major step into `ui/screen-tmp/parking-e2e/`. Everything under `ui/screen-tmp/` is gitignored (only `.gitkeep` is tracked), so captures cannot be committed and **stay on your machine when you switch branches** — git does not remove ignored local files on checkout.

```bash
bun run test:e2e:parking:screens
```

That runs the mocked chromium suite plus the side-by-side demo. Each test gets its own subfolder (`guest-request`, `host-claim`, `outcome-expired`, `side-by-side`, etc.) with numbered step files such as `01-guest-guest-form.png`.

For the local Supabase layer (requires `./dev.sh`):

```bash
bun run test:e2e:parking:screens:local
```

Helper: `ui/e2e/features/parking/shared/parkingScreenCapture.ts`.

## Current limitations

- The live local layer currently covers the accept path only; decline/expiry branches still live in the mocked suite.
- The side-by-side flow is Chromium-specific because it relies on explicit window size and position.
- Existing Tailwind/Browserslist warnings still appear during Vite startup, but they do not block the suite.
