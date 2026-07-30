# Finance — operator guide

Route: `/org/:orgSlug/property/:propertySlug/finance` (also used, minus stays, at `/org/:orgSlug/parking/:parkingSlug/finance`)

> **Status:** Documented.

## Progress overview

| Section            | E2E save | Validation | Docs       | Notes                                    |
| ------------------ | -------- | ---------- | ---------- | ---------------------------------------- |
| Summary cards      | —        | —          | Documented | Income, expenses, net, pending           |
| Charts             | —        | —          | Documented | Cash-flow + income/expense breakdown     |
| Unified ledger     | ✅       | ✅         | Documented | Stays + transactions in one list         |
| Transaction CRUD   | ✅       | ✅ Zod     | Documented | `finance_line_items`, recurring series   |
| Telegram reminders | ✅       | —          | Documented | Per-transaction due-date reminders       |
| Export report      | ✅       | —          | Documented | Client-side PDF; per-section or combined |
| Settings tab       | —        | —          | Documented | Redirects to Notifications → Finance     |

---

## Overview

Single-page finance view — no tabs. A **date range** picker in the page header (alongside **Export report** and **Add Transaction**) controls the reporting period; there's no separate period-basis dropdown, stays are always attributed by check-in date.

**Summary cards:** Total Income, Total Expenses, Net Profit, Pending Payments, each with a vs-previous-period delta when a bounded date range is selected.

**Charts:** a cash-flow area chart plus an income/expense/all category-breakdown donut — the same chart components used on the property dashboard.

**Unified ledger:** stay bookings and manual operating transactions appear together in one list, switchable between **table**, **card**, and **calendar** views (`?view=table|card|calendar`; mobile always defaults to card). Each row shows date, description, category, status (`completed` | `pending` | `canceled`), and net amount.

The parking-scoped finance page (`/org/:orgSlug/parking/:parkingSlug/finance`) reuses this same page and components but hides the stays ledger and stays export section (parking has no `guest_submissions` rows) — see `scope.parkingId` gating throughout.

---

## Host-facing knowledge

Finance gives hosts one place to see how much money is coming in and going out for a property over a chosen date range — booking income alongside manually-added expenses and other income, with charts and a combined transaction list. Hosts can add one-off or recurring expenses/income (like monthly utility bills), get a Telegram reminder before each is due, and export a PDF report for any period.

**Common host questions**

- Q: Why does a booking show up in my Finance list — did someone add it manually?
  A: No — every stay's income is pulled in automatically alongside anything you add manually (like expenses). You don't need to add booking income yourself.
- Q: Can I get reminded before a bill is due?
  A: Yes — when adding a transaction you can turn on a Telegram reminder with how many days before the due date (and how often) you want to be notified.
- Q: How do I get a report to send to my accountant?
  A: Use **Export report** in the page header — you can export just the summary, just stays, just transactions, or a full combined report as a PDF for the selected date range.
- Q: I set up a recurring expense — can I edit just one occurrence without changing future ones?
  A: Yes — when editing or deleting a recurring transaction you're asked whether the change applies to just that occurrence, that one and all future ones, or the whole series.

---

## Summary cards & charts

### Fields

| Card             | Computation                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| Total Income     | Completed stay income + completed manual income items                  |
| Total Expenses   | Completed manual expense items (+ SD/parking payouts where applicable) |
| Net Profit       | Income − Expenses for the period                                       |
| Pending Payments | Outstanding guest balances / unpaid manual items                       |

Charts (`FinanceTransactionsChart`) plot the same underlying data as cash-flow (by day/week) and income vs. expense category breakdown, reused from the property dashboard's chart components.

---

## Unified ledger

### Fields (per row)

| Field       | Source                                                                           |
| ----------- | -------------------------------------------------------------------------------- |
| Date        | Stay check-in date, or transaction `occurred_on`                                 |
| Description | Guest/property name, or transaction `label`                                      |
| Category    | Stay category (fixed), or transaction `category`                                 |
| Status      | Booking status mapped to `completed`/`pending`/`canceled`, or transaction status |
| Amount      | Net amount (income positive, expense negative)                                   |

### Toolbar (`FinanceLedgerToolbar`)

- Row 1: search (left) + Type filter (income/expense/all) / Status filter / Category filter + Clear filters (right).
- Row 2: sort (date/amount, asc/desc) + per-page (hidden in calendar view) on the left; view toggle (table/card/calendar) on the right.

### Behavior / edge cases

- Legacy URLs (`?tab=overview|stays|transactions`) still parse for backward compatibility with old links.
- **`?tab=settings`** redirects to **Notifications → Finance** (`propertyNotificationsPath(orgSlug, propertySlug, 'finance')`) — Finance has no in-page settings tab anymore; due-date reminder configuration lives there.
- Stay rows open the **stay finance modal** (read-only financial breakdown for that booking); transaction rows support **edit**, **delete**, and (for recurring items) **view series**.

---

## Transaction CRUD (`finance_line_items`)

### Fields

| Field                      | Storage                                         | Validation                                                                             |
| -------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Kind                       | `finance_line_items.kind`                       | `expense` \| `income`                                                                  |
| Label                      | `finance_line_items.label`                      | Required, max 200 chars                                                                |
| Amount                     | `finance_line_items.amount`                     | Required, > 0                                                                          |
| Category                   | `finance_line_items.category`                   | Required, max 80 chars (combobox)                                                      |
| Occurred on                | `finance_line_items.occurred_on`                | Required, `YYYY-MM-DD`                                                                 |
| Notes                      | `finance_line_items.notes`                      | Optional, max 2000 chars                                                               |
| Recurrence interval        | `finance_line_items.recurrence_interval`        | none/daily/weekly/monthly/twice-monthly/every-2-months/quarterly/every-6-months/yearly |
| Recurrence until           | Series metadata                                 | Optional end date when recurring                                                       |
| Telegram reminder toggle   | `finance_line_items.telegram_reminder_enabled`  | Boolean                                                                                |
| Telegram days before       | `finance_line_items.telegram_days_before`       | 0–90                                                                                   |
| Telegram reminder interval | `finance_line_items.telegram_reminder_interval` | Reminder cadence enum                                                                  |
| Telegram message template  | `finance_line_items.telegram_message_template`  | Optional custom text                                                                   |

### Save path

1. **Add Transaction** (page header) or **Edit** on a ledger row opens `OperatingLineItemForm`.
2. Submit → **`finance-line-items`** POST (create) or PATCH (update).
3. Recurring items generate/extend a series (`recurrence_series_id`); editing/deleting prompts an **edit scope**: this occurrence only, this and future, or the whole series (`RecurringSeriesModal`, `RecurringDeleteDialog`).
4. Delete → **`finance-line-items`** DELETE, same edit-scope prompt for recurring items.

### Behavior / edge cases

- Telegram due-date reminders are sent via the property's Finance Telegram integration, configured under **Notifications → Finance** (not on this page).
- `paid_at` on a line item stops future reminders for that item across every reminder interval.

---

## Export report

Client-side PDF generation (no export round-trip beyond fetching the needed data) via **Export report** in the header:

| Option           | Content                                            |
| ---------------- | -------------------------------------------------- |
| Full report      | Summary + stays ledger + transactions (combined)   |
| Overview summary | Summary cards only                                 |
| Stays ledger     | Stay rows for the period (hidden on parking scope) |
| Transactions     | Manual operating transactions for the period       |

A separate **`finance-export`** edge function exists for server-generated CSV downloads but is not currently wired to any UI action — the shipped **Export report** menu builds PDFs client-side from the same summary/line-item/booking data already fetched for the page.

---

## API reference

| Action                                       | Endpoint                                   |
| -------------------------------------------- | ------------------------------------------ |
| Summary KPIs                                 | `GET finance-summary`                      |
| Stay ledger rows                             | `GET finance-bookings`                     |
| List / create / update / delete transactions | `GET/POST/PATCH/DELETE finance-line-items` |
| CSV export (unused by UI)                    | `GET finance-export`                       |

---

## Implementation map

| Concern             | Path                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page                | `ui/src/features/dashboard/finance/pages/FinancePage.tsx`                                                                                                                                                                                                     |
| Route               | `ui/src/features/dashboard/finance/routes/index.tsx`                                                                                                                                                                                                          |
| Summary cards       | `ui/src/features/dashboard/finance/components/FinanceSummaryCards.tsx`                                                                                                                                                                                        |
| Ledger toolbar      | `ui/src/features/dashboard/finance/components/FinanceLedgerToolbar.tsx`                                                                                                                                                                                       |
| Ledger views        | `ui/src/features/dashboard/finance/components/FinanceLedgerTable.tsx`, `ui/src/features/dashboard/finance/components/FinanceLedgerCardGrid.tsx`, `ui/src/features/dashboard/finance/components/FinanceLedgerCalendarView.tsx`                                 |
| Ledger merge/filter | `ui/src/features/dashboard/finance/lib/financeLedger.ts`                                                                                                                                                                                                      |
| Summary stats       | `ui/src/features/dashboard/finance/lib/financeSummaryStats.ts`                                                                                                                                                                                                |
| Charts              | `ui/src/features/dashboard/finance/components/FinanceTransactionsChart.tsx`                                                                                                                                                                                   |
| Transaction form    | `ui/src/features/dashboard/finance/components/OperatingLineItemForm.tsx`                                                                                                                                                                                      |
| Recurrence modals   | `ui/src/features/dashboard/finance/components/RecurringSeriesModal.tsx`, `ui/src/features/dashboard/finance/components/RecurringDeleteDialog.tsx`                                                                                                             |
| Export menu + PDF   | `ui/src/features/dashboard/finance/components/FinanceExportMenu.tsx`, `ui/src/features/dashboard/finance/lib/exportPdf.ts`                                                                                                                                    |
| Hooks               | `ui/src/features/dashboard/finance/hooks/useFinanceSummary.ts`, `ui/src/features/dashboard/finance/hooks/useFinanceBookings.ts`, `ui/src/features/dashboard/finance/hooks/useFinanceLineItems.ts`, `ui/src/features/dashboard/finance/hooks/useFinanceApi.ts` |
| Edge                | `supabase/functions/finance-summary/`, `supabase/functions/finance-bookings/`, `supabase/functions/finance-line-items/`, `supabase/functions/finance-export/`                                                                                                 |
| Shared services     | `supabase/functions/_shared/{financeService,financeAssetScope,financeHttp,telegramFinance}.ts`                                                                                                                                                                |

---

## Related docs

- [Route index](../../README.md)
- [Property dashboard](./dashboard.md) — shared chart components
- [Property notifications](./notifications.md) — Finance Telegram reminder settings
- [Parking finance](../parking/finance.md) — same page, parking scope
- [`docs/PROJECT.md`](../../../PROJECT.md)
