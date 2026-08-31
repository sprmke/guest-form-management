import {
  buildPricingBaseRateSummary,
  humanizeActionConfirmationSummary,
  humanizeHostFacingCopy,
  humanizeHostFieldLabel,
} from './dashboardAssistantActionDisplay.ts';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

Deno.test('buildPricingBaseRateSummary never uses camelCase keys', () => {
  const summary = buildPricingBaseRateSummary('property', { weekendNightlyRate: 3299 });
  assertEqual(summary.includes('weekendNightlyRate'), false, 'no camelCase');
  assertEqual(summary.includes('weekend nightly rate'), true, 'human label');
  assertEqual(summary.includes('₱3,299'), true, 'peso amount');
});

Deno.test('humanizeHostFacingCopy rewrites camelCase in free text', () => {
  const text = humanizeHostFacingCopy('Update property base rates: weekendNightlyRate.');
  assertEqual(text.includes('weekendNightlyRate'), false, 'no camelCase');
  assertEqual(text.includes('weekend nightly rate'), true, 'rewritten');
});

Deno.test('humanizeActionConfirmationSummary prefers payload when summary empty', () => {
  const summary = humanizeActionConfirmationSummary('propose_update_property_base_rate', '', {
    weekendNightlyRate: 3299,
  });
  assertEqual(summary.includes('weekendNightlyRate'), false, 'no camelCase');
  assertEqual(humanizeHostFieldLabel('weekendNightlyRate'), 'Weekend nightly rate', 'label map');
});
