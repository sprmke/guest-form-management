import { eachDayOfInterval, format, parseISO } from "date-fns";
import { financeDisplayNet } from "@/features/admin/lib/bookingFinance";
import { bookingDateForPeriod } from "@/features/finance/lib/financePeriod";
import type {
  FinanceBookingLedgerRow,
  FinanceLineItem,
  FinancePeriodBasis,
} from "@/features/finance/lib/types";
import {
  getFinanceCategoryColor,
  getFinanceCategoryLabel,
} from "@/features/finance/lib/financeCategoryColors";

export const STAY_NET_CATEGORY = "Stay net";

export type FinanceCashFlowPoint = {
  date: string;
  income: number;
  expenses: number;
  net: number;
  /** Host net from stays bucketed to this day (already net of stay expenses). */
  stayNetIncome: number;
  /** Manual finance_line_items income on this day. */
  transactionIncome: number;
  stayNetExpense: number;
  transactionExpense: number;
};

export type FinanceCategoryBreakdown = {
  category: string;
  label: string;
  amount: number;
  color: string;
  percentage: number;
};

export type FinanceChartData = {
  cashFlowData: FinanceCashFlowPoint[];
  incomeBreakdown: FinanceCategoryBreakdown[];
  expenseBreakdown: FinanceCategoryBreakdown[];
};

function bookingChartDateIso(
  row: FinanceBookingLedgerRow,
  basis: FinancePeriodBasis,
): string | null {
  const iso = bookingDateForPeriod(row, basis);
  return iso || null;
}

function resolveChartDateRange(
  items: FinanceLineItem[],
  bookings: FinanceBookingLedgerRow[],
  from: string | null,
  to: string | null,
  basis: FinancePeriodBasis,
): { from: Date; to: Date } | null {
  if (from && to) {
    return { from: parseISO(from), to: parseISO(to) };
  }

  const isoDates: string[] = [];
  for (const item of items) isoDates.push(item.occurred_on);
  for (const row of bookings) {
    const iso = bookingChartDateIso(row, basis);
    if (iso) isoDates.push(iso);
  }

  if (isoDates.length === 0) return null;
  isoDates.sort();
  return {
    from: parseISO(isoDates[0]!),
    to: parseISO(isoDates[isoDates.length - 1]!),
  };
}

function groupBreakdown(
  items: FinanceLineItem[],
  kind: FinanceLineItem["kind"],
): FinanceCategoryBreakdown[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.kind !== kind) continue;
    const key = getFinanceCategoryLabel(item.category);
    totals.set(key, (totals.get(key) ?? 0) + item.amount);
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, amount]) => sum + amount, 0);

  return sorted.map(([label, amount], index) => ({
    category: label,
    label,
    amount,
    color: getFinanceCategoryColor(label, index),
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }));
}

/** Merge income + expense slices by category label for the breakdown "All" view. */
export function combineFinanceCategoryBreakdown(
  income: FinanceCategoryBreakdown[],
  expense: FinanceCategoryBreakdown[],
): FinanceCategoryBreakdown[] {
  const totals = new Map<string, number>();
  for (const slice of [...income, ...expense]) {
    totals.set(slice.label, (totals.get(slice.label) ?? 0) + slice.amount);
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, amount]) => sum + amount, 0);

  return sorted.map(([label, amount], index) => ({
    category: label,
    label,
    amount,
    color: getFinanceCategoryColor(label, index),
    percentage: total > 0 ? (amount / total) * 100 : 0,
  }));
}

function mergeStayNetIncomeBreakdown(
  transactionBreakdown: FinanceCategoryBreakdown[],
  stayNetTotal: number,
): FinanceCategoryBreakdown[] {
  if (stayNetTotal <= 0) return transactionBreakdown;

  const merged = [
    ...transactionBreakdown,
    {
      category: STAY_NET_CATEGORY,
      label: STAY_NET_CATEGORY,
      amount: stayNetTotal,
      color: getFinanceCategoryColor(STAY_NET_CATEGORY, 0),
      percentage: 0,
    },
  ].sort((a, b) => b.amount - a.amount);

  const total = merged.reduce((sum, slice) => sum + slice.amount, 0);
  return merged.map((slice, index) => ({
    ...slice,
    color: getFinanceCategoryColor(slice.label, index),
    percentage: total > 0 ? (slice.amount / total) * 100 : 0,
  }));
}

function bucketStayNetByDay(
  bookings: FinanceBookingLedgerRow[],
  basis: FinancePeriodBasis,
): {
  incomeByDay: Map<string, number>;
  expenseByDay: Map<string, number>;
  stayNetIncomeTotal: number;
} {
  const incomeByDay = new Map<string, number>();
  const expenseByDay = new Map<string, number>();
  let stayNetIncomeTotal = 0;

  for (const row of bookings) {
    const dateIso = bookingChartDateIso(row, basis);
    if (!dateIso) continue;

    // Cash flow uses realized host net for completed stays; projected net only
    // when the period basis attributes an in-progress stay to that date.
    const net =
      basis === "completed" || row.status === "COMPLETED"
        ? (financeDisplayNet(row.financials) ?? 0)
        : (row.financials.projectedNet ?? 0);

    if (net > 0) {
      incomeByDay.set(dateIso, (incomeByDay.get(dateIso) ?? 0) + net);
      stayNetIncomeTotal += net;
    } else if (net < 0) {
      expenseByDay.set(
        dateIso,
        (expenseByDay.get(dateIso) ?? 0) + Math.abs(net),
      );
    }
  }

  return { incomeByDay, expenseByDay, stayNetIncomeTotal };
}

export function buildFinanceChartData(
  items: FinanceLineItem[],
  bookings: FinanceBookingLedgerRow[],
  from: string | null,
  to: string | null,
  basis: FinancePeriodBasis = "completed",
): FinanceChartData {
  const { incomeByDay, expenseByDay, stayNetIncomeTotal } = bucketStayNetByDay(
    bookings,
    basis,
  );
  const range = resolveChartDateRange(items, bookings, from, to, basis);

  if (!range) {
    return {
      cashFlowData: [],
      incomeBreakdown: mergeStayNetIncomeBreakdown(
        groupBreakdown(items, "income"),
        stayNetIncomeTotal,
      ),
      expenseBreakdown: groupBreakdown(items, "expense"),
    };
  }

  const days = eachDayOfInterval({ start: range.from, end: range.to });
  const cashFlowData = days.map((day) => {
    const dayKey = format(day, "yyyy-MM-dd");
    const dayItems = items.filter((item) => item.occurred_on === dayKey);
    const transactionIncome = dayItems
      .filter((item) => item.kind === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const transactionExpense = dayItems
      .filter((item) => item.kind === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const stayNetIncome = incomeByDay.get(dayKey) ?? 0;
    const stayNetExpense = expenseByDay.get(dayKey) ?? 0;
    const income = transactionIncome + stayNetIncome;
    const expenses = transactionExpense + stayNetExpense;
    return {
      date: format(day, "MMM d"),
      income,
      expenses,
      net: income - expenses,
      stayNetIncome,
      transactionIncome,
      stayNetExpense,
      transactionExpense,
    };
  });

  return {
    cashFlowData,
    incomeBreakdown: mergeStayNetIncomeBreakdown(
      groupBreakdown(items, "income"),
      stayNetIncomeTotal,
    ),
    expenseBreakdown: groupBreakdown(items, "expense"),
  };
}
