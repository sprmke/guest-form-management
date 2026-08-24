/**
 * list-help-center-faqs-admin — GET all FAQ items, published or not (super admin editor).
 * Docs: docs/workflow/in-progress/help-support-center.md, Module 4.
 */

import { createServiceClient } from '../_shared/orgAuth.ts';
import { jsonSuccess, requireHttpMethod } from '../_shared/httpResponse.ts';
import { serveSuperAdmin } from '../_shared/serveEdge.ts';

serveSuperAdmin('list-help-center-faqs-admin', async (req) => {
  requireHttpMethod(req, 'GET');

  const url = new URL(req.url);
  const p = url.searchParams;
  const page = Math.max(1, parseInt(p.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(p.get('limit') ?? '31', 10)));

  const supabase = createServiceClient();
  const fromIdx = (page - 1) * limit;
  const toIdx = fromIdx + limit - 1;

  const { data, error, count } = await supabase
    .from('help_center_faqs')
    .select('*', { count: 'exact' })
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .range(fromIdx, toIdx);

  if (error) throw new Error(error.message);

  return jsonSuccess(req, { faqs: data ?? [], total: count ?? 0, page, limit });
});
