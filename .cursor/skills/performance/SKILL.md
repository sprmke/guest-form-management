---
name: performance
description: Vite bundle and runtime performance — code splitting, query caching, heavy deps (pdf, charts). Use when optimizing load time or list refetch behavior.
---

# Performance (GFM)

## Vite

- Heavy libs: `pdfjs-dist`, `jspdf`, `recharts` — lazy-load route-level pages where possible
- Check chunk warnings on `bun run build` — consider `import()` for admin-only PDF preview modals

## TanStack Query

- `staleTime` on stable lists (bookings 30s+)
- `keepPreviousData` for pagination
- Narrow `invalidateQueries` — avoid refetching entire org dashboard on small edits

## Images

- Explicit dimensions / `aspect-*` on media
- Property gallery: `PropertyMediaUpload` patterns

## Edge

- Batch DB reads in services; avoid N+1 in list endpoints
- Gmail listener: incremental history — do not full-scan inbox each poll

## Mobile

- Table horizontal scroll containers — not page-level overflow
- Avoid huge re-renders on filter keystroke — debounce search where already established

## Don'ts

- Premature `useMemo` everywhere — profile first
- Loading entire booking PDFs on list page

## Build check

```bash
bun run build
bun run type-check
```
