import { afterEach, describe, expect, it, vi } from 'vitest';

const capture = vi.fn();

vi.mock('./client', () => ({
  isPostHogEnabled: true,
  posthog: { capture },
}));

vi.mock('./analyticsMode', () => ({
  shouldCaptureProductEvents: () => true,
}));

vi.mock('./context', () => ({
  buildSharedAnalyticsProperties: () => ({
    environment: 'local',
    app_track: 'mt',
    persona: 'anonymous_guest',
    surface: 'guest_ops',
  }),
}));

describe('captureAppEvent', () => {
  afterEach(() => {
    capture.mockClear();
  });

  it('forwards typed events with shared properties', async () => {
    const { captureAppEvent } = await import('./capture');
    captureAppEvent('calendar_opened', { booking_source: 'facebook' });
    expect(capture).toHaveBeenCalledWith(
      'calendar_opened',
      expect.objectContaining({
        environment: 'local',
        booking_source: 'facebook',
      })
    );
  });
});
