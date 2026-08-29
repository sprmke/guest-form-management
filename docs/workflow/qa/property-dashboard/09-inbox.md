---
title: 'QA — Property Inbox'
status: active
updated: 2026-08-29
---

# 09 — Inbox

Route: `/org/:orgSlug/property/:propertySlug/inbox`

## Looks good

- Web chat free; Meta connect Business+ (`metaChatChannel`); AI auto-send Business+.
- Quick replies Starter+; Manage leaf-split permissions.
- Share booking links from composer — strong ops feature.

## Issues

| Sev | Issue                                                                              | Evidence                   |
| --- | ---------------------------------------------------------------------------------- | -------------------------- |
| P2  | Meta is where PH hosts live — gating connect to Business+ pushes them off-platform | Matrix + host critique     |
| P2  | Org Meta inheritance badge is correct but confusing for multi-property hosts       | Guide Q&A                  |
| P1  | Full Meta OAuth + 24h window not live-tested this pass                             | Needs Meta app credentials |

## Improvements

- Consider Starter Meta read-only / reply with limited pages (product decision).
- Property switcher from within a thread when org Meta shows cross-property noise.

## Doc gaps

- Guide current (2026-08-28).

## Evidence

Live Inbox load; guide + social-inbox rule; matrix.
