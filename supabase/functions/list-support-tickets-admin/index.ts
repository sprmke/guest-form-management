/**
 * list-support-tickets-admin — GET all tickets across orgs (super admin), with
 * optional category/status/org filters.
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 3.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

serveSuperAdmin('list-support-tickets-admin', async (req) => {
  requireHttpMethod(req, 'GET');
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const orgId = url.searchParams.get('org_id');

  const sb = createServiceClient();
  let query = sb
    .from('support_tickets')
    .select('*, organizations!inner(id, name, slug)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (category) query = query.eq('category', category);
  if (status) query = query.eq('status', status);
  if (orgId) query = query.eq('organization_id', orgId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const tickets = (data ?? []).map((row) => {
    const { organizations, ...ticket } = row as typeof row & {
      organizations: { id: string; name: string; slug: string };
    };
    return { ...ticket, organizationName: organizations.name, organizationSlug: organizations.slug };
  });

  return jsonSuccess(req, { tickets });
});
