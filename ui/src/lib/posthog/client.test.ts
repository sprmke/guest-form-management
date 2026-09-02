import { afterEach, describe, expect, it, vi } from 'vitest';

// `client.ts` runs its init decision as a top-level side effect on import, so each test
// re-imports it fresh (`vi.resetModules`) after stubbing env vars, and asserts against this
// shared mock rather than the real SDK (no DOM in this test environment — see vitest.config.ts).
const mockInit = vi.fn();

vi.mock('posthog-js', () => ({
  default: { init: mockInit },
}));

async function loadClient() {
  vi.resetModules();
  return import('./client');
}

describe('posthog client init', () => {
  afterEach(() => {
    mockInit.mockClear();
    vi.unstubAllEnvs();
  });

  it('does not initialize when VITE_POSTHOG_KEY is unset', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');

    await expect(loadClient()).rejects.toThrow('VITE_POSTHOG_KEY variable required by PostHog');
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only key as unconfigured', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '   ');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');

    await expect(loadClient()).rejects.toThrow('VITE_POSTHOG_KEY variable required by PostHog');
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('does not initialize when VITE_POSTHOG_HOST is unset', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
    vi.stubEnv('VITE_POSTHOG_HOST', '');

    await expect(loadClient()).rejects.toThrow('VITE_POSTHOG_HOST variable required by PostHog');
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('trims whitespace from the key and forwards a custom host', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '  phc_test_key  ');
    vi.stubEnv('VITE_POSTHOG_HOST', '  https://eu.i.posthog.com  ');

    await loadClient();

    expect(mockInit).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({ api_host: 'https://eu.i.posthog.com' })
    );
  });

  it('treats a whitespace-only host as unconfigured', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
    vi.stubEnv('VITE_POSTHOG_HOST', '   ');

    await expect(loadClient()).rejects.toThrow('VITE_POSTHOG_HOST variable required by PostHog');
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('never calls init twice for a single module load (singleton guard)', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');

    await loadClient();
    // A second import without resetModules must hit the module cache, not re-run init.
    await import('./client');

    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});
