import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { minutesBetweenTimes } from '../_shared/cleaningBuffer.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { DatabaseService } from '../_shared/databaseService.ts';
import { sendNewBookingRequestNotify } from '../_shared/emailService.ts';
import { resolveGuestFormSettings } from '../_shared/guestFormSettings.ts';
import { propertyAutomationEnabled } from '../_shared/propertyAutomationToggles.ts';
import { notifyTelegramNewBookingRequest } from '../_shared/telegramMarketing.ts';
import { notifyTelegramAdminNewBooking } from '../_shared/telegramAdmin.ts';
import { notifyTelegramStaffSameDayCheckIn } from '../_shared/telegramStaff.ts';
import { compareFormData, shouldRevertReadyForCheckinToPendingReview } from '../_shared/utils.ts';
import {
  shouldRevertGuestFieldEditsToPendingReview,
  canGuestPublicUpdateForm,
} from '../_shared/statusMachine.ts';
import { refreshGuestStayGuideAccessWindow } from '../_shared/guestStayGuide.ts';
import type { GuestSubmission } from '../_shared/types.ts';
import { createNotification } from '../_shared/notificationService.ts';
import { bookingNotificationMetadata } from '../_shared/notificationEnrichment.ts';
import {
  resolvePublicPropertyId,
  resolveOrganizationIdForProperty,
} from '../_shared/propertyScope.ts';
import { tryGetAuthenticatedUser } from '../_shared/orgAuth.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    console.log('Starting form submission process...');

    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Get URL parameters
    const url = new URL(req.url);
    const propertyId = await resolvePublicPropertyId(url);

    // Check if we're in production (Supabase Edge Functions have DENO_DEPLOYMENT_ID)
    const isProduction = Deno.env.get('DENO_DEPLOYMENT_ID') !== undefined;

    // Get and process form data
    const formData = await req.formData();

    /**
     * Side-effect flags: production always runs the full happy path (ignore client).
     * Non-production reads FormData first, then legacy URL query (backward compat).
     */
    const readSubmitFlag = (name: string, defaultWhenOmitted: boolean): boolean => {
      if (isProduction) return true;
      const fromBody = formData.get(name);
      if (fromBody === 'true' || fromBody === 'false') return fromBody === 'true';
      const fromUrl = url.searchParams.get(name);
      if (fromUrl === 'true' || fromUrl === 'false') return fromUrl === 'true';
      return defaultWhenOmitted;
    };

    const isSaveToDatabaseEnabled = readSubmitFlag('saveToDatabase', true);
    const isSaveImagesToStorageEnabled = readSubmitFlag('saveImagesToStorage', true);
    /** New Booking Request → `EMAIL_REPLY_TO`; guest form dev panel sends explicit `sendEmail=false` when unchecked. */
    const isSendEmailEnabled = readSubmitFlag('sendEmail', true);

    // Log enabled features for debugging
    console.log('🎛️ API Action Flags:');
    console.log(`  Environment: ${isProduction ? '🌐 PRODUCTION' : '💻 DEVELOPMENT'}`);
    console.log(`  Save to Database: ${isSaveToDatabaseEnabled ? '✅' : '❌'}`);
    console.log(`  Save Images to Storage: ${isSaveImagesToStorageEnabled ? '✅' : '❌'}`);
    console.log(
      '  Generate PDF: ❌ (filled GAF/pet PDFs run on admin PENDING_REVIEW → documents transition)'
    );
    console.log('  Send workflow emails: ❌ (GAF / ack / pet / parking only on admin transitions)');
    console.log(
      `  New Booking Request email (EMAIL_REPLY_TO): ${isSendEmailEnabled ? '✅' : '❌'} (FormData/sendEmail, default on — only sent after a DB save with an id; not this flag alone)`
    );
    console.log('---');

    // Extract check-in and check-out dates and booking ID to check for overlaps
    const checkInDate = formData.get('checkInDate') as string;
    const checkOutDate = formData.get('checkOutDate') as string;
    let bookingId = formData.get('bookingId') as string;

    // Sanitize bookingId to remove any query parameters or extra characters
    // This prevents UUID validation errors if the bookingId was contaminated
    if (bookingId) {
      bookingId = bookingId.split('?')[0].split('&')[0].trim();
    }

    console.log('📅 Received dates for overlap check:');
    console.log('  Check-in:', checkInDate);
    console.log('  Check-out:', checkOutDate);
    console.log('  Booking ID:', bookingId);

    if (!checkInDate || !checkOutDate) {
      throw new Error('Check-in and check-out dates are required');
    }

    // Check for overlapping bookings (only if saving to database)
    if (isSaveToDatabaseEnabled) {
      console.log('🔍 Starting overlap check...');
      const { hasOverlap, overlappingBookings, blockedByOwner } =
        await DatabaseService.checkOverlappingBookings(
          checkInDate,
          checkOutDate,
          bookingId,
          propertyId
        );

      if (blockedByOwner) {
        console.error('❌ OWNER-BLOCKED DATES SELECTED!');
        throw new Error('DATES_BLOCKED: Selected dates are unavailable.');
      }

      if (hasOverlap) {
        console.error('❌ BOOKING OVERLAP DETECTED!');
        console.error('Overlapping bookings:', overlappingBookings);
        throw new Error(
          'BOOKING_OVERLAP: The selected dates are already booked. Please screenshot this message and contact your host to further assist you.'
        );
      }

      console.log('✅ No overlaps found, proceeding with submission...');

      // Enforce the property's cleaning buffer on same-day turnovers — mirrors the
      // guest form's client-side check (guestFormSchema.ts) as the source of truth.
      const checkInTime = (formData.get('checkInTime') as string) || '';
      const checkOutTime = (formData.get('checkOutTime') as string) || '';
      const { cleaningBufferMinutes } = await resolveGuestFormSettings(propertyId ?? '');

      if (cleaningBufferMinutes && checkInTime && checkOutTime) {
        const adjacent = await DatabaseService.getAdjacentBookings(
          checkInDate,
          checkOutDate,
          bookingId,
          propertyId
        );

        for (const ab of adjacent) {
          if (ab.check_out_date === checkInDate && ab.check_out_time) {
            const gapMinutes = minutesBetweenTimes(ab.check_out_time, checkInTime);
            if (gapMinutes < cleaningBufferMinutes) {
              throw new Error(
                `CLEANING_BUFFER: Check-in must be at least ${cleaningBufferMinutes} minutes after the previous guest's checkout. Please pick a later check-in time.`
              );
            }
          }
          if (ab.check_in_date === checkOutDate && ab.check_in_time) {
            const gapMinutes = minutesBetweenTimes(checkOutTime, ab.check_in_time);
            if (gapMinutes < cleaningBufferMinutes) {
              throw new Error(
                `CLEANING_BUFFER: Check-out must be at least ${cleaningBufferMinutes} minutes before the next guest's check-in. Please pick an earlier check-out time.`
              );
            }
          }
        }
      }
    } else {
      console.log('⚠️ Skipping overlap check (saveToDatabase=false)');
    }

    // Check if this is an update and compare data for changes (only if saving to database)
    let hasDataChanges = true;
    let existingData = null;
    let revertReadyForCheckinToPendingReview = false;
    let guestFormChangedFields: string[] = [];

    if (isSaveToDatabaseEnabled && bookingId) {
      console.log('🔍 Checking for data changes...');

      existingData = await DatabaseService.getRawData(bookingId);

      if (existingData) {
        if (!canGuestPublicUpdateForm(existingData.status)) {
          throw new Error(
            'GUEST_FORM_LOCKED: This booking has already been reviewed. Contact your host on Facebook or Airbnb to request changes.'
          );
        }

        const comparison = compareFormData(formData, existingData);
        hasDataChanges = comparison.hasChanges;
        guestFormChangedFields = comparison.changedFields;

        if (!hasDataChanges) {
          console.log(
            'ℹ️ No changes detected, skipping processing and redirecting to success page'
          );
          if (isSendEmailEnabled) {
            console.log(
              '[submit-form] New booking request notify skipped: no data changes (same booking update)'
            );
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: 'No changes detected',
              data: { id: bookingId },
              skipped: true,
            }),
            {
              headers: {
                ...corsHeaders(req),
                'Content-Type': 'application/json',
              },
            }
          );
        }

        revertReadyForCheckinToPendingReview =
          shouldRevertGuestFieldEditsToPendingReview(existingData.status) &&
          shouldRevertReadyForCheckinToPendingReview(comparison.changedFields);

        console.log(
          `✅ Changes detected (${comparison.changedFields.length} fields), proceeding with update...`
        );
        console.log('Changed fields:', comparison.changedFields);
        if (revertReadyForCheckinToPendingReview) {
          console.log(
            `↩️ ${existingData.status} + workflow-sensitive edits → status will revert to PENDING_REVIEW`
          );
        }
      }
    } else if (!isSaveToDatabaseEnabled) {
      console.log('⚠️ Skipping change detection check (saveToDatabase=false)');
    }

    const isNewGuestSubmission = isSaveToDatabaseEnabled && !!bookingId && !existingData;

    const guestUser = await tryGetAuthenticatedUser(req);

    const { data, submissionData, validIdUrl, paymentReceiptUrl, petVaccinationUrl, petImageUrl } =
      await DatabaseService.processFormData(
        formData,
        isSaveToDatabaseEnabled,
        isSaveImagesToStorageEnabled,
        revertReadyForCheckinToPendingReview,
        propertyId,
        guestUser?.id,
        revertReadyForCheckinToPendingReview ? guestFormChangedFields : []
      );

    let notifyBooking = submissionData as GuestSubmission;

    const stayDatesChanged = guestFormChangedFields.some(
      (f) => f === 'check_in_date' || f === 'check_out_date'
    );
    if (
      isSaveToDatabaseEnabled &&
      notifyBooking?.id &&
      stayDatesChanged &&
      !revertReadyForCheckinToPendingReview
    ) {
      try {
        await refreshGuestStayGuideAccessWindow(notifyBooking);
      } catch (stayGuideErr) {
        console.error('[submit-form] Stay guide window refresh failed (non-fatal):', stayGuideErr);
      }
    }

    // Workflow emails (GAF, acknowledgement, pet, parking) are only sent by
    // WorkflowOrchestrator on admin transitions. Optional **New Booking Request**
    // notify (`sendEmail` query; default on) — non-fatal if it fails.

    if (isSendEmailEnabled && isSaveToDatabaseEnabled && submissionData?.id) {
      const emailAllowed = await propertyAutomationEnabled(propertyId, 'emailNewBookingRequest');
      if (emailAllowed) {
        try {
          notifyBooking = {
            ...notifyBooking,
            property_id: notifyBooking.property_id ?? propertyId,
          };
          const notifyResult = await sendNewBookingRequestNotify(notifyBooking);
          console.log(
            '[submit-form] New booking request notify ok, Resend id:',
            (notifyResult as { id?: string })?.id ?? JSON.stringify(notifyResult)
          );
        } catch (notifyErr) {
          console.error('[submit-form] New booking request notify failed (non-fatal):', notifyErr);
        }
      } else {
        console.log('[submit-form] New booking request notify skipped (org automation off)');
      }
    } else if (isSendEmailEnabled) {
      const reasons: string[] = [];
      if (!isSaveToDatabaseEnabled) reasons.push('saveToDatabase=false');
      if (!submissionData?.id) reasons.push('no submission id after save');
      console.log(`[submit-form] New booking request notify skipped: ${reasons.join(', ')}`);
    }

    if (isNewGuestSubmission && isSaveToDatabaseEnabled && submissionData?.id) {
      try {
        await notifyTelegramNewBookingRequest({ propertyId });
      } catch (tgErr) {
        console.error('[submit-form] Telegram new-booking notify failed (non-fatal):', tgErr);
      }
      try {
        const adminTg = await notifyTelegramAdminNewBooking(
          notifyBooking as Record<string, unknown>
        );
        console.log('[submit-form] Telegram admin new-booking:', JSON.stringify(adminTg));
      } catch (adminTgErr) {
        console.error(
          '[submit-form] Telegram admin new-booking notify failed (non-fatal):',
          adminTgErr
        );
      }
      try {
        await notifyTelegramStaffSameDayCheckIn(submissionData as Record<string, unknown>);
      } catch (staffTgErr) {
        console.error(
          '[submit-form] Telegram staff same-day check-in notify failed (non-fatal):',
          staffTgErr
        );
      }
      try {
        const organizationId = await resolveOrganizationIdForProperty(propertyId);
        const guestName = String(notifyBooking.primary_guest_name ?? '').trim() || 'A guest';
        await createNotification({
          organizationId,
          propertyId,
          type: 'booking_pending_review',
          title: 'New booking submitted',
          body: `${guestName} submitted a new booking request.`,
          bookingId: submissionData.id,
          metadata: bookingNotificationMetadata(notifyBooking),
          dedupeKey: `${submissionData.id}:booking_pending_review`,
        });
      } catch (notifErr) {
        console.error('[submit-form] Could not create notification (non-fatal):', notifErr);
      }
    }

    console.log('Form submission process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: submissionData,
      }),
      {
        headers: {
          ...corsHeaders(req),
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing form submission:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders(req),
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
