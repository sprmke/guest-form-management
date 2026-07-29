# Services (guest marketing) — operator guide

Route: `/services`

> **Status:** Documented — UI-only coming-soon page.

## Overview

Public preview for future guest services. Uses `MarketingLayoutShell` and the same listing search and scroll morph as `/properties` and `/developments`.

## Behavior

- Search bar shows **What** and **When** only (no **Who** segment). Submits back to `/services` with the shared listing query parameters.
- No filters, inventory, booking actions, API calls, or persistence.
- Service chips are decorative previews (property manager, agent, marketing, maintenance, food & essentials, supplies, transportation) and are not interactive.
- Motion respects the user's reduced-motion preference.

## Implementation map

| Concern        | Path                                                                         |
| -------------- | ---------------------------------------------------------------------------- |
| Page           | `ui/src/features/guest/marketing/pages/ServicesPage.tsx`                     |
| Route          | `ui/src/features/guest/marketing/routes/index.tsx`                           |
| Search default | `ui/src/features/guest/marketing/shared/lib/listingSearchDefaultLocation.ts` |
| Search fields  | `ui/src/features/guest/marketing/shared/lib/listingSearchFields.ts`          |
| Search morph   | `ui/src/features/guest/marketing/shared/lib/listingScrollSearchPaths.ts`     |

## Related docs

- [Properties](./properties.md)
- [Developments](./developments.md)
- [Route index](./README.md)
