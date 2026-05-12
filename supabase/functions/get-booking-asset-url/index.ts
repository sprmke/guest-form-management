/**
 * get-booking-asset-url — Admin-only helper to return a browser-loadable URL for
 * Supabase Storage objects. Public buckets: normalized public URL. Private buckets
 * (`sd-refund-receipts`, `approved-gafs`, `approved-pet-forms`): short-lived signed URL.
 *
 * POST JSON: `{ "url": "<stored storage or kong URL>" }`
 * Auth: verifyAdminJwt (see admin-auth.mdc §6).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAdminJwt } from '../_shared/auth.ts';
import { formatPublicUrl } from '../_shared/utils.ts';

const STORAGE_OBJECT_PATH_RE =
  /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/;

const PRIVATE_BUCKETS = new Set([
  'approved-gafs',
  'approved-pet-forms',
  'sd-refund-receipts',
]);

const SIGNED_URL_TTL_SEC = 60 * 30;

function parseStorageLocation(url: string): { bucket: string; path: string } | null {
  const withoutQuery = url.split('?')[0] ?? '';
  const m = withoutQuery.match(STORAGE_OBJECT_PATH_RE);
  if (!m) return null;
  const bucket = m[1];
  const rawPath = m[2] ?? '';
  if (!bucket || !rawPath) return null;
  try {
    return { bucket, path: decodeURIComponent(rawPath) };
  } catch {
    return { bucket, path: rawPath };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    await verifyAdminJwt(req);

    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const body = (await req.json()) as { url?: string };
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    if (!rawUrl) throw new Error('url is required');

    const normalized = formatPublicUrl(rawUrl);
    const loc = parseStorageLocation(normalized);

    if (!loc) {
      return new Response(
        JSON.stringify({ success: true, data: { url: normalized } }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (!PRIVATE_BUCKETS.has(loc.bucket)) {
      return new Response(
        JSON.stringify({ success: true, data: { url: normalized } }),
        { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.storage
      .from(loc.bucket)
      .createSignedUrl(loc.path, SIGNED_URL_TTL_SEC);

    if (error || !data?.signedUrl) {
      throw new Error(
        error?.message ?? 'Failed to create signed URL for storage object',
      );
    }

    const signed = formatPublicUrl(data.signedUrl);

    return new Response(
      JSON.stringify({ success: true, data: { url: signed } }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in get-booking-asset-url:', error);
    const status = error instanceof Response ? error.status : 400;
    const message = error instanceof Response
      ? await error.clone().json().then((b: { error?: string }) => b.error).catch(() => 'Unauthorized')
      : (error as Error).message;

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
