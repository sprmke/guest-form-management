/**
 * list-support-tickets — GET the caller's own submitted tickets ("My Tickets"),
 * scoped to org/property/parking (whichever the current admin route resolves).
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 3.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';
import { resolveSupportTicketScope } from '../_shared/supportTicketScope.ts';

serveAuthenticated('list-support-tickets', async (req) => {
  requireHttpMethod(req, 'GET');
  const url = new URL(req.url);

  const scope = await resolveSupportTicketScope(req, {
    orgSlug: url.searchParams.get('org_slug'),
    orgId: url.searchParams.get('org_id'),
    propertyId: url.searchParams.get('property_id'),
    parkingId: url.searchParams.get('parking_id'),
  });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from('support_tickets')
    .select('*')
    .eq('organization_id', scope.org.id)
    .eq('submitted_by_user_id', scope.user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return jsonSuccess(req, { tickets: data ?? [] });
});
