# Finance — operator guide

Route: `/org/:orgSlug/property/:propertySlug/finance`

> **Status:** Documented

## Progress overview

| Section          | E2E save | Validation | Docs       | Notes                                   |
| ---------------- | -------- | ---------- | ---------- | --------------------------------------- |
| Summary cards    | —        | —          | Documented | Income, expenses, net, pending          |
| Charts           | —        | —          | Documented | Same cash-flow + breakdown as dashboard |
| Unified ledger   | ✅       | ✅         | Documented | Stays + transactions mixed              |
| Transaction CRUD | ✅       | ✅         | Documented | `finance_line_items`                    |
| Export report    | ✅       | —          | Documented | PDF menu (top right)                    |

---

## Overview

Single-page finance view (no tabs). Period is controlled by the **date range** in the page header (top right, beside **Export report** and **Add Transaction**). Stays are attributed by **check-in date** (no period-basis dropdown).

**Summary cards:** Total Income, Total Expenses, Net Profit, Pending Payments — with vs-last-period deltas when a bounded range is selected.

**Charts:** Cash-flow area chart + category breakdown donut (income / expenses / all), same components as the property dashboard.

**Ledger:** Stays and manual `finance_line_items` transactions appear in one list with **table / card / calendar** views (`?view=table|card|calendar`). Columns: date, description, category, status (`completed` | `pending` | `canceled`), net amount.

**Toolbar** (`FinanceLedgerToolbar`):

- Row 1: search (left) + Type / Status / Category filters + Clear filters (right)
- Row 2: sort + per-page (left; per-page hidden in calendar view) | view toggle (right)

**Add Transaction** (page header) opens the operating-line-item form (recurrence + optional Telegram reminders). Stay rows open the stay finance modal; transaction rows support edit/delete/series.

Finance Telegram due-date reminders are configured under **Notifications → Finance**.

Legacy URLs (`?tab=overview|stays|transactions`) still parse; `?tab=settings` redirects to notifications.

---

## Implementation map

| Concern             | Path                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| Page                | `ui/src/features/dashboard/finance/pages/FinancePage.tsx`                   |
| Summary cards       | `ui/src/features/dashboard/finance/components/FinanceSummaryCards.tsx`      |
| Ledger merge/filter | `ui/src/features/dashboard/finance/lib/financeLedger.ts`                    |
| Summary stats       | `ui/src/features/dashboard/finance/lib/financeSummaryStats.ts`              |
| Charts              | `ui/src/features/dashboard/finance/components/FinanceTransactionsChart.tsx` |
| API                 | `finance-summary`, `finance-bookings`, `finance-line-items`                 |

---

## Related docs

- [Route index](../../README.md)
- [`docs/PROJECT.md`](../../../PROJECT.md)
