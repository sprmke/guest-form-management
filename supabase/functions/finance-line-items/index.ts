/**
 * finance-line-items — Admin CRUD for property-wide operating expenses/income.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import {
  createFinanceLineItem,
  deleteFinanceLineItem,
  listOperatingLineItems,
  updateFinanceLineItem,
  type FinanceLineItemKind,
} from '../_shared/financeService.ts';

function isKind(v: unknown): v is FinanceLineItemKind {
  return v === 'expense' || v === 'income';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const { email } = await verifyAdminJwt(req);
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const items = await listOperatingLineItems({
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
      });
      return new Response(JSON.stringify({ success: true, data: items }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (!isKind(body.kind)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid kind' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      const label = typeof body.label === 'string' ? body.label.trim() : '';
      const amount = Number(body.amount);
      const occurred_on = typeof body.occurred_on === 'string' ? body.occurred_on.slice(0, 10) : '';
      if (!label || Number.isNaN(amount) || amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(occurred_on)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid fields' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      const row = await createFinanceLineItem(
        {
          kind: body.kind,
          label,
          amount,
          category: typeof body.category === 'string' ? body.category : null,
          occurred_on,
          notes: typeof body.notes === 'string' ? body.notes : null,
        },
        email,
      );
      return new Response(JSON.stringify({ success: true, data: row }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PATCH') {
      const body = await req.json().catch(() => ({}));
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Missing id' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      const patch: Parameters<typeof updateFinanceLineItem>[1] = {};
      if (body.kind !== undefined && isKind(body.kind)) patch.kind = body.kind;
      if (typeof body.label === 'string') patch.label = body.label.trim();
      if (body.amount !== undefined) {
        const amount = Number(body.amount);
        if (!Number.isNaN(amount) && amount >= 0) patch.amount = amount;
      }
      if (body.category !== undefined) {
        patch.category = typeof body.category === 'string' ? body.category : null;
      }
      if (typeof body.occurred_on === 'string') patch.occurred_on = body.occurred_on.slice(0, 10);
      if (body.notes !== undefined) {
        patch.notes = typeof body.notes === 'string' ? body.notes : null;
      }
      const row = await updateFinanceLineItem(id, patch);
      return new Response(JSON.stringify({ success: true, data: row }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Missing id' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      await deleteFinanceLineItem(id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in finance-line-items:', error);
    const status = error instanceof Response ? error.status : 400;
    const message = error instanceof Response
      ? await error.clone().json().then((b: { error?: string }) => b.error).catch(() => 'Unauthorized')
      : (error as Error).message;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
