/**
 * CSV builders for finance-export edge function.
 */

import { computeBookingFinancials } from './bookingFinance.ts';
import {
  computeFinanceSummary,
  listOperatingLineItems,
  type FinanceLineItemRow,
} from './financeService.ts';
import type { FinancePeriodBasis } from './financePeriodFilter.ts';
import { isCancelledBooking, passesFinancePeriodFilter } from './financePeriodFilter.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return lines.join('\r\n');
}

export type FinanceExportParams = {
  type: 'overview' | 'stays' | 'operating' | 'combined';
  from: string | null;
  to: string | null;
  basis: FinancePeriodBasis;
  includeCancelled: boolean;
  completedOnly: boolean;
  q?: string;
};

export async function buildFinanceExportCsv(params: FinanceExportParams): Promise<{
  filename: string;
  body: string;
}> {
  const periodLabel = `${params.basis}_${params.from ?? 'all'}_${params.to ?? 'all'}`;

  if (params.type === 'overview') {
    const summary = await computeFinanceSummary(params);
    const headers = ['metric', 'value'];
    const rows: (string | number)[][] = [
      ['period_basis', summary.period.basis],
      ['from', summary.period.from ?? ''],
      ['to', summary.period.to ?? ''],
      ['stays_count', summary.stays.count],
      ['completed_stays', summary.stays.completedCount],
      ['guest_collected', summary.stays.guestCollected],
      ['stay_revenue', summary.stays.stayRevenue],
      ['parking_margin', summary.stays.parkingMargin],
      ['sd_expenses', summary.stays.sdExpenses],
      ['host_net_completed', summary.stays.hostNetCompleted],
      ['projected_net_pipeline', summary.stays.projectedNetPipeline],
      ['outstanding_guest_balance', summary.stays.outstandingGuestBalance],
      ['operating_income', summary.operating.income],
      ['operating_expenses', summary.operating.expenses],
      ['operating_net', summary.operating.net],
      ['grand_net', summary.grandNet],
    ];
    return {
      filename: `finance-overview-${periodLabel}.csv`,
      body: rowsToCsv(headers, rows),
    };
  }

  if (params.type === 'operating') {
    const items = await listOperatingLineItems({ from: params.from, to: params.to });
    return {
      filename: `finance-operating-${periodLabel}.csv`,
      body: operatingItemsToCsv(items),
    };
  }

  if (params.type === 'stays') {
    const body = await staysExportCsv(params);
    return { filename: `finance-stays-${periodLabel}.csv`, body };
  }

  // combined
  const summary = await computeFinanceSummary(params);
  const staysBody = await staysExportCsv(params);
  const operatingItems = await listOperatingLineItems({
    from: params.from,
    to: params.to,
  });
  const operatingBody = operatingItemsToCsv(operatingItems);
  const body = [
    '# Overview',
    rowsToCsv(
      ['metric', 'value'],
      [
        ['grand_net', summary.grandNet],
        ['host_net_completed', summary.stays.hostNetCompleted],
        ['operating_net', summary.operating.net],
      ],
    ),
    '',
    '# Stays',
    staysBody,
    '',
    '# Operating',
    operatingBody,
  ].join('\r\n');
  return { filename: `finance-combined-${periodLabel}.csv`, body };
}

function operatingItemsToCsv(items: FinanceLineItemRow[]): string {
  const headers = [
    'id',
    'kind',
    'label',
    'amount',
    'category',
    'occurred_on',
    'notes',
    'created_by',
  ];
  const rows = items.map((i) => [
    i.id,
    i.kind,
    i.label,
    i.amount,
    i.category ?? '',
    i.occurred_on,
    i.notes ?? '',
    i.created_by ?? '',
  ]);
  return rowsToCsv(headers, rows);
}

async function staysExportCsv(params: FinanceExportParams): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { data } = await supabase.from('guest_submissions').select('*');
  const all = (data ?? []) as Record<string, unknown>[];
  const filtered = all.filter((row) => {
    if (!params.includeCancelled && isCancelledBooking(row)) return false;
    if (params.completedOnly && row.status !== 'COMPLETED') return false;
    if (!passesFinancePeriodFilter(row, params.from, params.to, params.basis)) {
      return false;
    }
    const needle = params.q?.trim().toLowerCase() ?? '';
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

  const headers = [
    'booking_id',
    'guest',
    'check_in',
    'check_out',
    'status',
    'total_guest_balance',
    'guest_collected',
    'guest_unpaid',
    'parking_margin',
    'host_net',
    'projected_net',
  ];
  const rows = filtered.map((row) => {
    const fin = computeBookingFinancials(row);
    return [
      String(row.id),
      String(row.guest_facebook_name ?? row.primary_guest_name ?? ''),
      String(row.check_in_date ?? ''),
      String(row.check_out_date ?? ''),
      String(row.status ?? ''),
      fin.totalGuestBalance ?? '',
      fin.guestCollected,
      fin.guestUnpaid ?? '',
      fin.parkingMargin ?? '',
      fin.isCompleted ? fin.hostNet : '',
      fin.projectedNet ?? '',
    ];
  });
  return rowsToCsv(headers, rows);
}
