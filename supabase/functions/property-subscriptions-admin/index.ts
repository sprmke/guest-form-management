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
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

serveSuperAdmin('property-subscriptions-admin', async (req, admin) => {
  const supabase = createServiceClient();
  const url = new URL(req.url);
  const propertyIdParam = url.searchParams.get('propertyId')?.trim() || null;

  if (req.method === 'GET') {
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

    const search = url.searchParams.get('search')?.trim().toLowerCase() || '';
    const planCode = url.searchParams.get('planCode')?.trim() || '';
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 100), 1), 500);

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
        property_subscriptions (
          id,
          plan_id,
          pricing_model,
          status,
          price_php_snapshot,
          commission_rate_percent_snapshot,
          updated_at,
          pricing_plans ( code, name )
        )
      `
      )
      .order('name', { ascending: true })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return jsonError(req, error.message, 500);

    const rows = (data ?? [])
      .map((row) => {
        const org = (row as Record<string, unknown>).organizations as Record<string, unknown>;
        const subs = ((row as Record<string, unknown>).property_subscriptions ?? []) as Record<
          string,
          unknown
        >[];
        const live = subs.find((s) =>
          ['active', 'trialing', 'past_due', 'suspended'].includes(String(s.status ?? ''))
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
      })
      .filter((row) => !planCode || row.subscription?.planCode === planCode);

    return jsonSuccess(req, { properties: rows });
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
