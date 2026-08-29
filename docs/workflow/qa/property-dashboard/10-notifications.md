---
title: 'QA — Property Notifications'
status: active
updated: 2026-08-29
---

# 10 — Notifications

Route: `/org/:orgSlug/property/:propertySlug/notifications`

## Looks good

- Activity + six Telegram modules in one hub.
- Enable toggle plan-gated `telegramNotifications` (Starter+); edit/preview free.
- Deep links `?module=` work per guide.

## Issues

| Sev | Issue                                                                     | Evidence  |
| --- | ------------------------------------------------------------------------- | --------- |
| P2  | Six bots / modules is a lot of setup for a solo host — high time-to-value | Host lens |
| P3  | Shared bot token guidance is good but still easy to misconfigure Chat IDs | Guide     |

## Improvements

- “Quick start”: one bot + one ops chat preset that enables Operations + Chat together.
- Dashboard attention should deep-link into Activity with filter.

## Doc gaps

- Guide dated 2026-08-18 but content still matches; bump `updated` when next edited.

## Evidence

Live page load; guide `notifications.md`.
