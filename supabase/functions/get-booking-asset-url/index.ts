/**
 * get-booking-asset-url — Admin-only helper to return a browser-loadable URL for
 * Supabase Storage objects. Public buckets: normalized public URL. Private buckets
 * (`sd-refund-receipts`, `approved-gafs`, `approved-pet-forms`): short-lived signed URL.
 *
 * POST JSON: `{ "url": "<stored storage or kong URL>" }`
 * Auth: verifyAdminJwt (see admin-auth.mdc §6).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { formatPublicUrl } from "../_shared/utils.ts";
import {
  jsonResponse,
  jsonSuccess,
  readJsonBody,
  requireHttpMethod,
} from "../_shared/httpResponse.ts";
import { serveAdmin } from "../_shared/serveEdge.ts";

const STORAGE_OBJECT_PATH_RE =
  /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/;

const PRIVATE_BUCKETS = new Set([
  "approved-gafs",
  "approved-pet-forms",
  "sd-refund-receipts",
]);

const SIGNED_URL_TTL_SEC = 60 * 30;

function parseStorageLocation(
  url: string,
): { bucket: string; path: string } | null {
  const withoutQuery = url.split("?")[0] ?? "";
  const m = withoutQuery.match(STORAGE_OBJECT_PATH_RE);
  if (!m) return null;
  const bucket = m[1];
  const rawPath = m[2] ?? "";
  if (!bucket || !rawPath) return null;
  try {
    return { bucket, path: decodeURIComponent(rawPath) };
  } catch {
    return { bucket, path: rawPath };
  }
}

serveAdmin("get-booking-asset-url", async (req) => {
  requireHttpMethod(req, "POST");
  const body = await readJsonBody(req);
  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!rawUrl) throw new Error("url is required");

  const normalized = formatPublicUrl(rawUrl);
  const loc = parseStorageLocation(normalized);

  if (!loc || !PRIVATE_BUCKETS.has(loc.bucket)) {
    return jsonSuccess(req, { url: normalized });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.storage
    .from(loc.bucket)
    .createSignedUrl(loc.path, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    const msg =
      error?.message ?? "Failed to create signed URL for storage object";
    if (/not found/i.test(msg)) {
      console.warn(
        `[get-booking-asset-url] Storage object missing: ${loc.bucket}/${loc.path}`,
      );
      return jsonResponse(
        req,
        {
          success: false,
          error: "Object not found",
          code: "STORAGE_OBJECT_NOT_FOUND",
        },
        404,
      );
    }
    throw new Error(msg);
  }

  return jsonSuccess(req, { url: formatPublicUrl(data.signedUrl) });
});
