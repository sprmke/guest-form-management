import { errorMessageFromThrown } from './httpResponse.ts';

Deno.test('STATUS_CONFLICT maps to 409 without prefix', async () => {
  const result = await errorMessageFromThrown(
    new Error('STATUS_CONFLICT: Booking status changed. Refresh and try again.')
  );
  if (result.status !== 409) {
    throw new Error(`expected 409, got ${result.status}`);
  }
  if (result.message !== 'Booking status changed. Refresh and try again.') {
    throw new Error(`unexpected message: ${result.message}`);
  }
});

Deno.test('plain Error stays 400', async () => {
  const result = await errorMessageFromThrown(new Error('property_id is required'));
  if (result.status !== 400) {
    throw new Error(`expected 400, got ${result.status}`);
  }
  if (result.message !== 'property_id is required') {
    throw new Error(`unexpected message: ${result.message}`);
  }
});
