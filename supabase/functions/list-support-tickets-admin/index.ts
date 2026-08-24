/**
 * list-support-tickets-admin — GET all tickets across orgs (super admin), with
 * optional search/category/status/org filters, paginated server-side.
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 3.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { postgrestOrIlikeValue } from '../_shared/publicSearch.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

serveSuperAdmin('list-support-tickets-admin', async (req) => {
  requireHttpMethod(req, 'GET');
  const url = new URL(req.url);
  const p = url.searchParams;
  const search = p.get('search')?.trim() || null;
  const category = p.get('category');
  const status = p.get('status');
  const orgId = p.get('org_id');
  const page = Math.max(1, parseInt(p.get('page') ?? '1', 10));
  const limit = Math.min(500, Math.max(1, parseInt(p.get('limit') ?? '31', 10)));

  const sb = createServiceClient();
  let query = sb
    .from('support_tickets')
    .select('*, organizations!inner(id, name, slug)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category', category);
  if (status) query = query.eq('status', status);
  if (orgId) query = query.eq('organization_id', orgId);

  if (search) {
    const pattern = postgrestOrIlikeValue(search);
    const orParts = [
      `subject.ilike.${pattern}`,
      `submitted_by_name.ilike.${pattern}`,
      `submitted_by_email.ilike.${pattern}`,
    ];

    // organizationName is a joined column — PostgREST .or() can't filter it inline
    // alongside root-table columns, so resolve matching org ids first and fold them
    // into the same OR via organization_id.in.(...).
    const { data: orgMatches, error: orgError } = await sb
      .from('organizations')
      .select('id')
      .ilike('name', `%${search}%`);
    if (orgError) throw new Error(orgError.message);
    const orgIds = (orgMatches ?? []).map((row) => row.id as string);
    if (orgIds.length > 0) {
      orParts.push(`organization_id.in.(${orgIds.join(',')})`);
    }

    query = query.or(orParts.join(','));
  }

  const fromIdx = (page - 1) * limit;
  const toIdx = fromIdx + limit - 1;

  const { data, error, count } = await query.range(fromIdx, toIdx);
  if (error) throw new Error(error.message);

  const tickets = (data ?? []).map((row) => {
    const { organizations, ...ticket } = row as typeof row & {
      organizations: { id: string; name: string; slug: string };
    };
    return {
      ...ticket,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    };
  });

  return jsonSuccess(req, { tickets, total: count ?? 0, page, limit });
});
