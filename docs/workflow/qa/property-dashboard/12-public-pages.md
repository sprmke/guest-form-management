---
title: 'QA — Property Public Pages'
status: active
updated: 2026-08-29
---

# 12 — Public Pages

Route: `/org/:orgSlug/property/:propertySlug/public-pages`

## Looks good

- Explore-open on Free; save `publicPagesAutosave` Pro+; live Showcase `propertyShowcase` Pro+.
- Editors for Property / Stay Guide / Showcase with live preview.
- Permissions per page type.

## Issues

| Sev | Issue                                                                                            | Evidence       |
| --- | ------------------------------------------------------------------------------------------------ | -------------- |
| P1  | `get-public-showcase?preview=1` returned **400** during walk — preview broken until edge healthy | Console        |
| P2  | Dual edit surfaces (Settings vs Public Pages) for same listing fields — powerful but duplicate   | Settings guide |
| P2  | Free hosts can explore editors then hit Save upgrade — expected, still frustrating mid-edit      | Matrix         |

## Improvements

- Health check banner when public preview APIs fail.
- “Listing completeness” shared between Settings dots and Public Pages cards.

## Doc gaps

- Guide current on explore-open / save gates.

## Evidence

Console 400 on showcase; guide `public-pages.md`.
