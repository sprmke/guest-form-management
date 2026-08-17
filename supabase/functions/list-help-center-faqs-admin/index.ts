/**
 * list-help-center-faqs-admin — GET all FAQ items, published or not (super admin editor).
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 4.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

serveSuperAdmin('list-help-center-faqs-admin', async (req) => {
  requireHttpMethod(req, 'GET');

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('help_center_faqs')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);

  return jsonSuccess(req, { faqs: data ?? [] });
});
