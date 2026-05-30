/**
 * Finance aggregations and finance_line_items CRUD.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { computeBookingFinancials } from './bookingFinance.ts';
import { checkInDateToIso } from './bookingsListSort.ts';
import {
  isCancelledBooking,
  passesFinancePeriodFilter,
  type FinancePeriodBasis,
} from './financePeriodFilter.ts';

export type FinanceLineItemKind = 'expense' | 'income';

export type FinanceLineItemRow = {
  id: string;
  kind: FinanceLineItemKind;
  label: string;
  amount: number;
  category: string | null;
  occurred_on: string;
  notes: string | null;
  receipt_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceStaysSummary = {
  count: number;
  completedCount: number;
  guestCollected: number;
  stayRevenue: number;
  parkingMargin: number;
  sdExpenses: number;
  hostNetCompleted: number;
  projectedNetPipeline: number;
  outstandingGuestBalance: number;
};

export type FinanceOperatingSummary = {
  income: number;
  expenses: number;
  net: number;
};

export type FinanceSummaryResult = {
  period: {
    basis: FinancePeriodBasis;
    from: string | null;
    to: string | null;
  };
  stays: FinanceStaysSummary;
  operating: FinanceOperatingSummary;
  grandNet: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

async function fetchAllBookingsForFinance(): Promise<Record<string, unknown>[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('guest_submissions').select('*');
  if (error) throw new Error(`finance bookings query failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

function filterBookings(
  rows: Record<string, unknown>[],
  params: {
    from: string | null;
    to: string | null;
    basis: FinancePeriodBasis;
    includeCancelled: boolean;
    completedOnly: boolean;
    q?: string;
  },
): Record<string, unknown>[] {
  const needle = params.q?.trim().toLowerCase() ?? '';
  return rows.filter((row) => {
    if (!params.includeCancelled && isCancelledBooking(row)) return false;
    if (params.completedOnly && row.status !== 'COMPLETED') return false;
    if (!passesFinancePeriodFilter(row, params.from, params.to, params.basis)) {
      return false;
    }
    if (needle) {
      const hay = [
        row.guest_facebook_name,
        row.primary_guest_name,
        row.guest_email,
      ]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

export function summarizeStays(rows: Record<string, unknown>[]): FinanceStaysSummary {
  let guestCollected = 0;
  let stayRevenue = 0;
  let parkingMargin = 0;
  let sdExpenses = 0;
  let hostNetCompleted = 0;
  let projectedNetPipeline = 0;
  let outstandingGuestBalance = 0;
  let completedCount = 0;

  for (const row of rows) {
    const fin = computeBookingFinancials(row);
    guestCollected += fin.guestCollected;
    if (fin.stayRevenue != null) stayRevenue += fin.stayRevenue;
    if (fin.parkingMargin != null) parkingMargin += fin.parkingMargin;
    sdExpenses += fin.sdExpenseTotal;
    if (fin.isCompleted) {
      completedCount += 1;
      hostNetCompleted += fin.hostNet;
    } else if (fin.projectedNet != null) {
      projectedNetPipeline += fin.projectedNet;
    }
    if (fin.guestUnpaid != null && fin.guestUnpaid > 0) {
      outstandingGuestBalance += fin.guestUnpaid;
    }
  }

  return {
    count: rows.length,
    completedCount,
    guestCollected: roundMoney(guestCollected),
    stayRevenue: roundMoney(stayRevenue),
    parkingMargin: roundMoney(parkingMargin),
    sdExpenses: roundMoney(sdExpenses),
    hostNetCompleted: roundMoney(hostNetCompleted),
    projectedNetPipeline: roundMoney(projectedNetPipeline),
    outstandingGuestBalance: roundMoney(outstandingGuestBalance),
  };
}

export async function listOperatingLineItems(params: {
  from: string | null;
  to: string | null;
}): Promise<FinanceLineItemRow[]> {
  const supabase = getSupabase();
  let q = supabase.from('finance_line_items').select('*').order('occurred_on', {
    ascending: false,
  });
  if (params.from) q = q.gte('occurred_on', params.from);
  if (params.to) q = q.lte('occurred_on', params.to);
  const { data, error } = await q;
  if (error) throw new Error(`finance_line_items query failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    kind: row.kind as FinanceLineItemKind,
    label: String(row.label),
    amount: Number(row.amount),
    category: row.category ? String(row.category) : null,
    occurred_on: String(row.occurred_on).slice(0, 10),
    notes: row.notes ? String(row.notes) : null,
    receipt_path: row.receipt_path ? String(row.receipt_path) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export function summarizeOperating(items: FinanceLineItemRow[]): FinanceOperatingSummary {
  let income = 0;
  let expenses = 0;
  for (const item of items) {
    if (item.kind === 'income') income += item.amount;
    else expenses += item.amount;
  }
  return {
    income: roundMoney(income),
    expenses: roundMoney(expenses),
    net: roundMoney(income - expenses),
  };
}

export async function computeFinanceSummary(params: {
  from: string | null;
  to: string | null;
  basis: FinancePeriodBasis;
  includeCancelled: boolean;
  completedOnly: boolean;
  q?: string;
}): Promise<FinanceSummaryResult> {
  const all = await fetchAllBookingsForFinance();
  const stayRows = filterBookings(all, params);
  const stays = summarizeStays(stayRows);
  const operatingItems = await listOperatingLineItems({
    from: params.from,
    to: params.to,
  });
  const operating = summarizeOperating(operatingItems);
  const grandNet = roundMoney(stays.hostNetCompleted + operating.net);

  return {
    period: {
      basis: params.basis,
      from: params.from,
      to: params.to,
    },
    stays,
    operating,
    grandNet,
  };
}

export type FinanceBookingRow = {
  id: string;
  guest_facebook_name: string;
  primary_guest_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  financials: ReturnType<typeof computeBookingFinancials>;
};

export async function listFinanceBookings(params: {
  from: string | null;
  to: string | null;
  basis: FinancePeriodBasis;
  includeCancelled: boolean;
  completedOnly: boolean;
  q?: string;
  page: number;
  limit: number;
  sort: 'check_in_date:asc' | 'check_in_date:desc' | 'host_net:desc' | 'host_net:asc';
}): Promise<{ rows: FinanceBookingRow[]; total: number }> {
  const all = await fetchAllBookingsForFinance();
  let filtered = filterBookings(all, params);

  filtered.sort((a, b) => {
    if (params.sort === 'host_net:desc' || params.sort === 'host_net:asc') {
      const na = computeBookingFinancials(a).hostNet;
      const nb = computeBookingFinancials(b).hostNet;
      return params.sort === 'host_net:desc' ? nb - na : na - nb;
    }
    const ia = checkInDateToIso(String(a.check_in_date ?? ''));
    const ib = checkInDateToIso(String(b.check_in_date ?? ''));
    return params.sort === 'check_in_date:desc'
      ? ib.localeCompare(ia)
      : ia.localeCompare(ib);
  });

  const total = filtered.length;
  const start = (params.page - 1) * params.limit;
  const pageRows = filtered.slice(start, start + params.limit);

  const rows: FinanceBookingRow[] = pageRows.map((row) => ({
    id: String(row.id),
    guest_facebook_name: String(row.guest_facebook_name ?? ''),
    primary_guest_name: String(row.primary_guest_name ?? ''),
    check_in_date: String(row.check_in_date ?? ''),
    check_out_date: String(row.check_out_date ?? ''),
    status: String(row.status ?? ''),
    financials: computeBookingFinancials(row),
  }));

  return { rows, total };
}

export async function createFinanceLineItem(
  input: {
    kind: FinanceLineItemKind;
    label: string;
    amount: number;
    category?: string | null;
    occurred_on: string;
    notes?: string | null;
    receipt_path?: string | null;
  },
  createdBy: string,
): Promise<FinanceLineItemRow> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('finance_line_items')
    .insert({
      kind: input.kind,
      label: input.label.slice(0, 200),
      amount: input.amount,
      category: input.category?.slice(0, 80) ?? null,
      occurred_on: input.occurred_on,
      notes: input.notes?.slice(0, 2000) ?? null,
      receipt_path: input.receipt_path ?? null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw new Error(`create finance_line_item failed: ${error.message}`);
  return {
    id: String(data.id),
    kind: data.kind as FinanceLineItemKind,
    label: String(data.label),
    amount: Number(data.amount),
    category: data.category ? String(data.category) : null,
    occurred_on: String(data.occurred_on).slice(0, 10),
    notes: data.notes ? String(data.notes) : null,
    receipt_path: data.receipt_path ? String(data.receipt_path) : null,
    created_by: data.created_by ? String(data.created_by) : null,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export async function updateFinanceLineItem(
  id: string,
  patch: Partial<{
    kind: FinanceLineItemKind;
    label: string;
    amount: number;
    category: string | null;
    occurred_on: string;
    notes: string | null;
    receipt_path: string | null;
  }>,
): Promise<FinanceLineItemRow> {
  const supabase = getSupabase();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.kind) update.kind = patch.kind;
  if (patch.label != null) update.label = patch.label.slice(0, 200);
  if (patch.amount != null) update.amount = patch.amount;
  if (patch.category !== undefined) {
    update.category = patch.category?.slice(0, 80) ?? null;
  }
  if (patch.occurred_on) update.occurred_on = patch.occurred_on;
  if (patch.notes !== undefined) update.notes = patch.notes?.slice(0, 2000) ?? null;
  if (patch.receipt_path !== undefined) update.receipt_path = patch.receipt_path;

  const { data, error } = await supabase
    .from('finance_line_items')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(`update finance_line_item failed: ${error.message}`);
  return {
    id: String(data.id),
    kind: data.kind as FinanceLineItemKind,
    label: String(data.label),
    amount: Number(data.amount),
    category: data.category ? String(data.category) : null,
    occurred_on: String(data.occurred_on).slice(0, 10),
    notes: data.notes ? String(data.notes) : null,
    receipt_path: data.receipt_path ? String(data.receipt_path) : null,
    created_by: data.created_by ? String(data.created_by) : null,
    created_at: String(data.created_at),
    updated_at: String(data.updated_at),
  };
}

export async function deleteFinanceLineItem(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('finance_line_items').delete().eq('id', id);
  if (error) throw new Error(`delete finance_line_item failed: ${error.message}`);
}
