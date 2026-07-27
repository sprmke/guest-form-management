/**
 * finance-export — Admin CSV download for finance reports.
 * GET ?type=overview|stays|operating|transactions|combined&basis=&from=&to=...
 */

import { corsHeaders } from '../_shared/cors.ts';
import { buildFinanceExportCsv } from '../_shared/financeExport.ts';
import { financeDbScope, resolveFinanceAssetAccess } from '../_shared/financeAssetScope.ts';
import { parseFinanceExportType, parseFinanceListQueryParams } from '../_shared/financeHttp.ts';
import { jsonError } from '../_shared/httpResponse.ts';
import { serveAuthenticated } from '../_shared/serveEdge.ts';

serveAuthenticated('finance-export', async (req) => {
  if (req.method !== 'GET') {
    return jsonError(req, 'Method not allowed', 405);
  }

  const asset = await resolveFinanceAssetAccess(req, 'finance:view');
  const scope = financeDbScope(asset);
  const url = new URL(req.url);
  const p = url.searchParams;
  const query = parseFinanceListQueryParams(url);
  const { filename, body } = await buildFinanceExportCsv({
    ...scope,
    type: parseFinanceExportType(p.get('type')),
    from: query.from,
    to: query.to,
    basis: query.basis,
    includeCancelled: query.includeCancelled,
    completedOnly: query.completedOnly,
    q: query.q,
  });

  return new Response(body, {
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
