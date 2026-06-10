/**
 * Finance period helpers — Manila timezone presets and URL query sync.
 */

import type { FinancePeriodBasis, FinanceQuery, FinanceTab } from '@/features/finance/lib/types';
import { DEFAULT_FINANCE_QUERY } from '@/features/finance/lib/types';
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  normalizeAdminPageLimit,
} from '@/lib/pagination';

export function manilaTodayIso(): string {
  const { y, m, d } = manilaDateParts();
  return isoFromParts(y, m, d);
}

function manilaDateParts(): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')?.value ?? '2026');
  const m = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const d = Number(parts.find((p) => p.type === 'day')?.value ?? '1');
  return { y, m, d };
}

function isoFromParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export type FinanceRangePreset = 'this_month' | 'last_month' | 'ytd' | 'all';

export function rangeForPreset(preset: FinanceRangePreset): {
  from: string | null;
  to: string | null;
} {
  const { y, m, d } = manilaDateParts();
  if (preset === 'all') return { from: null, to: null };
  if (preset === 'this_month') {
    return {
      from: isoFromParts(y, m, 1),
      to: isoFromParts(y, m, d),
    };
  }
  if (preset === 'last_month') {
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const lastDay = new Date(prevY, prevM, 0).getDate();
    return {
      from: isoFromParts(prevY, prevM, 1),
      to: isoFromParts(prevY, prevM, lastDay),
    };
  }
  // ytd
  return { from: isoFromParts(y, 1, 1), to: isoFromParts(y, m, d) };
}

export function detectPreset(
  from: string | null,
  to: string | null,
): FinanceRangePreset | 'custom' {
  for (const preset of ['this_month', 'last_month', 'ytd', 'all'] as const) {
    const r = rangeForPreset(preset);
    if (r.from === from && r.to === to) return preset;
  }
  return 'custom';
}

export function parseFinanceQueryFromParams(
  params: URLSearchParams,
): FinanceQuery {
  const tabRaw = params.get('tab');
  const tab: FinanceTab =
    tabRaw === 'stays' || tabRaw === 'operating' || tabRaw === 'settings'
      ? tabRaw
      : 'overview';
  const basisRaw = params.get('basis');
  const basis: FinancePeriodBasis =
    basisRaw === 'check_in' || basisRaw === 'check_out' ? basisRaw : 'completed';
  const sortRaw = params.get('sort');
  const sort =
    sortRaw === 'check_in_date:asc' ||
    sortRaw === 'host_net:desc' ||
    sortRaw === 'host_net:asc'
      ? sortRaw
      : DEFAULT_FINANCE_QUERY.sort;
  const staysView =
    params.get('view') === 'card' ? 'card' : DEFAULT_FINANCE_QUERY.staysView;

  return {
    tab,
    basis,
    from: params.get('from'),
    to: params.get('to'),
    includeCancelled: params.get('include_cancelled') === 'true',
    completedOnly: params.get('completed_only') === 'true',
    q: params.get('q') ?? '',
    page: Math.max(1, parseInt(params.get('page') ?? '1', 10)),
    limit: normalizeAdminPageLimit(
      parseInt(params.get('limit') ?? String(ADMIN_DEFAULT_PAGE_SIZE), 10),
    ),
    sort,
    staysView,
  };
}

export function writeFinanceQueryToParams(
  query: FinanceQuery,
  preset?: FinanceRangePreset,
): URLSearchParams {
  const p = new URLSearchParams();
  if (query.tab !== 'overview') p.set('tab', query.tab);
  if (query.basis !== 'completed') p.set('basis', query.basis);
  if (query.from) p.set('from', query.from);
  if (query.to) p.set('to', query.to);
  if (query.includeCancelled) p.set('include_cancelled', 'true');
  if (query.completedOnly) p.set('completed_only', 'true');
  if (query.q.trim()) p.set('q', query.q.trim());
  if (query.page > 1) p.set('page', String(query.page));
  if (query.limit !== ADMIN_DEFAULT_PAGE_SIZE) {
    p.set('limit', String(query.limit));
  }
  if (query.sort !== DEFAULT_FINANCE_QUERY.sort) p.set('sort', query.sort);
  if (query.tab === 'stays' && query.staysView === 'card') {
    p.set('view', 'card');
  }
  if (preset && preset !== 'this_month') p.set('preset', preset);
  return p;
}

export function financeQueryToApiParams(query: FinanceQuery): URLSearchParams {
  const p = new URLSearchParams();
  p.set('basis', query.basis);
  if (query.from) p.set('from', query.from);
  if (query.to) p.set('to', query.to);
  if (query.includeCancelled) p.set('include_cancelled', 'true');
  if (query.completedOnly) p.set('completed_only', 'true');
  if (query.q.trim()) p.set('q', query.q.trim());
  return p;
}
