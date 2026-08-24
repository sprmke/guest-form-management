/**
 * property-subscriptions-admin — Super-admin list/search property plan assignments + manual assign/override.
 */

import {
  assignPropertyToPlan,
  getActivePropertySubscription,
} from '../_shared/planEntitlements.ts';
import { createServiceClient } from '../_shared/orgAuth.ts';
import {
  adminExtendPropertySubscription,
  runPlatformBillingCycle,
} from '../_shared/subscriptionOrchestrator.ts';
import {
  jsonError,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from '../_shared/httpResponse.ts';
import { postgrestOrIlikeValue } from '../_shared/publicSearch.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

// Statuses that count as a property's current ("live") subscription — mirrors
// the partial unique index (property_subscriptions_one_live_per_property_idx)
// plus 'suspended', which can still be the most-recent active assignment.
const LIVE_PROPERTY_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'suspended'];

serveSuperAdmin('property-subscriptions-admin', async (req, admin) => {
  const supabase = createServiceClient();
  const url = new URL(req.url);
  const propertyIdParam = url.searchParams.get('propertyId')?.trim() || null;
  const summaryRequested = url.searchParams.get('summary') === 'true';

  if (req.method === 'GET') {
    if (summaryRequested) {
      const [totalRes, assignedRes, activeRes, orgsRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase
          .from('properties')
          .select('id, property_subscriptions!inner(id)', { count: 'exact', head: true })
          .in('property_subscriptions.status', LIVE_PROPERTY_SUBSCRIPTION_STATUSES),
        supabase
          .from('property_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('organizations')
          .select('id, properties!inner(id)', { count: 'exact', head: true }),
      ]);

      const queryError =
        totalRes.error ?? assignedRes.error ?? activeRes.error ?? orgsRes.error ?? null;
      if (queryError) return jsonError(req, queryError.message, 500);

      const total = totalRes.count ?? 0;
      const assigned = assignedRes.count ?? 0;

      return jsonSuccess(req, {
        summary: {
          total,
          assigned,
          unassigned: total - assigned,
          activeSubscriptions: activeRes.count ?? 0,
          organizations: orgsRes.count ?? 0,
        },
      });
    }

    if (propertyIdParam) {
      const subscription = await getActivePropertySubscription(propertyIdParam);
      const events = subscription
        ? await supabase
            .from('property_subscription_events')
            .select('*')
            .eq('property_subscription_id', subscription.id)
            .order('created_at', { ascending: false })
            .limit(20)
        : { data: [] };

      const { data: transactions } = await supabase
        .from('property_payment_transactions')
        .select('id, amount, currency, status, created_at, paid_at, checkout_url')
        .eq('property_id', propertyIdParam)
        .order('created_at', { ascending: false })
        .limit(20);

      return jsonSuccess(req, {
        subscription,
        recentEvents: events.data ?? [],
        transactions: transactions ?? [],
      });
    }

    const search = url.searchParams.get('search')?.trim() || '';
    const planCode = url.searchParams.get('planCode')?.trim() || '';
    const hasPlanCodeFilter = Boolean(planCode) && planCode !== 'all';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '31', 10)));
    const fromIdx = (page - 1) * limit;
    const toIdx = fromIdx + limit - 1;

    // planCode filters on the property's *live* subscription's plan code, which
    // lives two joins deep (property_subscriptions -> pricing_plans). PostgREST
    // only lets us filter an embedded resource with `!inner`, so the join shape
    // — and therefore which subscriptions/plans are embedded per row — differs
    // depending on whether a plan filter is active.
    const subscriptionsSelect = hasPlanCodeFilter
      ? `property_subscriptions!inner (
          id,
          plan_id,
          pricing_model,
          status,
          price_php_snapshot,
          commission_rate_percent_snapshot,
          updated_at,
          pricing_plans!inner ( code, name )
        )`
      : `property_subscriptions (
          id,
          plan_id,
          pricing_model,
          status,
          price_php_snapshot,
          commission_rate_percent_snapshot,
          updated_at,
          pricing_plans ( code, name )
        )`;

    let query = supabase
      .from('properties')
      .select(
        `
        id,
        name,
        slug,
        status,
        organization_id,
        organizations!inner ( id, name, slug ),
        ${subscriptionsSelect}
      `,
        { count: 'exact' }
      )
      .order('name', { ascending: true });

    if (search) {
      const pattern = postgrestOrIlikeValue(search);
      query = query.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
    }

    if (hasPlanCodeFilter) {
      query = query
        .in('property_subscriptions.status', LIVE_PROPERTY_SUBSCRIPTION_STATUSES)
        .eq('property_subscriptions.pricing_plans.code', planCode);
    }

    const { data, error, count } = await query.range(fromIdx, toIdx);
    if (error) return jsonError(req, error.message, 500);

    const rows = (data ?? []).map((row) => {
      const org = (row as Record<string, unknown>).organizations as Record<string, unknown>;
      const subs = ((row as Record<string, unknown>).property_subscriptions ?? []) as Record<
        string,
        unknown
      >[];
      const live = subs.find((s) =>
        LIVE_PROPERTY_SUBSCRIPTION_STATUSES.includes(String(s.status ?? ''))
      );
      const planJoin = live?.pricing_plans as Record<string, unknown> | undefined;

      return {
        propertyId: row.id as string,
        propertyName: row.name as string,
        propertySlug: row.slug as string,
        propertyStatus: row.status as string,
        organizationId: org.id as string,
        organizationName: org.name as string,
        organizationSlug: org.slug as string,
        subscription: live
          ? {
              id: live.id as string,
              planId: live.plan_id as string,
              planCode: (planJoin?.code as string | undefined) ?? null,
              planName: (planJoin?.name as string | undefined) ?? null,
              pricingModel: live.pricing_model as string,
              status: live.status as string,
              pricePhpSnapshot:
                live.price_php_snapshot == null ? null : Number(live.price_php_snapshot),
              commissionRatePercentSnapshot:
                live.commission_rate_percent_snapshot == null
                  ? null
                  : Number(live.commission_rate_percent_snapshot),
              updatedAt: live.updated_at as string,
            }
          : null,
      };
    });

    return jsonSuccess(req, { properties: rows, total: count ?? 0, page, limit });
  }

  if (req.method === 'POST') {
    requireHttpMethod(req, 'POST');
    const body = await readJsonBody(req);

    const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
    const planId = typeof body.planId === 'string' ? body.planId.trim() : '';
    if (!propertyId || !planId) {
      return jsonError(req, 'propertyId and planId are required');
    }

    const featureOverrides =
      body.featureOverrides && typeof body.featureOverrides === 'object'
        ? (body.featureOverrides as Record<string, unknown>)
        : undefined;

    const note = typeof body.note === 'string' ? body.note.trim() || null : null;

    const subscription = await assignPropertyToPlan(propertyId, planId, admin.id, {
      featureOverrides,
      note,
    });

    const events = await supabase
      .from('property_subscription_events')
      .select('*')
      .eq('property_subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return jsonSuccess(req, {
      subscription,
      recentEvents: events.data ?? [],
    });
  }

  if (req.method === 'PATCH') {
    requireHttpMethod(req, 'PATCH');
    const body = await readJsonBody(req);
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    if (action === 'run_billing_cron') {
      const result = await runPlatformBillingCycle();
      return jsonSuccess(req, { result });
    }

    const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
    if (!propertyId) return jsonError(req, 'propertyId is required');

    if (action === 'extend_period') {
      const periodEnd =
        typeof body.periodEnd === 'string'
          ? body.periodEnd.trim()
          : typeof body.periodEndIso === 'string'
            ? body.periodEndIso.trim()
            : '';
      if (!periodEnd) return jsonError(req, 'periodEnd is required');

      const status =
        body.status === 'active' ||
        body.status === 'past_due' ||
        body.status === 'suspended' ||
        body.status === 'canceled'
          ? body.status
          : 'active';

      await adminExtendPropertySubscription({
        propertyId,
        periodEndIso: periodEnd,
        status,
        note: typeof body.note === 'string' ? body.note.trim() || null : null,
        adminUserId: admin.id,
      });

      const subscription = await getActivePropertySubscription(propertyId);
      return jsonSuccess(req, { subscription });
    }

    return jsonError(req, 'Unknown action', 400);
  }

  return jsonError(req, 'Method not allowed', 405);
});
