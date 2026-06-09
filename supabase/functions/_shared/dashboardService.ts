/**
 * Admin dashboard aggregates — pipeline counts, attention items, trends.
 * Keep response shape in sync with `ui/src/features/dashboard/lib/types.ts`.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { computeBookingFinancials } from './bookingFinance.ts';
import {
  checkInDateToIso,
  manilaTodayIso,
} from './bookingsListSort.ts';

export type DashboardAttentionSeverity = 'critical' | 'warning' | 'info';

export type DashboardAttentionItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  severity: DashboardAttentionSeverity;
};

export type DashboardPipelineSlice = {
  status: string;
  count: number;
};

export type DashboardTrendPoint = {
  month: string;
  label: string;
  net: number;
  stays: number;
};

export type DashboardCheckInPoint = {
  month: string;
  label: string;
  checkIns: number;
  nights: number;
};

export type DashboardTrendWindow = {
  from: string;
  to: string;
  label: string;
  granularity: 'day' | 'week' | 'month';
};

export type DashboardUpcomingStay = {
  id: string;
  guestName: string;
  checkInIso: string;
  checkOutIso: string;
  status: string;
  nights: number;
  pax: number;
  needParking: boolean;
  hasPets: boolean;
  guestRequestsSurpriseDecor: boolean;
};

export type DashboardStats = {
  manilaDate: string;
  attention: DashboardAttentionItem[];
  pipeline: DashboardPipelineSlice[];
  revenueTrend: DashboardTrendPoint[];
  checkInTrend: DashboardCheckInPoint[];
  trendWindow: DashboardTrendWindow;
  upcoming: DashboardUpcomingStay[];
  finance: {
    monthNet: number;
    monthStays: number;
    outstandingBalance: number;
    pipelineEstimate: number;
  };
  totals: {
    activeBookings: number;
    totalBookings: number;
    periodDays: number;
    checkInsToday: number;
    checkOutsToday: number;
  };
};

export type DashboardStatsParams = {
  /** Inclusive chart range (YYYY-MM-DD, Asia/Manila calendar days). */
  from?: string | null;
  to?: string | null;
};

const CANCELLED = new Set(['CANCELLED', 'canceled']);

const PIPELINE_STATUSES = [
  'PENDING_REVIEW',
  'PENDING_DOCUMENTS',
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
  'READY_FOR_CHECKOUT',
  'PENDING_SD_REFUND',
] as const;

const DOCUMENTS_STATUSES = new Set([
  'PENDING_DOCUMENTS',
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
]);

type TrendGranularity = 'day' | 'week' | 'month';

type TrendBucket = { key: string; label: string };

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

function daysInclusive(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

function startOfWeekIso(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function pickGranularity(from: string, to: string): TrendGranularity {
  const days = daysInclusive(from, to);
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

function bucketKeyForDate(iso: string, granularity: TrendGranularity): string {
  if (granularity === 'day') return iso;
  if (granularity === 'week') return startOfWeekIso(iso);
  return monthKeyFromIso(iso);
}

function bucketLabel(key: string, granularity: TrendGranularity): string {
  if (granularity === 'month') return monthLabelFromKey(key);
  const d = new Date(`${key}T12:00:00`);
  if (granularity === 'day') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    }).format(d);
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(d);
}

function defaultTrendRange(today: string): { from: string; to: string } {
  const [y, m] = today.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function trendRangeLabel(from: string, to: string): string {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  const fmt = (d: Date, withYear: boolean) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: withYear ? 'numeric' : undefined,
      year: withYear ? 'numeric' : undefined,
      timeZone: 'Asia/Manila',
    }).format(d);
  if (from === to) return fmt(end, true);
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${fmt(start, !sameYear)} – ${fmt(end, true)}`;
}

function enumerateTrendBuckets(
  from: string,
  to: string,
  granularity: TrendGranularity,
): TrendBucket[] {
  const buckets: TrendBucket[] = [];
  const seen = new Set<string>();
  let cursor = from;
  while (cursor <= to) {
    const key = bucketKeyForDate(cursor, granularity);
    if (!seen.has(key)) {
      seen.add(key);
      buckets.push({ key, label: bucketLabel(key, granularity) });
    }
    cursor = addDaysIso(cursor, 1);
  }
  return buckets;
}

function monthLabelFromKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(new Date(y, m - 1, 1));
}

function guestDisplayName(row: Record<string, unknown>): string {
  const fb = String(row.guest_facebook_name ?? '').trim();
  const primary = String(row.primary_guest_name ?? '').trim();
  return fb || primary || 'Guest';
}

function flagTrue(v: unknown): boolean {
  return v === true || v === 'true';
}

function bookingsLink(params: Record<string, string>): string {
  const sp = new URLSearchParams(params);
  return `/bookings?${sp.toString()}`;
}

export async function computeDashboardStats(
  params: DashboardStatsParams = {},
): Promise<DashboardStats> {
  const today = manilaTodayIso();
  const fallback = defaultTrendRange(today);
  const trendFrom = params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)
    ? params.from
    : fallback.from;
  const trendTo = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to)
    ? params.to
    : fallback.to;
  const from = trendFrom <= trendTo ? trendFrom : trendTo;
  const to = trendFrom <= trendTo ? trendTo : trendFrom;
  const granularity = pickGranularity(from, to);
  const trendBuckets = enumerateTrendBuckets(from, to, granularity);
  const trendLabel = trendRangeLabel(from, to);

  const supabase = getSupabase();
  const { data, error } = await supabase.from('guest_submissions').select('*');
  if (error) {
    throw new Error(`dashboard bookings query failed: ${error.message}`);
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  const pipelineCounts = new Map<string, number>();
  for (const s of PIPELINE_STATUSES) pipelineCounts.set(s, 0);

  let activeBookings = 0;
  let totalBookings = 0;
  let checkInsToday = 0;
  let checkOutsToday = 0;
  let pendingReview = 0;
  let pendingDocuments = 0;
  let pendingSdRefund = 0;
  let unpaidBalanceCount = 0;
  let periodNet = 0;
  let periodCompletedStays = 0;
  let outstandingBalance = 0;
  let pipelineEstimate = 0;

  const todayInRange = today >= from && today <= to;

  const revenueByBucket = new Map<string, { net: number; stays: number }>();
  const checkInsByBucket = new Map<string, { checkIns: number; nights: number }>();
  for (const b of trendBuckets) {
    revenueByBucket.set(b.key, { net: 0, stays: 0 });
    checkInsByBucket.set(b.key, { checkIns: 0, nights: 0 });
  }

  const periodStays: DashboardUpcomingStay[] = [];

  for (const row of rows) {
    const status = String(row.status ?? '');
    if (CANCELLED.has(status)) continue;

    const checkInIso = checkInDateToIso(String(row.check_in_date ?? ''));
    const checkOutIso = checkInDateToIso(String(row.check_out_date ?? ''));
    if (!checkInIso) continue;

    const checkInInRange = checkInIso >= from && checkInIso <= to;
    const fin = computeBookingFinancials(row);

    if (checkInInRange) {
      totalBookings += 1;
      periodStays.push({
        id: String(row.id),
        guestName: guestDisplayName(row),
        checkInIso,
        checkOutIso,
        status,
        nights: Number(row.number_of_nights ?? 0) || 0,
        pax: Number(row.number_of_adults ?? 0) +
          (Number(row.number_of_children ?? 0) || 0),
        needParking: flagTrue(row.need_parking),
        hasPets: flagTrue(row.has_pets),
        guestRequestsSurpriseDecor: flagTrue(row.guest_requests_surprise_decor),
      });

      if (status !== 'COMPLETED') {
        activeBookings += 1;
        if (pipelineCounts.has(status)) {
          pipelineCounts.set(status, (pipelineCounts.get(status) ?? 0) + 1);
        }
        if (fin.projectedNet != null) {
          pipelineEstimate += fin.projectedNet;
        }
      }

      if (status === 'PENDING_REVIEW') pendingReview += 1;
      if (DOCUMENTS_STATUSES.has(status)) pendingDocuments += 1;
      if (status === 'PENDING_SD_REFUND') pendingSdRefund += 1;

      if (
        fin.guestUnpaid != null &&
        fin.guestUnpaid > 0 &&
        status !== 'COMPLETED'
      ) {
        unpaidBalanceCount += 1;
        outstandingBalance += fin.guestUnpaid;
      }
    }

    if (todayInRange && checkInIso === today) checkInsToday += 1;
    if (todayInRange && checkOutIso === today) checkOutsToday += 1;

    // Check-in volume within the selected range.
    if (checkInInRange) {
      const ciKey = bucketKeyForDate(checkInIso, granularity);
      if (checkInsByBucket.has(ciKey)) {
        const bucket = checkInsByBucket.get(ciKey)!;
        bucket.checkIns += 1;
        bucket.nights += Number(row.number_of_nights ?? 0) || 0;
      }
    }

    // Completed revenue bucketed by check-in date — aligns with bookings list,
    // total bookings KPI, and check-in volume when filtering by period.
    if (status === 'COMPLETED' && checkInIso >= from && checkInIso <= to) {
      periodNet = roundMoney(periodNet + fin.hostNet);
      periodCompletedStays += 1;
      const revenueKey = bucketKeyForDate(checkInIso, granularity);
      if (revenueByBucket.has(revenueKey)) {
        const bucket = revenueByBucket.get(revenueKey)!;
        bucket.net = roundMoney(bucket.net + fin.hostNet);
        bucket.stays += 1;
      }
    }
  }

  periodStays.sort((a, b) => a.checkInIso.localeCompare(b.checkInIso));
  outstandingBalance = roundMoney(outstandingBalance);
  pipelineEstimate = roundMoney(pipelineEstimate);

  const attention: DashboardAttentionItem[] = [];
  const periodLink = { from, to };

  if (pendingReview > 0) {
    attention.push({
      id: 'pending-review',
      label: 'Pending review',
      count: pendingReview,
      href: bookingsLink({ status: 'PENDING_REVIEW', ...periodLink }),
      severity: 'critical',
    });
  }
  if (pendingDocuments > 0) {
    attention.push({
      id: 'pending-documents',
      label: 'Awaiting documents',
      count: pendingDocuments,
      href: bookingsLink({
        status: 'PENDING_DOCUMENTS,PENDING_GAF,PENDING_PARKING_REQUEST,PENDING_PET_REQUEST',
        ...periodLink,
      }),
      severity: 'warning',
    });
  }
  if (checkInsToday > 0) {
    attention.push({
      id: 'check-ins-today',
      label: 'Check-ins today',
      count: checkInsToday,
      href: bookingsLink({ from: today, to: today }),
      severity: 'critical',
    });
  }
  if (checkOutsToday > 0) {
    attention.push({
      id: 'check-outs-today',
      label: 'Check-outs today',
      count: checkOutsToday,
      href: bookingsLink({ from: today, to: today }),
      severity: 'warning',
    });
  }
  if (pendingSdRefund > 0) {
    attention.push({
      id: 'pending-sd-refund',
      label: 'SD refunds pending',
      count: pendingSdRefund,
      href: bookingsLink({ status: 'PENDING_SD_REFUND', ...periodLink }),
      severity: 'warning',
    });
  }
  if (unpaidBalanceCount > 0) {
    attention.push({
      id: 'unpaid-balance',
      label: 'Unpaid guest balance',
      count: unpaidBalanceCount,
      href: `/finance?tab=stays&from=${from}&to=${to}`,
      severity: 'info',
    });
  }

  const pipeline: DashboardPipelineSlice[] = PIPELINE_STATUSES.map((status) => ({
    status,
    count: pipelineCounts.get(status) ?? 0,
  }));

  const revenueTrend: DashboardTrendPoint[] = trendBuckets.map((b) => {
    const bucket = revenueByBucket.get(b.key)!;
    return {
      month: b.key,
      label: b.label,
      net: bucket.net,
      stays: bucket.stays,
    };
  });

  const checkInTrend: DashboardCheckInPoint[] = trendBuckets.map((b) => {
    const bucket = checkInsByBucket.get(b.key)!;
    return {
      month: b.key,
      label: b.label,
      checkIns: bucket.checkIns,
      nights: bucket.nights,
    };
  });

  const periodDays = daysInclusive(from, to);

  return {
    manilaDate: today,
    attention,
    pipeline,
    revenueTrend,
    checkInTrend,
    trendWindow: {
      from,
      to,
      label: trendLabel,
      granularity,
    },
    upcoming: periodStays,
    finance: {
      monthNet: periodNet,
      monthStays: periodCompletedStays,
      outstandingBalance,
      pipelineEstimate,
    },
    totals: {
      activeBookings,
      totalBookings,
      periodDays,
      checkInsToday,
      checkOutsToday,
    },
  };
}
