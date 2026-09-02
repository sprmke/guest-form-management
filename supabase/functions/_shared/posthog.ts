import { PostHog } from 'https://esm.sh/posthog-node@5.51.5';

/**
 * Server-side PostHog exception capture for edge functions.
 *
 * Wired centrally into `httpResponse.ts#handleEdgeError` (covers serveAdmin /
 * serveSuperAdmin / serveAuthenticated / servePublic) and `serveEdge.ts#serveCronPost` —
 * prefer routing new functions through those choke points instead of calling this directly.
 *
 * A handful of functions predate `serveEdge.ts` and call `serve()` directly with their own
 * try/catch (custom multipart/webhook/redirect handling that doesn't fit the wrapper
 * signatures) — those call this helper explicitly from their own catch block: `submit-form`,
 * `submit-sd-form`, `submit-pay-parking`, `submit-form-completion`, `sd-refund-cron`,
 * `calendar-sync-cron`, `upload-development-media`, `meta-inbox-backfill`,
 * `meta-inbox-oauth-callback`, `ical-export`. `meta-inbox-webhook` was given a top-level
 * try/catch that calls `handleEdgeError` like the wrapped functions. `parking-broadcast-email`
 * is a retired 410 stub with no real logic — intentionally uninstrumented.
 *
 * Deno Edge isolates can terminate immediately after the response is sent, so every
 * capture flushes immediately (`flushAt: 1, flushInterval: 0`) and this helper awaits
 * `flush()` before returning. `flush()` has no built-in network timeout (verified against
 * posthog-node's public API/docs), so a slow or unreachable PostHog ingestion endpoint could
 * otherwise hang this call indefinitely and delay — or, worse, time out — the real error
 * response this is only meant to observe. `flush()` is raced against `CAPTURE_TIMEOUT_MS` so
 * observability plumbing can never add more than a bounded delay to the caller.
 */

const CAPTURE_TIMEOUT_MS = 3000;

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;
  const apiKey = Deno.env.get('POSTHOG_API_KEY');
  if (!apiKey) {
    client = null;
    return client;
  }
  const host = Deno.env.get('POSTHOG_HOST');
  client = new PostHog(apiKey, {
    ...(host ? { host } : {}),
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

function environmentTag(): string {
  const explicit = Deno.env.get('ENVIRONMENT') ?? Deno.env.get('DENO_ENV');
  if (explicit) return explicit;
  return Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';
}

export async function capturePostHogException(
  error: unknown,
  options: {
    logPrefix: string;
    distinctId?: string;
    request?: Request;
    extra?: Record<string, unknown>;
  }
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  try {
    const requestDistinctId = options.request?.headers.get('X-POSTHOG-DISTINCT-ID')?.trim();
    const requestSessionId = options.request?.headers.get('X-POSTHOG-SESSION-ID')?.trim();
    const distinctId = options.distinctId ?? requestDistinctId ?? `edge:${options.logPrefix}`;
    const hasUserContext = Boolean(options.distinctId ?? requestDistinctId);
    const err = error instanceof Error ? error : new Error(String(error));
    ph.captureException(err, distinctId, {
      logPrefix: options.logPrefix,
      environment: environmentTag(),
      runtime: 'deno-edge-function',
      ...(requestSessionId ? { $session_id: requestSessionId } : {}),
      // Cron and webhook failures are not people; avoid a shared system profile.
      ...(hasUserContext ? {} : { $process_person_profile: false }),
      ...options.extra,
    });
    await Promise.race([
      ph.flush(),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error('posthog flush timed out')), CAPTURE_TIMEOUT_MS)
      ),
    ]);
  } catch (captureError) {
    // Never let observability plumbing break the function it's monitoring.
    console.error('[posthog] failed to capture exception', captureError);
  }
}
