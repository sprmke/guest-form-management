# Planned modules

Finished implementation plans from **Plan mode** (see `.cursor/rules/plan-mode.mdc`). One file per module or feature — actionable checklists, not chat transcripts.

## Naming

`YYYY-MM-DD-<kebab-case-slug>.md`

## Index

| Plan                                                                                     | Summary                                                                                                                                                                |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`FOR_HOSTS_LANDING_PAGE_PLAN.md`](./FOR_HOSTS_LANDING_PAGE_PLAN.md)                     | `/for-hosts` cinematic product-tour + Edge TTS narration                                                                                                               |
| [`2026-07-29-smart-search-bar.md`](./2026-07-29-smart-search-bar.md)                     | Live where/when/who search: typeahead, real availability filtering, `/search` results page                                                                             |
| [`2026-07-30-smart-filters.md`](./2026-07-30-smart-filters.md)                           | Real filter sidebar + sort for `/properties`, `/developments`, `/parkings` (and later `/search`), backed by facets instead of mock data                                |
| [`2026-07-30-ai-voice-receptionist.md`](./2026-07-30-ai-voice-receptionist.md)           | Voice AI receptionist via Gemini Live (v1 shipped). **Phase 6:** speech/AI latency, thinking UX, TalkingHead+VRM avatar (replaces turtle) — implement 6.1→6.4 in order |
| [`2026-07-30-route-guides-refresh.md`](./2026-07-30-route-guides-refresh.md)             | **Done** — Route guides synced to full app route tree (`/admin/*`, account, `/accept-invite`), stale refreshes, host-facing Q&A                                        |
| [`2026-07-30-inbox-org-property-parking.md`](./2026-07-30-inbox-org-property-parking.md) | Expand Guest Inbox to property + parking: scoped web chat, org Meta default with per-unit override, Messages + Channels at each scope                                  |
| [`2026-07-30-ai-dashboard-assistant.md`](./2026-07-30-ai-dashboard-assistant.md)         | Admin dashboard chat assistant — RBAC-scoped Q&A + action execution (check-in/out, transitions), tiered confirmation, rich chat UI, usage quota, two-tier kill switch  |
