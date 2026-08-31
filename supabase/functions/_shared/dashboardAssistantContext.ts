/**
 * RBAC-scoped facts for the AI dashboard assistant.
 * Returns only the host/org metadata and recent aggregate metrics the assistant is allowed to reason about.
 */

import { createServiceClient } from './orgAuth.ts';
import { loadAuthUserProfile } from './authUserProfile.ts';
import {
  computeFinanceSummary,
  financeThisMonthRange,
  formatFinancePhp,
  toHostFacingFinanceKpis,
} from './financeService.ts';
import { computeMaintenanceSummary } from './maintenanceService.ts';
import { manilaTodayIso } from './bookingsListSort.ts';

export type DashboardAssistantContext = {
  org: { id: string; name: string; slug: string } | null;
  properties: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    type: string;
    maxGuests: number | null;
  }>;
  bookingsSummary: {
    pendingReview: number;
    pendingDocuments: number;
    readyForCheckin: number;
    readyForCheckout: number;
    completedToday: number;
    cancelledToday: number;
  };
  aiUsage: {
    callsToday: number;
    costTodayUsd: number;
    dailyCallLimit: number;
  };
  effectivePermissions: string[];
};

export async function buildDashboardAssistantContext(
  organizationId: string,
  userId: string,
  propertyId?: string | null
): Promise<DashboardAssistantContext> {
  const sb = createServiceClient();

  const { data: org, error: orgError } = await sb
    .from('organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .maybeSingle();
  if (orgError) {
    console.error('[dashboardAssistantContext] org load failed:', orgError.message);
  }

  const propertiesQuery = sb
    .from('properties')
    .select('id, name, slug, status, type, max_guests')
    .eq('organization_id', organizationId);
  if (propertyId) {
    propertiesQuery.eq('id', propertyId);
  }
  const { data: properties, error: propertiesError } = await propertiesQuery;
  if (propertiesError) {
    console.error('[dashboardAssistantContext] properties load failed:', propertiesError.message);
  }

  const propertyIds = (properties ?? []).map((p) => p.id);
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const bookingsQuery = sb
    .from('guest_submissions')
    .select('status, created_at', { count: 'exact', head: false })
    .in('status', [
      'PENDING_REVIEW',
      'PENDING_DOCUMENTS',
      'READY_FOR_CHECKIN',
      'READY_FOR_CHECKOUT',
      'COMPLETED',
      'CANCELLED',
    ]);
  if (propertyIds.length > 0) {
    bookingsQuery.in('property_id', propertyIds);
  } else {
    bookingsQuery.eq('property_id', '00000000-0000-0000-0000-000000000000');
  }
  const { data: bookingsSummary } = await bookingsQuery;

  const summary = {
    pendingReview: 0,
    pendingDocuments: 0,
    readyForCheckin: 0,
    readyForCheckout: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const row of bookingsSummary ?? []) {
    const status = row.status as string;
    if (status === 'PENDING_REVIEW') summary.pendingReview++;
    if (status === 'PENDING_DOCUMENTS') summary.pendingDocuments++;
    if (status === 'READY_FOR_CHECKIN') summary.readyForCheckin++;
    if (status === 'READY_FOR_CHECKOUT') summary.readyForCheckout++;
    if (status === 'COMPLETED') summary.completed++;
    if (status === 'CANCELLED') summary.cancelled++;
  }

  const { data: usageRow } = await sb
    .from('ai_platform_usage_daily')
    .select('call_count, cost_usd')
    .eq('organization_id', organizationId)
    .eq('date', todayStartIso.slice(0, 10))
    .maybeSingle();

  const { data: orgSettings } = await sb
    .from('ai_platform_org_settings')
    .select('daily_call_limit')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const { data: member } = await sb
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  const effectivePermissions =
    member?.role === 'owner' ? ['owner'] : [member?.role ? String(member.role) : 'member'];

  return {
    org: org ? { id: org.id, name: org.name, slug: org.slug } : null,
    properties: (properties ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      type: p.type,
      maxGuests: p.max_guests,
    })),
    bookingsSummary: summary,
    aiUsage: {
      callsToday: Number(usageRow?.call_count ?? 0),
      costTodayUsd: Number(usageRow?.cost_usd ?? 0),
      dailyCallLimit: Number(orgSettings?.daily_call_limit ?? 200),
    },
    effectivePermissions,
  };
}

export function contextToPrompt(context: DashboardAssistantContext): string {
  return `You are a helpful operations assistant for property hosts. Answer only from the facts below and the user's question. Do not invent data. Do not perform actions that modify data; suggest next steps instead.

Organization: ${context.org?.name ?? 'Unknown'} (${context.org?.slug ?? ''})
Properties: ${context.properties.map((p) => `${p.name} (${p.status}, ${p.type})`).join(', ') || 'none'}
Bookings: ${JSON.stringify(context.bookingsSummary)}
AI usage today: ${context.aiUsage.callsToday}/${context.aiUsage.dailyCallLimit} calls, $${context.aiUsage.costTodayUsd.toFixed(4)} estimated.
User permissions: ${context.effectivePermissions.join(', ')}.`;
}

// ─── Host-safe grounding facts (permission-scoped, dashboard-assistant-chat) ─

/**
 * The "host-safe" analogue of inboxAiGuestContext.ts's buildAiGroundingFacts — except section-
 * gated by the requesting admin's resolved `permissions[]` array (property or org RBAC ids)
 * instead of a fixed guest-safe field allowlist. No finance facts without `finance:view`, no
 * maintenance facts without `maintenance:view`, property facts only for accessible properties.
 * Docs: docs/workflow/planned/ai-dashboard-assistant.md §1 step 4 / §5.
 */
export type HostSafeGroundingFacts = {
  today: string;
  requester: { name: string };
  org: { id: string; name: string; slug: string } | null;
  properties: Array<{ id: string; name: string; slug: string; status: string; type: string }>;
  bookingsSummary: DashboardAssistantContext['bookingsSummary'];
  finance: {
    scope: 'property' | 'org';
    propertyCount: number;
    period: { from: string; to: string };
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    display: {
      totalIncome: string;
      totalExpenses: string;
      netProfit: string;
    };
  } | null;
  maintenance: { total: number; completed: number; pending: number } | null;
  permissions: string[];
};

const FINANCE_SUMMARY_PROPERTY_CAP = 5;

export async function buildHostSafeGroundingFacts(
  organizationId: string,
  userId: string,
  propertyId: string | null | undefined,
  permissions: string[]
): Promise<HostSafeGroundingFacts> {
  const sb = createServiceClient();
  const permissionSet = new Set(permissions);

  // Independent of each other — run concurrently rather than paying two sequential round trips
  // (an Auth-API call plus a DB query) on every single chat turn.
  const [requesterProfile, { data: org }] = await Promise.all([
    loadAuthUserProfile(sb, userId),
    sb.from('organizations').select('id, name, slug').eq('id', organizationId).maybeSingle(),
  ]);

  const propertiesQuery = sb
    .from('properties')
    .select('id, name, slug, status, type')
    .eq('organization_id', organizationId);
  if (propertyId) propertiesQuery.eq('id', propertyId);
  const { data: properties } = await propertiesQuery;
  const propertyIds = (properties ?? []).map((p) => p.id);

  const summary = {
    pendingReview: 0,
    pendingDocuments: 0,
    readyForCheckin: 0,
    readyForCheckout: 0,
    completedToday: 0,
    cancelledToday: 0,
  };
  if (propertyIds.length > 0) {
    const { data: bookingRows } = await sb
      .from('guest_submissions')
      .select('status')
      .in('property_id', propertyIds)
      .in('status', [
        'PENDING_REVIEW',
        'PENDING_DOCUMENTS',
        'READY_FOR_CHECKIN',
        'READY_FOR_CHECKOUT',
      ]);
    for (const row of bookingRows ?? []) {
      const status = row.status as string;
      if (status === 'PENDING_REVIEW') summary.pendingReview++;
      if (status === 'PENDING_DOCUMENTS') summary.pendingDocuments++;
      if (status === 'READY_FOR_CHECKIN') summary.readyForCheckin++;
      if (status === 'READY_FOR_CHECKOUT') summary.readyForCheckout++;
    }
  }

  let finance: HostSafeGroundingFacts['finance'] = null;
  if (
    permissionSet.has('finance:view') &&
    propertyIds.length > 0 &&
    propertyIds.length <= FINANCE_SUMMARY_PROPERTY_CAP
  ) {
    const month = financeThisMonthRange(manilaTodayIso());
    const totals = { totalIncome: 0, totalExpenses: 0, netProfit: 0 };
    for (const id of propertyIds) {
      // Same period/basis/filters as the Finance page default ("this month").
      const result = await computeFinanceSummary({
        propertyId: id,
        from: month.from,
        to: month.to,
        basis: 'check_in',
        includeCancelled: true,
        completedOnly: false,
      });
      const kpis = toHostFacingFinanceKpis(result);
      totals.totalIncome += kpis.totalIncome;
      totals.totalExpenses += kpis.totalExpenses;
      totals.netProfit += kpis.netProfit;
    }
    finance = {
      scope: propertyId ? 'property' : 'org',
      propertyCount: propertyIds.length,
      period: month,
      totalIncome: totals.totalIncome,
      totalExpenses: totals.totalExpenses,
      netProfit: totals.netProfit,
      display: {
        totalIncome: formatFinancePhp(totals.totalIncome),
        totalExpenses: formatFinancePhp(totals.totalExpenses),
        netProfit: formatFinancePhp(totals.netProfit),
      },
    };
  }

  let maintenance: HostSafeGroundingFacts['maintenance'] = null;
  if (
    permissionSet.has('maintenance:view') &&
    propertyIds.length > 0 &&
    propertyIds.length <= FINANCE_SUMMARY_PROPERTY_CAP
  ) {
    const today = manilaTodayIso();
    const monthStart = `${today.slice(0, 7)}-01`;
    const totals = { total: 0, completed: 0, pending: 0 };
    for (const id of propertyIds) {
      const result = await computeMaintenanceSummary({
        propertyId: id,
        from: monthStart,
        to: today,
      });
      totals.total += result.total;
      totals.completed += result.completed;
      totals.pending += result.pending;
    }
    maintenance = totals;
  }

  return {
    today: manilaTodayIso(),
    requester: { name: requesterProfile.name },
    org: org ? { id: org.id, name: org.name, slug: org.slug } : null,
    properties: (properties ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      type: p.type,
    })),
    bookingsSummary: summary,
    finance,
    maintenance,
    permissions,
  };
}

export function hostSafeGroundingFactsToPrompt(facts: HostSafeGroundingFacts): string {
  const lines = [
    `Today's date: ${facts.today} (Asia/Manila) — use this to resolve relative dates like "this weekend" or "next month".`,
    `You are talking to: ${facts.requester.name}.`,
    `Organization: ${facts.org?.name ?? 'Unknown'} (${facts.org?.slug ?? ''})`,
    `Properties: ${facts.properties.map((p) => `${p.name} (${p.status}, ${p.type})`).join(', ') || 'none'}`,
    `Bookings: ${JSON.stringify(facts.bookingsSummary)}`,
    `Permissions: ${facts.permissions.join(', ') || 'none'}`,
  ];
  if (facts.finance) {
    const scopeNote =
      facts.finance.scope === 'property'
        ? 'current property only'
        : `sum across ${facts.finance.propertyCount} properties`;
    lines.push(
      `Finance this calendar month (${facts.finance.period.from} → ${facts.finance.period.to}, ${scopeNote}; same Net Profit as the Finance page): income ${facts.finance.display.totalIncome}, expenses ${facts.finance.display.totalExpenses}, net profit ${facts.finance.display.netProfit}. For a fresh breakdown call get_finance_summary — use netProfit/display, never invent a "Grand Net" figure.`
    );
  } else {
    lines.push(
      'Finance: not available (no finance:view permission or too many properties for inline summary).'
    );
  }
  if (facts.maintenance) {
    lines.push(`Maintenance (month-to-date): ${JSON.stringify(facts.maintenance)}`);
  } else {
    lines.push(
      'Maintenance: not available (no maintenance:view permission or too many properties for inline summary).'
    );
  }
  return lines.join('\n');
}
