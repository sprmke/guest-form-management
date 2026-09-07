/**
 * list-activity-log — GET the org activity / audit timeline for the dashboard
 * Activity routes and the reusable <EntityActivityHistory> panel.
 *
 * Auth: serveAuthenticated → verifyOrgAccess (any org access). Owner / org admin /
 * platform admin see every row; a listing-scoped member sees only rows for their
 * assigned properties / parkings and never `scope = 'org'` rows.
 *
 * Query: ?orgId= | ?orgSlug=  (required)
 *   &scope=org|property|parking  &propertyId=  &parkingId=
 *   &category=booking,team,...   &actorUserId=  &action=  &severity=
 *   &targetType=  &targetId=     &q=  &dateFrom=ISO  &dateTo=ISO
 *   &cursorTs=ISO  &cursorId=uuid   &limit=1..100 (default 50)
 *
 * Keyset pagination on (created_at DESC, id DESC) — never OFFSET.
 */

import {
  createServiceClient,
  resolveAssignedListingIdsForOrgUser,
  verifyOrgAccess,
} from '../_shared/orgAuth.ts';
import { jsonError, jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { postgrestOrIlikeValue } from '../_shared/publicSearch.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const DEFAULT_WINDOW_DAYS = 90;

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serveAuthenticated('list-activity-log', async (req) => {
  requireHttpMethod(req, 'GET');

  const url = new URL(req.url);
  const p = url.searchParams;
  const orgId = p.get('orgId')?.trim() ?? '';
  const orgSlug = p.get('orgSlug')?.trim() ?? '';
  if (!orgId && !orgSlug) return jsonError(req, 'orgId or orgSlug is required');

  const { user, org, accessKind } = await verifyOrgAccess(req, {
    orgId: orgId || undefined,
    orgSlug: orgSlug || undefined,
  });

  const isAdminView =
    accessKind === 'owner' || accessKind === 'platform_admin' || accessKind === 'org_admin';

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(p.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );

  const supabase = createServiceClient();
  let query = supabase
    .from('activity_log')
    .select(
      'id,created_at,organization_id,property_id,parking_id,scope,actor_type,actor_user_id,' +
        'actor_email,actor_display_name,actor_role,actor_member_id,action,category,severity,' +
        'target_type,target_id,target_label,summary,changes,metadata,ip_prefix,user_agent,source,request_id'
    )
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  // ── Listing-scoped visibility ─────────────────────────────────────────────
  if (!isAdminView) {
    const assigned = await resolveAssignedListingIdsForOrgUser(user.id, org.id);
    if (assigned.propertyIds.length === 0 && assigned.parkingIds.length === 0) {
      return jsonSuccess(req, { events: [], nextCursor: null });
    }
    const clauses: string[] = [];
    if (assigned.propertyIds.length > 0) {
      clauses.push(`property_id.in.(${assigned.propertyIds.join(',')})`);
    }
    if (assigned.parkingIds.length > 0) {
      clauses.push(`parking_id.in.(${assigned.parkingIds.join(',')})`);
    }
    query = query.neq('scope', 'org').or(clauses.join(','));
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  const scope = p.get('scope')?.trim();
  if (scope && ['org', 'property', 'parking'].includes(scope)) {
    query = query.eq('scope', scope);
  }

  const propertyId = p.get('propertyId')?.trim();
  if (propertyId && UUID_RE.test(propertyId)) query = query.eq('property_id', propertyId);

  const parkingId = p.get('parkingId')?.trim();
  if (parkingId && UUID_RE.test(parkingId)) query = query.eq('parking_id', parkingId);

  const categories = (p.get('category') ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (categories.length === 1) query = query.eq('category', categories[0]);
  else if (categories.length > 1) query = query.in('category', categories);

  const actorUserId = p.get('actorUserId')?.trim();
  if (actorUserId && UUID_RE.test(actorUserId)) query = query.eq('actor_user_id', actorUserId);

  const action = p.get('action')?.trim();
  if (action) query = query.eq('action', action);

  const severity = p.get('severity')?.trim();
  if (severity && ['info', 'notice', 'warning', 'destructive'].includes(severity)) {
    query = query.eq('severity', severity);
  }

  const targetType = p.get('targetType')?.trim();
  if (targetType) query = query.eq('target_type', targetType);

  const targetId = p.get('targetId')?.trim();
  if (targetId) query = query.eq('target_id', targetId);

  // ── Date window ──────────────────────────────────────────────────────────
  const dateFrom = p.get('dateFrom')?.trim();
  const dateTo = p.get('dateTo')?.trim();
  if (dateFrom && ISO_RE.test(dateFrom)) {
    query = query.gte('created_at', dateFrom);
  } else if (!dateFrom) {
    const since = new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    query = query.gte('created_at', since.toISOString());
  }
  if (dateTo && ISO_RE.test(dateTo)) query = query.lte('created_at', dateTo);

  // ── Text search ──────────────────────────────────────────────────────────
  const search = p.get('q')?.trim();
  if (search) {
    const pattern = postgrestOrIlikeValue(search);
    query = query.or(`summary.ilike.${pattern},target_label.ilike.${pattern}`);
  }

  // ── Keyset cursor ────────────────────────────────────────────────────────
  const cursorTs = p.get('cursorTs')?.trim();
  const cursorId = p.get('cursorId')?.trim();
  if (cursorTs && cursorId && ISO_RE.test(cursorTs) && UUID_RE.test(cursorId)) {
    query = query.or(`created_at.lt.${cursorTs},and(created_at.eq.${cursorTs},id.lt.${cursorId})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[list-activity-log]', error.message);
    return jsonError(req, 'Failed to load activity', 500);
  }

  // supabase-js can't type-parse the keyset `.or(and(...))`, so `data` widens to
  // an error shape — the query itself is valid; cast to a loose row array.
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return jsonSuccess(req, {
    events: page.map((row) => ({
      id: row.id as string,
      createdAt: row.created_at as string,
      organizationId: row.organization_id as string,
      propertyId: (row.property_id as string | null) ?? null,
      parkingId: (row.parking_id as string | null) ?? null,
      scope: row.scope as string,
      actorType: row.actor_type as string,
      actorUserId: (row.actor_user_id as string | null) ?? null,
      actorEmail: (row.actor_email as string | null) ?? null,
      actorDisplayName: (row.actor_display_name as string | null) ?? null,
      actorRole: (row.actor_role as string | null) ?? null,
      actorMemberId: (row.actor_member_id as string | null) ?? null,
      action: row.action as string,
      category: row.category as string,
      severity: row.severity as string,
      targetType: (row.target_type as string | null) ?? null,
      targetId: (row.target_id as string | null) ?? null,
      targetLabel: (row.target_label as string | null) ?? null,
      summary: row.summary as string,
      changes: (row.changes as unknown) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      ipPrefix: (row.ip_prefix as string | null) ?? null,
      userAgent: (row.user_agent as string | null) ?? null,
      source: row.source as string,
      requestId: (row.request_id as string | null) ?? null,
    })),
    nextCursor: hasMore && last ? { ts: last.created_at as string, id: last.id as string } : null,
  });
});
