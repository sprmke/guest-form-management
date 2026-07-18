# Parking finance — operator guide

Route: `/org/:orgSlug/parking/:parkingSlug/finance`

> **Status:** Documented

## Overview

Same finance dashboard as property **`FinancePage`**: month/date filter, summary cards, cash-flow chart, ledger toolbar (table / card / calendar), **Add Transaction**, and **Export report**. Operating income and expense lines are scoped to the parking slot via `parking_id` on `finance_line_items`. There is no stays ledger for parking (no `guest_submissions` link); summary cards and charts reflect operating transactions only.

---

## Permissions

Requires parking team **`finance:view`** (read) and **`finance:edit`** (create/update/delete transactions). Enforced server-side in `resolveFinanceAssetAccess` → `verifyParkingTeamAccess`.

---

## Add / edit transaction

- **Add Transaction** opens the shared `FinanceTransactionModals` / `OperatingLineItemForm` (income or expense, category, amount, date, notes, recurrence, Telegram reminder when finance Telegram is configured for this parking slot).
- Configure finance Telegram under **Notifications → Finance** (`/notifications?module=finance`).
- Edit/delete from table, card, or calendar row actions.
- Recurring series: same modal flows as property finance.

---

## Export

**Export report** menu: overview, transactions, and full report (PDF). Stays ledger export is hidden on parking finance.

CSV: `GET /functions/v1/finance-export?parking_id=…&type=…`

---

## API

| Method                | Edge function        | Scope          |
| --------------------- | -------------------- | -------------- |
| GET                   | `finance-summary`    | `?parking_id=` |
| GET/POST/PATCH/DELETE | `finance-line-items` | `?parking_id=` |
| GET                   | `finance-export`     | `?parking_id=` |

Property finance uses `property_id` instead; never send both.

---

## Implementation map

| Concern      | Path                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Page         | `ui/src/features/dashboard/parking/pages/ParkingFinancePage.tsx`                               |
| Shared UI    | `ui/src/features/dashboard/finance/components/*`                                               |
| Hooks        | `useFinanceSummary`, `useFinanceLineItems` (asset scope via `useAdminAssetScope`)              |
| API client   | `ui/src/features/dashboard/finance/hooks/useFinanceApi.ts`, `assetEdgeFetch`                   |
| DB           | `finance_line_items.parking_id` — migration `20260919120000_finance_line_items_parking_id.sql` |
| Server scope | `supabase/functions/_shared/financeAssetScope.ts`                                              |
| Server CRUD  | `supabase/functions/finance-line-items/index.ts`                                               |
