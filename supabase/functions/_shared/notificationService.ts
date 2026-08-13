/**
 * In-app Notification Center — event insert helper.
 * See docs/workflow/in-progress/in-app-notifications.md for the full plan.
 */

import { createServiceClient } from './orgAuth.ts';

export type NotificationType =
  | 'booking_pending_review'
  | 'booking_ready_for_checkin'
  | 'booking_ready_for_checkout'
  | 'booking_sd_refund_due'
  | 'booking_gaf_auto_approved'
  | 'booking_pet_auto_approved'
  | 'inbox_new_message';

export type CreateNotificationInput = {
  organizationId: string;
  propertyId?: string | null;
  parkingId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  bookingId?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown>;
  /** Set to dedupe retried transitions/webhook redeliveries — unique on (type, dedupeKey). */
  dedupeKey?: string | null;
};

/**
 * Inserts a notification row. Never throws — a notification failure must not
 * fail the booking transition, email send, or webhook ack that triggered it
 * (mirrors the calendarOk/sheetOk non-fatal pattern in workflowOrchestrator.ts).
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const sb = createServiceClient();
    const payload = {
      organization_id: input.organizationId,
      property_id: input.propertyId ?? null,
      parking_id: input.parkingId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      booking_id: input.bookingId ?? null,
      conversation_id: input.conversationId ?? null,
      metadata: input.metadata ?? {},
      dedupe_key: input.dedupeKey ?? null,
    };

    // Plain insert, not upsert: notifications_type_dedupe_key_unique is a partial index
    // (WHERE dedupe_key IS NOT NULL), and PostgREST's on_conflict target can't express that
    // predicate — ON CONFLICT would fail with "no unique or exclusion constraint matching".
    // A duplicate dedupeKey still raises 23505 on plain insert, which we swallow below.
    const { error } = await sb.from('notifications').insert(payload);

    if (error && error.code !== '23505') {
      console.error('[notificationService] createNotification failed:', error.message);
    }
  } catch (err) {
    console.error('[notificationService] createNotification threw:', err);
  }
}
