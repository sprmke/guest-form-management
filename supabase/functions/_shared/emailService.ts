import { GuestFormData, GuestSubmission } from './types.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  DEFAULT_EMAIL_LOGO_URL,
  escapeHtml,
  loadEmailTemplate,
  replacePlaceholders,
} from './renderEmailHtml.ts'

async function emailHeaderLogoHtml(): Promise<string> {
  const raw = (Deno.env.get('EMAIL_LOGO_URL') ?? '').trim() || DEFAULT_EMAIL_LOGO_URL;
  const frag = await loadEmailTemplate('fragments/email-header-logo');
  return replacePlaceholders(frag, { logoUrl: escapeHtml(raw) });
}

// ─── Shared storage helpers ───────────────────────────────────────────────────

function supabaseAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

/**
 * Parse a Supabase Storage public URL into { bucket, path }.
 * Returns null for placeholder values or unparseable URLs.
 */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    if (!url || url === 'dev-mode-skipped' || url === 'test-mode-skipped' || !url.startsWith('http')) {
      return null;
    }
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    // Support both /storage/v1/object/public/… and /storage/v1/object/sign/…
    const markerIdx = parts.findIndex((p) => p === 'public' || p === 'sign');
    if (markerIdx !== -1 && markerIdx < parts.length - 2) {
      const bucket = parts[markerIdx + 1];
      const path = parts.slice(markerIdx + 2).join('/');
      return { bucket, path };
    }
    return null;
  } catch {
    return null;
  }
}

type DownloadedFile = {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
};

/**
 * Download a file from Supabase Storage using the service role key.
 * Works for both public and private buckets.
 */
async function downloadStorageFile(url: string, fallbackFilename: string): Promise<DownloadedFile | null> {
  const loc = parseStorageUrl(url);
  if (!loc) {
    console.warn('[emailService] Cannot parse storage URL:', url);
    return null;
  }

  try {
    const { data, error } = await supabaseAdminClient()
      .storage
      .from(loc.bucket)
      .download(loc.path);

    if (error || !data) {
      console.error('[emailService] Storage download failed:', error?.message);
      return null;
    }

    const bytes = new Uint8Array(await data.arrayBuffer());
    const filename = loc.path.split('/').pop() || fallbackFilename;
    const mimeType = data.type || 'application/octet-stream';
    return { bytes, filename, mimeType };
  } catch (err) {
    console.error('[emailService] Unexpected download error:', err);
    return null;
  }
}

/**
 * Convert file bytes to a base64 string for Resend attachments.
 */
function toBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + chunkSize))));
  }
  return btoa(chunks.join(''));
}

/**
 * Checks if a booking is urgent (same-day check-in)
 * @param checkInDate - Check-in date in MM-DD-YYYY or YYYY-MM-DD format
 * @returns true if check-in is today (in Philippine timezone UTC+8)
 */
function isUrgentBooking(checkInDate: string): boolean {
  try {
    console.log('🔍 Checking if booking is urgent...');
    
    // Parse the check-in date (supports both MM-DD-YYYY and YYYY-MM-DD formats)
    let checkInDateStr = checkInDate;
    
    // If date is in MM-DD-YYYY format, convert to YYYY-MM-DD
    if (checkInDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [month, day, year] = checkInDate.split('-');
      checkInDateStr = `${year}-${month}-${day}`;
      console.log('  Converted to YYYY-MM-DD:', checkInDateStr);
    }
    
    // Get today's date in Philippine timezone (UTC+8)
    const philippineTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const todayStr = philippineTime.getFullYear() + '-' + 
      String(philippineTime.getMonth() + 1).padStart(2, '0') + '-' + 
      String(philippineTime.getDate()).padStart(2, '0');
    
    console.log('  Today\'s date (Philippine time):', todayStr);
    console.log('  Check-in date (normalized):', checkInDateStr);
    console.log('  Is urgent:', checkInDateStr === todayStr);
    
    return checkInDateStr === todayStr;
  } catch (error) {
    console.error('❌ Error checking if booking is urgent:', error);
    return false;
  }
}

export async function sendEmail(formData: GuestFormData, pdfBuffer: Uint8Array | null, isTestingMode = false, isUpdate = false) {
  console.log(`Sending ${isUpdate ? 'update' : 'confirmation'} email...`);
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const EMAIL_TO = Deno.env.get('EMAIL_TO')
  const EMAIL_REPLY_TO = Deno.env.get('EMAIL_REPLY_TO')
  
  if (!RESEND_API_KEY) {
    console.error(' Missing RESEND_API_KEY environment variable');
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  if (!EMAIL_TO) {
    console.error(' Missing EMAIL_TO environment variable');
    throw new Error('Missing EMAIL_TO environment variable')
  }

  if (!EMAIL_REPLY_TO) {
    console.error(' Missing EMAIL_REPLY_TO environment variable');
    throw new Error('Missing EMAIL_REPLY_TO environment variable')
  }

  // Check if booking is urgent (same-day check-in)
  const isUrgent = isUrgentBooking(formData.checkInDate);
  const urgentPrefix = isUrgent ? '🚨 URGENT - ' : '';

  if (isUrgent) {
    console.log('🚨 URGENT BOOKING DETECTED - Same-day check-in!');
  }

  const testPrefix = isTestingMode ? '⚠️ TEST - ' : '';
  const testWarning = isTestingMode ? await loadEmailTemplate('fragments/test-warning-azure') : '';

  const bodyParagraphs = isUpdate
    ? `<p>The Guest Advise Form (GAF) details for <strong>${escapeHtml(formData.towerAndUnitNumber)}</strong> have been updated. Kindly review the revised GAF request for the dates <strong>${escapeHtml(formData.checkInDate)} to ${escapeHtml(formData.checkOutDate)}</strong> for your approval.</p><p>Please disregard the previous GAF request email for the same dates and unit. The attached form contains the most current and accurate information.</p>`
    : `<p>Kindly review the Guest Advise Form (GAF) request for <strong>${escapeHtml(formData.towerAndUnitNumber)}</strong>, dated from <strong>${escapeHtml(formData.checkInDate)} to ${escapeHtml(formData.checkOutDate)}</strong>, for your approval.</p>`;

  const urgentBlock = isUrgent
    ? `<table role="presentation" class="callout-outer callout-urgent" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td><strong class="callout-title">Urgent — same-day check-in</strong><br />This request requires immediate attention and approval from the property administration.</td></tr></table>`
    : '';

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const gafTpl = await loadEmailTemplate('gaf-request');
  const emailContent = replacePlaceholders(gafTpl, {
    emailHeaderLogo,
    testWarning,
    updateSuffix: isUpdate ? ' (Updated)' : '',
    urgentBlock,
    checkInDate: escapeHtml(formData.checkInDate),
    checkOutDate: escapeHtml(formData.checkOutDate),
    bodyParagraphs,
  });

  const base64PDF = pdfBuffer ? toBase64(pdfBuffer) : null;

  const updatePrefix = isUpdate ? 'UPDATED - ' : '';
  
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Monaco 2604 - GAF Request <mail@kamehomes.space>',
      to: [EMAIL_TO],
      // Never CC the guest on the GAF request email — per booking-workflow.mdc §3
      reply_to: EMAIL_REPLY_TO,
      subject: `${testPrefix}${urgentPrefix}${updatePrefix}Monaco 2604 - GAF Request (${formData.checkInDate} to ${formData.checkOutDate})`,
      html: emailContent,
      ...(base64PDF ? {
        attachments: [{
          filename: `MONACO_2604_GAF-${formData.checkInDate}.pdf`,
          content: base64PDF,
          encoding: 'base64'
        }]
      } : {})
    })
  })

  if (!res.ok) {
    const error = await res.json()
    console.error('Failed to send email:', error);
    throw new Error(`Failed to send email: ${JSON.stringify(error)}`)
  }

  console.log('Email sent successfully');
  return await res.json()
}

export async function sendPetEmail(
  formData: GuestFormData, 
  pdfBuffer: Uint8Array | null,
  petImageUrl?: string,
  petVaccinationUrl?: string,
  isTestingMode = false,
  isUpdate = false
) {
  console.log(`Sending pet ${isUpdate ? 'update' : 'request'} email...`);
  console.log('Pet Image URL:', petImageUrl);
  console.log('Pet Vaccination URL:', petVaccinationUrl);
  
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const EMAIL_TO = Deno.env.get('EMAIL_TO')
  const EMAIL_REPLY_TO = Deno.env.get('EMAIL_REPLY_TO')
  
  if (!RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY environment variable');
    throw new Error('Missing RESEND_API_KEY environment variable')
  }

  if (!EMAIL_TO) {
    console.error('Missing EMAIL_TO environment variable');
    throw new Error('Missing EMAIL_TO environment variable')
  }

  if (!EMAIL_REPLY_TO) {
    console.error('Missing EMAIL_REPLY_TO environment variable');
    throw new Error('Missing EMAIL_REPLY_TO environment variable')
  }

  const testPrefix = isTestingMode ? '⚠️ TEST - ' : '';
  const testWarning = isTestingMode ? await loadEmailTemplate('fragments/test-warning-azure') : '';

  const isUrgent = isUrgentBooking(formData.checkInDate);
  const urgentPrefix = isUrgent ? '🚨 URGENT - ' : '';

  if (isUrgent) {
    console.log('🚨 URGENT PET BOOKING DETECTED - Same-day check-in!');
  }

  const urgentBlock = isUrgent
    ? `<table role="presentation" class="callout-outer callout-urgent" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td><strong class="callout-title">Urgent — same-day check-in</strong><br />This request requires immediate attention and approval from the property administration.</td></tr></table>`
    : '';

  const bodyParagraphs = isUpdate
    ? `<p>The pet information for our guest at <strong>${escapeHtml(formData.towerAndUnitNumber)}</strong> has been updated. We kindly request your approval for the revised pet request for their stay from <strong>${escapeHtml(formData.checkInDate)}</strong> to <strong>${escapeHtml(formData.checkOutDate)}</strong>.</p><p>Please disregard the previous pet request email for the same dates and unit. The attached documents contain the most current information.</p>`
    : `<p>May we kindly request approval for our guest to bring a pet during their stay at <strong>${escapeHtml(formData.towerAndUnitNumber)}</strong> during their stay from <strong>${escapeHtml(formData.checkInDate)}</strong> to <strong>${escapeHtml(formData.checkOutDate)}</strong>.</p>`;

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const petTpl = await loadEmailTemplate('pet-request');
  const emailContent = replacePlaceholders(petTpl, {
    emailHeaderLogo,
    testWarning,
    updateSuffix: isUpdate ? ' (Updated)' : '',
    urgentBlock,
    checkInDate: escapeHtml(formData.checkInDate),
    checkOutDate: escapeHtml(formData.checkOutDate),
    bodyParagraphs,
    petName: escapeHtml(formData.petName || 'N/A'),
    petType: escapeHtml(formData.petType || 'N/A'),
    petBreed: escapeHtml(formData.petBreed || 'N/A'),
    petAge: escapeHtml(formData.petAge || 'N/A'),
    petVaccinationDate: escapeHtml(formData.petVaccinationDate || 'N/A'),
  });

  // Prepare attachments array
  const attachments: any[] = []

  // Add Pet PDF if available
  if (pdfBuffer) {
    attachments.push({
      filename: `MONACO_2604_PET_FORM-${formData.checkInDate}.pdf`,
      content: toBase64(pdfBuffer),
      encoding: 'base64',
    });
  }

  // Download and attach pet image if URL is provided
  if (petImageUrl) {
    const file = await downloadStorageFile(petImageUrl, `pet-image-${formData.checkInDate}.jpg`);
    if (file) {
      attachments.push({ filename: file.filename, content: toBase64(file.bytes), encoding: 'base64' });
      console.log('Pet image attached successfully:', file.filename);
    }
  }

  // Download and attach pet vaccination if URL is provided
  if (petVaccinationUrl) {
    const file = await downloadStorageFile(petVaccinationUrl, `pet-vaccination-${formData.checkInDate}.jpg`);
    if (file) {
      attachments.push({ filename: file.filename, content: toBase64(file.bytes), encoding: 'base64' });
      console.log('Pet vaccination record attached successfully:', file.filename);
    }
  }

  console.log(`Sending pet email with ${attachments.length} attachment(s)...`);
  attachments.forEach((att, index) => {
    console.log(`  Attachment ${index + 1}: ${att.filename} (${att.content.length} chars base64)`);
  });

  const updatePrefix = isUpdate ? 'UPDATED - ' : '';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Monaco 2604 - Pet Request <mail@kamehomes.space>',
      to: [EMAIL_TO],
      // Never CC the guest on the Pet request email — per booking-workflow.mdc §3
      reply_to: EMAIL_REPLY_TO,
      subject: `${testPrefix}${urgentPrefix}${updatePrefix}Monaco 2604 - Pet Request (${formData.checkInDate} to ${formData.checkOutDate})`,
      html: emailContent,
      attachments: attachments
    })
  })

  if (!res.ok) {
    const error = await res.json()
    console.error('Failed to send pet email:', error);
    throw new Error(`Failed to send pet email: ${JSON.stringify(error)}`)
  }

  console.log('Pet email sent successfully');
  return await res.json()
}

// ─── New Phase 3 emails ──────────────────────────────────────────────────────

function getResendCredentials() {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const EMAIL_TO = Deno.env.get('EMAIL_TO');          // Azure / building admin
  const EMAIL_REPLY_TO = Deno.env.get('EMAIL_REPLY_TO'); // kamehome.azurenorth

  if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
  if (!EMAIL_TO) throw new Error('Missing EMAIL_TO');
  if (!EMAIL_REPLY_TO) throw new Error('Missing EMAIL_REPLY_TO');

  return { RESEND_API_KEY, EMAIL_TO, EMAIL_REPLY_TO };
}

function pesoFormat(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Booking acknowledgement — sent to the **guest** when moving PENDING_REVIEW → PENDING_GAF.
 * Confirms we received the form and are processing their GAF.
 */
export async function sendBookingAcknowledgement(
  booking: GuestSubmission,
  isTestingMode = false,
) {
  console.log('Sending booking acknowledgement email to guest...');

  const { RESEND_API_KEY, EMAIL_REPLY_TO } = getResendCredentials();

  const testPrefix = isTestingMode ? '⚠️ TEST - ' : '';
  const testWarning = isTestingMode ? await loadEmailTemplate('fragments/test-warning-guest') : '';

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const ackTpl = await loadEmailTemplate('booking-acknowledgement');
  const html = replacePlaceholders(ackTpl, {
    emailHeaderLogo,
    testWarning,
    guestFacebookName: escapeHtml(booking.guest_facebook_name),
    towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Monaco 2604 - Kame Home <mail@kamehomes.space>',
      to: [booking.guest_email],
      reply_to: EMAIL_REPLY_TO,
      subject: `${testPrefix}Your booking request has been received — Monaco 2604 (${booking.check_in_date} to ${booking.check_out_date})`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to send booking acknowledgement: ${JSON.stringify(err)}`);
  }

  console.log('Booking acknowledgement email sent successfully');
  return await res.json();
}

/**
 * Ready for check-in — sent to the **guest** when transitioning to READY_FOR_CHECKIN.
 * Includes payment breakdown, important reminders, and any relevant approved documents as attachments:
 *   • Approved GAF PDF (always, if available)
 *   • Approved Pet PDF (if has_pets and available)
 *   • Parking endorsement (if need_parking and available)
 */
export async function sendReadyForCheckin(
  booking: GuestSubmission,
  isTestingMode = false,
) {
  console.log('Sending ready-for-check-in email to guest...');

  const { RESEND_API_KEY, EMAIL_REPLY_TO } = getResendCredentials();

  const testPrefix = isTestingMode ? '⚠️ TEST - ' : '';
  const testWarning = isTestingMode ? await loadEmailTemplate('fragments/test-warning-guest') : '';

  const balance = booking.balance ?? ((booking.booking_rate ?? 0) - (booking.down_payment ?? 0));
  const balanceNum = Number(balance);
  const totalDueAtCheckin =
    (Number.isFinite(balanceNum) ? balanceNum : 0) +
    (Number(booking.security_deposit ?? 0) || 0) +
    (booking.need_parking ? Number(booking.parking_rate_guest ?? 0) || 0 : 0) +
    (booking.has_pets ? Number(booking.pet_fee ?? 0) || 0 : 0);
  const totalBalanceDue = pesoFormat(totalDueAtCheckin);
  const pax = (booking.number_of_adults || 0) + (booking.number_of_children || 0);
  const displayCheckInTime = escapeHtml(booking.check_in_time || '2:00 PM');
  const displayCheckOutTime = escapeHtml(booking.check_out_time || '12:00 PM');

  const parkingPaymentRow = booking.need_parking ? `
    <tr class="fee-addon-row">
      <td class="tbl-label">Guest parking fee</td>
      <td class="tbl-num">${pesoFormat(booking.parking_rate_guest as number | null)}</td>
      <td class="tbl-note"><em class="italic-note">Non-refundable; no rescheduling</em></td>
    </tr>
  ` : '';

  const petPaymentRow = booking.has_pets ? `
    <tr class="fee-addon-row">
      <td class="tbl-label">Pet fee</td>
      <td class="tbl-num">${pesoFormat(booking.pet_fee as number | null)}</td>
      <td class="tbl-note"></td>
    </tr>
  ` : '';

  const gafReminderHtml = `
    <table role="presentation" class="callout-outer callout-doc callout-doc--gaf" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td>
          <span class="callout-title">Guest Advise Form (GAF)</span>
          Your GAF has been approved. No need to print it! Simply present it at the guard house upon arrival and to the lobby receptionist during registration.
        </td>
      </tr>
    </table>
  `;

  const parkingReminderHtml = booking.need_parking ? `
    <table role="presentation" class="callout-outer callout-doc callout-doc--parking" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td>
          <span class="callout-title">Parking</span>
          Your parking slot is confirmed. The guest parking fee is <strong class="callout-strong">non-refundable</strong>, and once confirmed your parking dates <strong class="callout-strong">cannot be rescheduled</strong>.
        </td>
      </tr>
    </table>
  ` : '';

  const petReminderHtml = booking.has_pets ? `
    <table role="presentation" class="callout-outer callout-doc callout-doc--pet" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td>
          <span class="callout-title">Pet</span>
          Your pet has been approved for this stay. 
        </td>
      </tr>
    </table>
  ` : '';

  const documentRemindersSection =
    gafReminderHtml + parkingReminderHtml + petReminderHtml;

  const houseRulesTpl = await loadEmailTemplate('ready-for-checkin-house-rules');
  const houseRulesSection = replacePlaceholders(houseRulesTpl, {
    pax: String(pax),
    checkInTime: displayCheckInTime,
    checkOutTime: displayCheckOutTime,
    securityDepositFormatted: pesoFormat(booking.security_deposit as number | null),
  });

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const rfiTpl = await loadEmailTemplate('ready-for-checkin');
  const html = replacePlaceholders(rfiTpl, {
    emailHeaderLogo,
    testWarning,
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
    guestFacebookName: escapeHtml(booking.guest_facebook_name),
    documentRemindersSection,
    pax: String(pax),
    towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
    checkInTime: displayCheckInTime,
    checkOutTime: displayCheckOutTime,
    bookingRate: pesoFormat(booking.booking_rate as number | null),
    downPayment: pesoFormat(booking.down_payment as number | null),
    balance: pesoFormat(balance as number),
    securityDeposit: pesoFormat(booking.security_deposit as number | null),
    totalBalanceDue,
    parkingPaymentRow,
    petPaymentRow,
    houseRulesSection,
  });

  // ── Build attachments ─────────────────────────────────────────────────────────
  const attachments: Array<{ filename: string; content: string; encoding: string }> = [];

  // Approved GAF PDF — always attach if available
  if (booking.approved_gaf_pdf_url) {
    console.log('[readyForCheckin] Downloading approved GAF PDF...');
    const file = await downloadStorageFile(
      booking.approved_gaf_pdf_url,
      `approved-gaf-${booking.check_in_date}.pdf`,
    );
    if (file) {
      attachments.push({ filename: file.filename, content: toBase64(file.bytes), encoding: 'base64' });
      console.log('[readyForCheckin] Attached approved GAF PDF:', file.filename);
    }
  }

  // Approved Pet PDF — attach if booking has pets
  if (booking.has_pets && booking.approved_pet_pdf_url) {
    console.log('[readyForCheckin] Downloading approved pet PDF...');
    const file = await downloadStorageFile(
      booking.approved_pet_pdf_url,
      `approved-pet-form-${booking.check_in_date}.pdf`,
    );
    if (file) {
      attachments.push({ filename: file.filename, content: toBase64(file.bytes), encoding: 'base64' });
      console.log('[readyForCheckin] Attached approved pet PDF:', file.filename);
    }
  }

  // Parking endorsement — attach if booking has parking
  if (booking.need_parking && booking.parking_endorsement_url) {
    console.log('[readyForCheckin] Downloading parking endorsement...');
    const file = await downloadStorageFile(
      booking.parking_endorsement_url,
      `parking-endorsement-${booking.check_in_date}.pdf`,
    );
    if (file) {
      attachments.push({ filename: file.filename, content: toBase64(file.bytes), encoding: 'base64' });
      console.log('[readyForCheckin] Attached parking endorsement:', file.filename);
    }
  }

  console.log(`[readyForCheckin] Sending email with ${attachments.length} attachment(s)...`);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Monaco 2604 - Kame Home <mail@kamehomes.space>',
      to: [booking.guest_email],
      reply_to: EMAIL_REPLY_TO,
      subject: `${testPrefix}You're all set! Ready for Check-in — Monaco 2604 (${booking.check_in_date} to ${booking.check_out_date})`,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to send ready-for-check-in email: ${JSON.stringify(err)}`);
  }

  console.log('Ready-for-check-in email sent successfully');
  return await res.json();
}

/**
 * Parking broadcast — BCC to all addresses in PARKING_OWNER_EMAILS env var.
 * Sent when transitioning PENDING_REVIEW → PENDING_GAF and `need_parking` is true.
 */
export async function sendParkingBroadcast(
  booking: GuestSubmission,
  isTestingMode = false,
) {
  console.log('Sending parking broadcast email...');

  const { RESEND_API_KEY, EMAIL_REPLY_TO } = getResendCredentials();

  const parkingOwnerEmailsRaw = Deno.env.get('PARKING_OWNER_EMAILS') ?? '';
  const bccEmails = parkingOwnerEmailsRaw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (bccEmails.length === 0) {
    console.warn('PARKING_OWNER_EMAILS is not set — skipping parking broadcast');
    return null;
  }

  const testPrefix = isTestingMode ? '⚠️ TEST - ' : '';
  const testWarning = isTestingMode ? await loadEmailTemplate('fragments/test-warning-parking') : '';

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const parkTpl = await loadEmailTemplate('parking-broadcast');
  const html = replacePlaceholders(parkTpl, {
    emailHeaderLogo,
    testWarning,
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
    towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
    checkInTime: escapeHtml(booking.check_in_time || '2:00 PM'),
    checkOutTime: escapeHtml(booking.check_out_time || '12:00 PM'),
    carBrandModel: escapeHtml(booking.car_brand_model || 'N/A'),
    carColor: escapeHtml(booking.car_color || 'N/A'),
    carPlate: escapeHtml(booking.car_plate_number || 'N/A'),
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Monaco 2604 - Kame Home <mail@kamehomes.space>',
      // Use first email as primary TO, rest as BCC for privacy
      to: [bccEmails[0]],
      bcc: bccEmails.slice(1),
      reply_to: EMAIL_REPLY_TO,
      subject: `${testPrefix}Parking Availability Request — Monaco 2604 (${booking.check_in_date} to ${booking.check_out_date})`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to send parking broadcast: ${JSON.stringify(err)}`);
  }

  console.log('Parking broadcast email sent successfully');
  return await res.json();
}

function guestAppOrigin(): string {
  const raw = (Deno.env.get('PUBLIC_GUEST_APP_ORIGIN') ?? '').trim();
  return raw || 'https://kamehomes.space';
}

/**
 * After checkout + grace — email guest a link to submit security-deposit refund preferences (/sd-form).
 * Sent on READY_FOR_CHECKIN → PENDING_SD_REFUND_DETAILS (cron or admin with dev control on).
 */
export async function sendSdRefundFormRequest(
  booking: GuestSubmission,
  isTestingMode = false,
) {
  console.log('Sending SD refund form request email to guest...');

  const { RESEND_API_KEY, EMAIL_REPLY_TO } = getResendCredentials();

  const testPrefix = isTestingMode ? '⚠️ TEST - ' : '';
  const testWarning = isTestingMode ? await loadEmailTemplate('fragments/test-warning-guest') : '';

  const bookingId = booking.id as string;
  if (!bookingId) throw new Error('sendSdRefundFormRequest: booking.id is required');

  const sdFormUrl = `${guestAppOrigin()}/sd-form?bookingId=${encodeURIComponent(bookingId)}`;

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const tpl = await loadEmailTemplate('sd-refund-form-request');
  const html = replacePlaceholders(tpl, {
    emailHeaderLogo,
    testWarning,
    guestFacebookName: escapeHtml(booking.guest_facebook_name),
    checkInDate: escapeHtml(booking.check_in_date),
    checkOutDate: escapeHtml(booking.check_out_date),
    sdFormUrl,
    securityDepositFormatted: pesoFormat(booking.security_deposit as number | null),
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Monaco 2604 - Kame Home <mail@kamehomes.space>',
      to: [booking.guest_email],
      reply_to: EMAIL_REPLY_TO,
      subject: `${testPrefix}Monaco 2604 - Submit SD Refund Details (${booking.check_in_date} to ${booking.check_out_date})`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to send SD refund form request: ${JSON.stringify(err)}`);
  }

  console.log('SD refund form request email sent successfully');
  return await res.json();
}
