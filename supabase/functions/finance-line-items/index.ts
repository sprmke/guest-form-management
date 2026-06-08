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
import {
  isRecurrenceEditScope,
  isRecurrenceInterval,
} from '../_shared/financeRecurrence.ts';

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
        q: url.searchParams.get('q') ?? undefined,
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

      const recurrence_interval =
        body.recurrence_interval === null || body.recurrence_interval === 'none'
          ? null
          : isRecurrenceInterval(body.recurrence_interval)
            ? body.recurrence_interval
            : null;
      const recurrence_until =
        typeof body.recurrence_until === 'string' && body.recurrence_until
          ? body.recurrence_until.slice(0, 10)
          : null;

      if (
        body.recurrence_interval &&
        body.recurrence_interval !== 'none' &&
        !recurrence_interval
      ) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid recurrence interval' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }

      const result = await createFinanceLineItem(
        {
          kind: body.kind,
          label,
          amount,
          category: typeof body.category === 'string' ? body.category : null,
          occurred_on,
          notes: typeof body.notes === 'string' ? body.notes : null,
          recurrence_interval,
          recurrence_until,
        },
        email,
      );
      return new Response(
        JSON.stringify({
          success: true,
          data: result.row,
          created_count: result.created_count,
        }),
        {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
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
      const scope = isRecurrenceEditScope(body.scope) ? body.scope : 'this';
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
      const result = await updateFinanceLineItem(id, patch, scope);
      return new Response(
        JSON.stringify({
          success: true,
          data: result.row,
          updated_count: result.updated_count,
        }),
        {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: 'Missing id' }), {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      const scopeParam = url.searchParams.get('scope');
      const scope = isRecurrenceEditScope(scopeParam) ? scopeParam : 'this';
      const result = await deleteFinanceLineItem(id, scope);
      return new Response(
        JSON.stringify({ success: true, deleted_count: result.deleted_count }),
        {
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        },
      );
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
