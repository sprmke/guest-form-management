import posthog from 'posthog-js';

// Singleton configuration read from Vite's browser-safe environment variables.
const apiKey = (import.meta.env.VITE_POSTHOG_KEY as string | undefined)?.trim();
const apiHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim();
const supabaseFunctionsHost = (() => {
  const functionsUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!functionsUrl) return undefined;

  try {
    return new URL(functionsUrl).hostname;
  } catch {
    return undefined;
  }
})();

export const isPostHogEnabled = Boolean(apiKey && apiHost);

if (isPostHogEnabled) {
  posthog.init(apiKey!, {
    api_host: apiHost,
    // Bundles current best-practice defaults (SPA history-based pageviews,
    // rageclick detection, etc.) — see https://posthog.com/docs/libraries/js/config
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    // Carries the persisted browser distinct and session IDs to Supabase Edge
    // Functions so their exception reports belong to the same person.
    ...(supabaseFunctionsHost ? { tracing_headers: [supabaseFunctionsHost] } : {}),
    // Send uncaught browser errors and promise rejections to Error Tracking.
    // Console errors are intentionally excluded to avoid noisy error ingestion.
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });
} else if (import.meta.env.DEV) {
  const missingVariable = apiKey ? 'VITE_POSTHOG_HOST' : 'VITE_POSTHOG_KEY';
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
  );
}

// Singleton. Do not call posthog.init() elsewhere — import this module instead so the
// guard above always runs first.
export { posthog };
