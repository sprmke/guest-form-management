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
  │ Topbar (tenant switcher)           │
  ├────────────────────────────────────┤
  │ Page content (scrolls)             │
  │  p-3 sm:p-4 + bottom tab inset     │
  ├────────────────────────────────────┤
  │ BottomTabBar (primary + More)      │
  │  or ContextualActionBar (edit)     │
  └────────────────────────────────────┘

Desktop (lg+):
  ┌──────────┬─────────────────────────┐
  │ Sidebar  │ Page content            │
  │ (flex,   │  p-5 lg:p-6             │
  │  collapsible) │                    │
  └──────────┴─────────────────────────┘
```

- Desktop sidebar is `hidden lg:flex` (collapsible width); main column fills the rest.
- On mobile, **bottom tabs** are the primary navigation: **Dashboard**, **Bookings**, **Inbox** (when present), **Notifications**, **Assistant** (when enabled), and **More**. Assistant and Notifications open the same slide-over / sheet as desktop — they are not extra header icons. Remaining pages (including Finance) live in the More sheet. The hamburger drawer is retired. More sheet nav rows use dense chrome (`text-[13px]` / `size-4` icons, 44px min height) — same scale as ModeSwitcher / list toolbars, not `text-sm` body.
- Screens with a dominant primary action (e.g. booking edit Save/Cancel) mount `ContextualActionBar`, which hides the tab bar for that route.
- Shared primitives: `ui/src/components/mobile/` (`BottomTabBar`, `BottomBarSlot`, `ContextualActionBar`, `MobileAppShell`, `PageTransition`, `MobileHeroActionMenu`, `AdminListRefineSheet`).
- **Hero trailing:** never render multiple icon buttons. Use `MobileHeroActionMenu` (1 item = direct icon; 2+ = one ··· dropdown). Same idea as Guest pages menu.
- **List toolbars (`max-lg`):** progressive disclosure — search + refine icon (opens `AdminListRefineSheet` for filters/sort/per-page) + view toggle. Do not stack Status/Filters/Sort/Per-page as separate full-width rows on mobile. Desktop (`lg+`) keeps the inline multi-control toolbar.
- **Dashboard density (`max-lg`):** hide page/hero subtitles (`AdminMobilePage` / `AdminPageHeader` / `MobileBrandHero` — never re-show them as body copy below `lg`), KPI decorative icons, repeated “vs last period” labels, chart icon wells/descriptions, and period eyebrows when the date filter already conveys the range. Prefer title-only section headers. **Card-header segments** (`AdminSurfaceCardHeader` actions: Name/Price, All/Income/Expenses, revenue/bookings): always **right of the title on one row**, `SegmentedControl` `size="dense"` + `equalSegments`, shared `cardHeaderSegmented*ClassName` (~28px track, 11px labels) — never stack under the title or use content-sized uneven pills. Form/toolbar segments use dense (~32px, `h-8` + `p-0.5`); page/section strips use compact/primary (~36px). Never add `h-9`/`p-1` or `min-h-[44px]` on dense triggers — use `fullWidth` for equal Sign/Upload-style pairs. Keep comfortable card/section gaps (≈10–14px gutters, `p-3`+ padding) — dense chrome, not cramped type.
- **Choice pickers (`max-lg`):** option lists open as `MobileChoiceSheet` (full-width ≥48px rows), not tiny floating dropdowns. Desktop (`lg+`) keeps `DropdownMenu` / absolute panels. Shared: `ui/src/components/mobile/MobileChoiceSheet.tsx`.
- **Choice pickers (`max-lg`):** option lists open as `MobileChoiceSheet` (full-width ≥48px rows), not tiny floating dropdowns. Desktop (`lg+`) keeps `DropdownMenu` / absolute panels. Shared: `ui/src/components/mobile/MobileChoiceSheet.tsx`.
- Floating pill tab bar — content uses `max-lg:pb-[calc(7.75rem+env(safe-area-inset-bottom))]` via `bottomTabBarOffsetClassName()`. On document-scroll pages apply it on `MobileAppShell`; on **fill-main** pages (`AdminSectionNavLayout`, Inbox) apply it on the **inner scrollport / content root** instead — shell `pb` shrinks the flex area into a dead white gap and clips mid-card. Avoid shell `p-*` shorthand (twMerge drops the clearance). Active tab uses a solid brand pill + on-primary labels; icons ~18px / stroke 1.75 (not chunky); dock chrome is `mobileFloatingDockClassName`.
- Sticky brand hero (`max-lg`): **straight bottom edge — no arc.** Scroll parallax compresses the title + bottom pad only (`--hero-collapse`); never re-add a curved/elliptical edge. Float toolbar (date range) straddles the green/white seam and morphs into fixed `MobileStickyChrome` when its top hits the viewport (`useMobileStickyChrome`). Heavy lists: compact sticky row + More sheet.
- Hero bottom pad (`max-lg`): the `2.5rem` hero bottom pad is for seating a straddling float. No-float pages (no date-range picker — Inbox, Notifications, Plans, Settings, Team…) pass `MobileBrandHero flush` (`AdminMobilePage` derives it from `!overlap`) → `.mobile-brand-hero--flush` tightens it to `~0.9rem` so the title hugs the white canvas instead of floating over a tall green band. No `-mt-6` tuck; no-float stack pad is `pt-3`.
- Brand hero on a bespoke page: a page that can't wrap in `AdminMobilePage` (own layout / own desktop header — e.g. property `BookingDetailPage`) renders `<MobileBrandHero className="md:hidden" flush collapseProgress={useMobileHeroCollapseProgress(heroRef, isBelowMd)} />` directly + marks its content root `data-page-brand-hero`. A scoped `@media (max-width:767px)` rule in `index.css` drops the `AdminLayout` fallback topbar + shell gutter below `md` (tablet/desktop keep the plain topbar); re-add the phone gutter with `max-md:px-3.5 max-md:pt-3`, and demote any in-body page heading to `h2` (hero owns the `h1`).
- Prefer `surface-card` / `native-cta` / `native-stagger` / `native-press` for dashboard content on mobile.
- Modals: never render a centered desktop `Dialog` on mobile — anywhere. Every modal (dashboard + guest) uses `ResponsiveModal` (`ui/src/components/ui/responsive-modal.tsx`): centered `Dialog` on `lg+`, bottom sheet below `lg`; guest modals go through `GuestDialogShell` which wraps it. Don't import `@/components/ui/dialog` directly in feature code. Exceptions: `AlertDialog` (OS-style destructive confirm) and full-screen media/document lightboxes.

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

Native-app density on phone (≈ iOS HIG ops apps). Prefer shared tokens in `ui/src/index.css`.

| Use                         | Mobile                                                                                                                                                                     | Desktop                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Hero / page title           | `text-lg` (`text-admin-page-title`, hero h1)                                                                                                                               | `sm:text-xl` → `md:text-2xl`    |
| Section title               | `text-sm` (`text-section-title`)                                                                                                                                           | `sm:text-[15px]`                |
| Card title                  | `text-sm` (`text-card-title`)                                                                                                                                              | `sm:text-base`                  |
| Card description            | `text-xs` (`text-card-description`)                                                                                                                                        | `sm:text-sm`                    |
| Body / UI                   | `text-sm` (`text-ui`)                                                                                                                                                      | same                            |
| KPI / stat value            | `text-base` (`text-stat-value`)                                                                                                                                            | `sm:text-xl` → `md:text-2xl`    |
| List amount                 | `text-[15px]` (`text-list-amount`)                                                                                                                                         | `sm:text-base`                  |
| Secondary / muted           | `text-xs` (`text-data-secondary`, `text-meta`)                                                                                                                             | `sm:text-[13px]` / `sm:text-sm` |
| Overflow (⋯) menus          | `admin-overflow-trigger` (32px visual + expanded hit) — never outline `min-h-[44px]` boxes on phone                                                                        | same or labeled Manage          |
| Tabs / segments (dashboard) | Form/toolbar: `SegmentedControl` `dense` (~h-8, label ~11–12px); section strips: `compact`/`primary` (~h-9). Never `h-9 p-1` or `min-h-[44px]` overrides on dense triggers | same                            |
| List search fields          | `text-[13px]` placeholder/value on phone                                                                                                                                   | `lg:text-sm`                    |
| Table data                  | `text-sm`                                                                                                                                                                  | `text-[13px]`                   |
| Caption / overline          | `text-[10px]`–`text-xs`                                                                                                                                                    | same                            |

**Do not** bump phone titles with `max-sm:text-[1.65rem]` or KPI values with `text-lg`/`text-2xl` on `max-lg` — that reads oversized vs native apps.

**Marketing display exception:** full-bleed marketing heroes (`MarketingPublicPageHero`, for-hosts film, stay-guide showcase templates) may use `text-3xl`–`text-5xl`. Do **not** apply that display scale to admin chrome, guest form/account/auth, listing cards, or operational public flows.

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

Search input always full-width (`w-full`). Filter button strips: `overflow-x-auto` horizontal scroll on mobile — never wrap into multiple rows. Dropdown panels: `absolute`, `max-h-[60vh] overflow-y-auto`, max-width `min(90vw, 320px)`. Input height `h-10` (40 px) minimum. `Input`, `Select` (`SelectTrigger`), and `Textarea` primitives self-align to `h-10` / `px-3` on mobile (`max-lg:`) so mixed form columns line up (desktop keeps `Select` `h-11` / `px-4`) — don't re-add per-call-site `h-10` overrides. Modal / sheet titles: `ResponsiveModalTitle` uses the `DialogTitle` scale in sheet mode too (`text-base font-bold tracking-tight sm:text-lg`) — never hard-code `text-lg` as a modal title's mobile base. `Input`, `Select` (`SelectTrigger`), and `Textarea` primitives self-align to `h-10` / `px-3` on mobile (`max-lg:`) so mixed form columns line up (desktop keeps `Select` `h-11` / `px-4`) — don't re-add per-call-site `h-10` overrides. Modal / sheet titles: `ResponsiveModalTitle` uses the `DialogTitle` scale in sheet mode too (`text-base font-bold tracking-tight sm:text-lg`) — never hard-code `text-lg` as a modal title's mobile base.

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

Modals: no centered `Dialog` on mobile — anywhere. Every modal (dashboard confirms/forms/detail panels + guest booking/calendar modals) uses `ResponsiveModal` (centered on `lg+`, bottom sheet below); guest modals via `GuestDialogShell`. Only `AlertDialog` and full-screen media lightboxes stay non-sheet. Dropdowns: `max-w-[calc(100vw-24px)]` safety net on mobile. `z-50` for overlays, `z-40` for sticky headers and the bottom tab / contextual bar.

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
