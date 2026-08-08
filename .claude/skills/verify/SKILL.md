---
name: verify
description: Build and verify a change actually works in Guest Form Management — type-check/lint/build, exercise edge functions locally, and drive the real UI with Playwright MCP. Use whenever confirming a code change works, not just that tests/type-checks pass (there is no automated test suite in this repo).
---

# Verify (GFM)

This repo has **no automated test suite** (see `CLAUDE.md` → Conventions → Testing). "Verified" here means: static checks pass, the edge function actually returns the right response locally, and — for UI changes — the real browser flow works, not just that the code compiles.

## 1. Static checks (always run these first)

```bash
bun run type-check   # cd ui && tsc --noEmit
bun run lint          # cd ui && eslint .
bun run build          # tsc && vite build
bun run check:filenames
```

Stop and fix before continuing if any of these fail — don't try to verify behavior on top of a build that doesn't compile.

## 2. Edge function changes

1. Start the local stack: `./dev.sh` (full stack) or `./dev.sh --ui-only` if you only need the UI against a hosted project — see `CLAUDE.md` → Commands → Local dev gotchas for the Kong-502 / stale-Docker-IP failure mode.
2. Hit the function directly:
   ```bash
   curl -sS -X POST "http://127.0.0.1:54321/functions/v1/<function-name>" \
     -H "Authorization: Bearer <anon-or-admin-jwt>" \
     -H "Content-Type: application/json" \
     -d '{"...": "..."}'
   ```
   Admin functions need a JWT for an `ADMIN_ALLOWED_EMAILS` account; public functions (`submit-form`, `get-booked-dates`, ...) work with the anon key.
3. Scheduled jobs (`gmail-listener`, `sd-refund-cron`, telegram crons) — see `docs/archive/operations/scheduled-jobs-and-testing.md` for the exact curl payloads and admin-scoped vs global invocation.
4. For anything touching booking status, confirm against `.cursor/rules/booking-workflow.mdc` §3 (side-effect matrix): did the right DB fields, calendar color/title, sheet row, and emails fire — and _only_ those?

## 3. UI changes — drive the real browser, don't just read the diff

Prefer driving the real browser over describing what the code should do:

1. `./dev.sh --ui-only` (or full `./dev.sh`) so the app is running at the local Vite URL.
2. **Playwright CLI** (token-efficient for coding agents — skill `playwright-cli`, binary `bun x playwright-cli`): `open` → `snapshot` → `click`/`fill` → `screenshot`. Setup: `bun run setup:playwright-cli`.
3. **Playwright MCP** (`.mcp.json`) remains useful for long exploratory `/verify` loops with persistent browser context.
4. Check both the **golden path** and at least one edge case relevant to the change (e.g. Airbnb-source booking skipping the payment step, a booking with `security_deposit = 0` skipping SD refund, mobile breakpoint below `lg`).
5. For admin routes, sign in as an allow-listed Google account first (`/for-hosts/login`) — there's no bypass.

If Playwright MCP isn't available in the current session, say so explicitly rather than claiming the UI was verified — static checks alone don't confirm feature correctness (see `CLAUDE.md` project instructions).

## 4. Report format

State plainly: which static checks passed, what was actually exercised (curl output / browser flow), and what was _not_ verified (e.g. "did not test the Gmail listener path — needs a live Gmail thread").
