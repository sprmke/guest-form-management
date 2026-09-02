import './_localSupabaseEnv.ts';
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

import { BOOKING_ASSET_TYPES } from '../_shared/bookingAssetUpload.ts';
import {
  EXTERNAL_SEND_TOOL_NAMES,
  READ_TOOL_NAMES,
  TIER1_ONLY_TOOL_NAMES,
  TIER2_ONLY_TOOL_NAMES,
} from '../_shared/dashboardAssistantRiskClassifier.ts';
import { BOOKING_WORKFLOW_EMAIL_KINDS } from '../_shared/sendBookingWorkflowEmail.ts';

/** Part D.1 + F.4 — keep in sync with plan inventory. */
const EXPECTED_BOOKING_ASSET_TYPES = [
  'approved_gaf',
  'approved_pet',
  'valid_id',
  'guest2_valid_id',
  'guest3_valid_id',
  'guest4_valid_id',
  'guest5_valid_id',
  'payment_receipt',
  'guest_balance_payment_receipt',
  'parking_endorsement',
  'parking_payment_receipt',
  'sd_refund_receipt',
  'pet_vaccination',
  'pet_image',
] as const;

const EXPECTED_WORKFLOW_EMAIL_KINDS = [
  'booking_acknowledgement',
  'gaf_request',
  'pet_request',
  'ready_for_checkin',
  'sd_refund_form_request',
] as const;

Deno.test('tool catalog counts match architecture doc (99 total)', () => {
  assertEquals(READ_TOOL_NAMES.size, 50);
  assertEquals(TIER1_ONLY_TOOL_NAMES.size, 5);
  assertEquals(TIER2_ONLY_TOOL_NAMES.size, 43);
  assertEquals(
    READ_TOOL_NAMES.size + TIER1_ONLY_TOOL_NAMES.size + TIER2_ONLY_TOOL_NAMES.size + 1,
    99
  );
});

Deno.test('external_send tools are registered as tier2-only', () => {
  assertEquals(EXTERNAL_SEND_TOOL_NAMES.size, 3);
  for (const toolName of EXTERNAL_SEND_TOOL_NAMES) {
    assertEquals(TIER2_ONLY_TOOL_NAMES.has(toolName), true);
  }
});

Deno.test('guidance tools are tier0 read', () => {
  for (const toolName of [
    'get_notification_preferences',
    'guide_notification_settings',
    'get_telegram_notification_settings',
    'guide_telegram_settings',
    'guide_create_booking',
    'guide_import_bookings',
  ]) {
    assertEquals(READ_TOOL_NAMES.has(toolName), true);
  }
});

Deno.test('Part D.1 booking asset inventory matches shared upload helper', () => {
  assertEquals([...BOOKING_ASSET_TYPES].sort(), [...EXPECTED_BOOKING_ASSET_TYPES].sort());
});

Deno.test('Part F.4 workflow email kinds match send helper', () => {
  assertEquals([...BOOKING_WORKFLOW_EMAIL_KINDS].sort(), [...EXPECTED_WORKFLOW_EMAIL_KINDS].sort());
});
