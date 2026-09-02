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

  it('is disabled and never calls init when VITE_POSTHOG_KEY is unset', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');

    const { isPostHogEnabled } = await loadClient();

    expect(isPostHogEnabled).toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only key the same as unset (no crash, no init)', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '   ');

    const { isPostHogEnabled } = await loadClient();

    expect(isPostHogEnabled).toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('is enabled and initializes with the default host when only the key is set', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
    vi.stubEnv('VITE_POSTHOG_HOST', '');

    const { isPostHogEnabled } = await loadClient();

    expect(isPostHogEnabled).toBe(true);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_exceptions: true,
      })
    );
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

  it('falls back to the default host when VITE_POSTHOG_HOST is whitespace-only', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
    vi.stubEnv('VITE_POSTHOG_HOST', '   ');

    await loadClient();

    expect(mockInit).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({ api_host: 'https://us.i.posthog.com' })
    );
  });

  it('never calls init twice for a single module load (singleton guard)', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');

    await loadClient();
    // A second import without resetModules must hit the module cache, not re-run init.
    await import('./client');

    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});
