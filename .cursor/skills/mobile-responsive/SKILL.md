---
name: mobile-responsive
description: >-
  Mobile-first, responsive UI standards for every screen and component in this
  project — breakpoints, touch targets, tables, admin shell layout, modals.
  Use for any new or changed UI in ui/src/**; this is an always-on rule on the
  Cursor side (mobile-responsive.mdc) with no automatic Claude Code
  equivalent, so invoke it explicitly for UI work.
---

# Mobile-first responsive UI

Every UI component in this project must work correctly at **375 px** (iPhone SE), **390 px** (iPhone 15), **768 px** (iPad), **1024 px** (laptop), and **1440 px** (desktop). Design mobile first; use Tailwind breakpoints to scale up, not down.

## 1. Breakpoint strategy

Use **Tailwind's default min-width breakpoints** in this order:

| Prefix   | Min width | Context                            |
| -------- | --------- | ---------------------------------- |
| _(none)_ | 0 px      | Mobile default — design here first |
| `sm:`    | 640 px    | Large phone / small tablet         |
| `md:`    | 768 px    | Tablet portrait                    |
| `lg:`    | 1024 px   | Laptop — sidebar becomes visible   |
| `xl:`    | 1280 px   | Desktop                            |

Rules: write the mobile style first (no prefix), then add `sm:`/`md:`/`lg:` overrides. Never write desktop-only styles without a mobile fallback. Never use `max-w-` breakpoints (max-width queries); always min-width.

## 2. Layout — admin dashboard

The admin shell (`AdminLayout` / `PropertyAdminShell`) follows this pattern:

```
Mobile (<lg):
  ┌────────────────────────────────────┐
  │ Topbar (56px sticky)               │
  │  [K] Bookings      [refresh] [+]   │
  ├────────────────────────────────────┤
  │ Page content (scrolls)             │
  │  p-3 sm:p-4 lg:p-6                 │
  └────────────────────────────────────┘

Desktop (lg+):
  ┌──────────┬─────────────────────────┐
  │ Sidebar  │ Topbar (56px sticky)    │
  │ (fixed,  ├─────────────────────────┤
  │  220px)  │ Page content            │
  │          │  p-5 lg:p-6             │
  └──────────┴─────────────────────────┘
```

Sidebar is `hidden lg:flex` + fixed position; main area uses `lg:pl-[220px]`. On mobile, the **topbar** is the sole navigation surface — never hide the sidebar without a topbar replacement.

## 3. Touch targets

All interactive elements must meet **WCAG 2.5.5 (AAA) / iOS HIG**: minimum **44 × 44 px**.

```tsx
// Good — icon button with explicit min size
<button className="p-2.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">

// Bad — too small
<button className="p-1 rounded">
```

Table row actions, filter buttons, nav items, and pagination chips must all meet this threshold (`py-2.5` or `min-h-[44px]`).

## 4. Typography scaling

| Use               | Mobile                                        | Desktop          |
| ----------------- | --------------------------------------------- | ---------------- |
| Page title        | `text-lg font-bold` (`text-admin-page-title`) | `sm:text-xl`     |
| Page subtitle     | `text-sm` (`text-admin-page-subtitle`)        | `sm:text-[15px]` |
| Table data        | `text-sm`                                     | `text-[13px]`    |
| Secondary / muted | `text-xs`                                     | `text-[11px]`    |
| Section labels    | `text-xs font-bold uppercase tracking-wider`  | same             |

## 5. Tables

Tables must never cause horizontal overflow on the page:

```tsx
<div className="overflow-x-auto rounded-xl">
  <table className="w-full min-w-[600px]">...</table>
</div>
```

Hide non-critical columns on small screens:

| Column                    | Visible from                 |
| ------------------------- | ---------------------------- |
| Status                    | always                       |
| Guest (name + email)      | always                       |
| Stay (dates + nights)     | always                       |
| Pax                       | `md:`                        |
| Flags (parking/pet icons) | `sm:`                        |
| Amount                    | `lg:`                        |
| Created                   | `md:`                        |
| Actions                   | always (icon only on mobile) |

## 6. Forms and filter bars

Search input always full-width (`w-full`). Filter button strips: `overflow-x-auto` horizontal scroll on mobile — never wrap into multiple rows. Dropdown panels: `absolute`, `max-h-[60vh] overflow-y-auto`, max-width `min(90vw, 320px)`. Input height `h-10` (40 px) minimum.

## 7. Spacing

| Context            | Mobile       | Desktop        |
| ------------------ | ------------ | -------------- |
| Page padding       | `p-3 sm:p-4` | `lg:p-6`       |
| Card / section gap | `space-y-3`  | `sm:space-y-4` |
| Form field gap     | `space-y-4`  | same           |
| Inline button gap  | `gap-1.5`    | same           |

Never use `px-6` or larger without a mobile fallback like `px-4`.

## 8. Images and media

Always set explicit `width`/`height` or `aspect-*` classes. Use `object-cover` inside fixed containers. Never put an `<img>` inside a flex container without `shrink-0` or `min-w-0`.

## 9. Modals and dropdowns

Modals: centered card at all breakpoints (`max-w-[min(calc(100vw-1.5rem),28rem)]`, `max-h-[min(90dvh,…)]`, rounded, scrollable) — avoid full-screen `fixed inset-0` sheets unless intentionally a full-page flow. Dropdowns: `max-w-[calc(100vw-24px)]` safety net on mobile. `z-50` for overlays, `z-40` for sticky headers.

## 10. Don'ts

- Hardcoded pixel widths that assume desktop (`width: 800px` without `max-w-full`).
- `whitespace-nowrap` on text that should wrap at mobile sizes.
- Hiding entire feature sections behind `hidden lg:block` without a mobile alternative.
- `overflow-hidden` on `<body>`/root layout — breaks iOS momentum scrolling.
- `hover:` effects without a touch-safe fallback.
- Fixed `height` on containers holding dynamic text content.

## 11. Before shipping any UI change

- [ ] Works at 375 px and 768 px width
- [ ] No horizontal scroll at any breakpoint (unless an intentional scrollable container)
- [ ] All tap targets ≥ 44 × 44 px
- [ ] Text readable without zooming at 375 px
- [ ] Table and dropdown panels don't overflow the viewport
- [ ] Filter bar usable on mobile (scrollable strip or dropdown)

If Playwright MCP is available (see `.mcp.json` / `verify` skill), actually resize the viewport and check these instead of eyeballing the code.
