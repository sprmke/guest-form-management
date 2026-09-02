import posthog from 'posthog-js';

// Mirrors ui/src/lib/supabase/client.ts: singleton + soft warning when unset so local
// dev without a PostHog project doesn't error, it just no-ops.
const apiKey = (import.meta.env.VITE_POSTHOG_KEY as string | undefined)?.trim();
const apiHost =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim() || 'https://us.i.posthog.com';

export const isPostHogEnabled = Boolean(apiKey);

if (isPostHogEnabled) {
  posthog.init(apiKey!, {
    api_host: apiHost,
    // Bundles current best-practice defaults (SPA history-based pageviews,
    // rageclick detection, etc.) — see https://posthog.com/docs/libraries/js/config
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    capture_exceptions: true,
  });
} else if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[posthog] Missing VITE_POSTHOG_KEY. Error tracking, analytics, and session replay are disabled.'
  );
}

// Singleton. Do not call posthog.init() elsewhere — import this module instead so the
// guard above always runs first.
export { posthog };
