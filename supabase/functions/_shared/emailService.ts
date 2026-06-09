import { GuestFormData, GuestSubmission } from "./types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildParkingBroadcastCopyText,
  escapeHtml,
  loadEmailTemplate,
  replacePlaceholders,
  withEmailShellStyleVars,
} from "./renderEmailHtml.ts";
import {
  countStayNights,
  formatDateForEmail,
  formatTimeForDisplay,
} from "./utils.ts";
import { resolveAppSettings, DEFAULT_GCASH_QR_RELATIVE_PATH } from "./appSettings.ts";
import { formatReceiptVerdictLabel } from "./receiptValidationService.ts";

async function emailHeaderLogoHtml(): Promise<string> {
  const settings = await resolveAppSettings();
  const frag = await loadEmailTemplate("fragments/email-header-logo");
  return replacePlaceholders(
    frag,
    withEmailShellStyleVars({ logoUrl: escapeHtml(settings.emailLogoUrl) }),
  );
}

// ─── Shared storage helpers ───────────────────────────────────────────────────

function supabaseAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

/**
 * Parse a Supabase Storage public URL into { bucket, path }.
 * Returns null for placeholder values or unparseable URLs.
 */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    if (
      !url ||
      url === "dev-mode-skipped" ||
      url === "test-mode-skipped" ||
      !url.startsWith("http")
    ) {
      return null;
    }
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/");
    // Support both /storage/v1/object/public/… and /storage/v1/object/sign/…
    const markerIdx = parts.findIndex((p) => p === "public" || p === "sign");
    if (markerIdx !== -1 && markerIdx < parts.length - 2) {
      const bucket = parts[markerIdx + 1];
      const path = parts.slice(markerIdx + 2).join("/");
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
async function downloadStorageFile(
  url: string,
  fallbackFilename: string,
): Promise<DownloadedFile | null> {
  const loc = parseStorageUrl(url);
  if (!loc) {
    console.warn("[emailService] Cannot parse storage URL:", url);
    return null;
  }

  try {
    const { data, error } = await supabaseAdminClient()
      .storage.from(loc.bucket)
      .download(loc.path);

    if (error || !data) {
      console.error("[emailService] Storage download failed:", error?.message);
      return null;
    }

    const bytes = new Uint8Array(await data.arrayBuffer());
    const filename = loc.path.split("/").pop() || fallbackFilename;
    const mimeType = data.type || "application/octet-stream";
    return { bytes, filename, mimeType };
  } catch (err) {
    console.error("[emailService] Unexpected download error:", err);
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
    chunks.push(
      String.fromCharCode.apply(
        null,
        Array.from(bytes.slice(i, i + chunkSize)),
      ),
    );
  }
  return btoa(chunks.join(""));
}

/** `content_id` for Resend inline image; `<img src="cid:…">` must match without the prefix. */
const READY_FOR_CHECKIN_PAYMENT_QR_CONTENT_ID = "kame-home-gcash-qr";

async function loadBundledReadyForCheckinPaymentQr(): Promise<Uint8Array | null> {
  try {
    const url = new URL(
      "./email-assets/kame-home-gcash-qr-payment.jpg",
      import.meta.url,
    );
    return await Deno.readFile(url);
  } catch (err) {
    console.warn(
      "[emailService] Bundled payment QR asset missing or unreadable:",
      err,
    );
    return null;
  }
}

type ReadyForCheckinQrAsset = {
  bytes: Uint8Array | null;
  contentType: string;
  filename: string;
  fallbackUrl: string;
};

async function resolveReadyForCheckinPaymentQr(
  settings: Awaited<ReturnType<typeof resolveAppSettings>>,
): Promise<ReadyForCheckinQrAsset> {
  const originBase = settings.publicGuestAppOrigin.replace(/\/+$/, "");
  const defaultUrl = `${originBase}${DEFAULT_GCASH_QR_RELATIVE_PATH}`;
  const fallbackUrl = settings.gcashQrImageUrl || defaultUrl;
  const isCustomUpload =
    !!settings.gcashQrImageUrl && settings.gcashQrImageUrl !== defaultUrl;

  if (isCustomUpload) {
    try {
      const res = await fetch(settings.gcashQrImageUrl);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.length > 0) {
          const contentType =
            res.headers.get("content-type")?.split(";")[0]?.trim() ||
            "image/jpeg";
          const ext =
            contentType === "image/png"
              ? "png"
              : contentType === "image/webp"
                ? "webp"
                : "jpg";
          return {
            bytes,
            contentType,
            filename: `gcash-qr.${ext}`,
            fallbackUrl,
          };
        }
      }
      console.warn(
        "[emailService] Custom GCash QR fetch failed:",
        res.status,
        settings.gcashQrImageUrl,
      );
    } catch (err) {
      console.warn("[emailService] Custom GCash QR fetch error:", err);
    }
  }

  const bundled = await loadBundledReadyForCheckinPaymentQr();
  if (bundled && bundled.length > 0) {
    return {
      bytes: bundled,
      contentType: "image/jpeg",
      filename: "kame-home-gcash-qr-payment.jpg",
      fallbackUrl,
    };
  }

  return {
    bytes: null,
    contentType: "image/jpeg",
    filename: "kame-home-gcash-qr-payment.jpg",
    fallbackUrl,
  };
}

type ResendAttachment = {
  filename: string;
  content: string;
  encoding: string;
  content_id?: string;
  content_type?: string;
};

/**
 * Checks if a booking is urgent (same-day check-in)
 * @param checkInDate - Check-in date in MM-DD-YYYY or YYYY-MM-DD format
 * @returns true if check-in is today (in Philippine timezone UTC+8)
 */
function isUrgentBooking(checkInDate: string): boolean {
  try {
    console.log("🔍 Checking if booking is urgent...");

    // Parse the check-in date (supports both MM-DD-YYYY and YYYY-MM-DD formats)
    let checkInDateStr = checkInDate;

    // If date is in MM-DD-YYYY format, convert to YYYY-MM-DD
    if (checkInDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [month, day, year] = checkInDate.split("-");
      checkInDateStr = `${year}-${month}-${day}`;
      console.log("  Converted to YYYY-MM-DD:", checkInDateStr);
    }

    // Get today's date in Philippine timezone (UTC+8)
    const philippineTime = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
    );
    const todayStr =
      philippineTime.getFullYear() +
      "-" +
      String(philippineTime.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(philippineTime.getDate()).padStart(2, "0");

    console.log("  Today's date (Philippine time):", todayStr);
    console.log("  Check-in date (normalized):", checkInDateStr);
    console.log("  Is urgent:", checkInDateStr === todayStr);

    return checkInDateStr === todayStr;
  } catch (error) {
    console.error("❌ Error checking if booking is urgent:", error);
    return false;
  }
}

/** Same-day check-in (Asia/Manila) — HTML callout for Azure + guest templates. */
function buildUrgentSameDayCallout(isUrgent: boolean): string {
  if (!isUrgent) return "";
  const tdStyle =
    "background-color:#fde8e8;border:1px solid #e8a0a0;border-left-width:4px;border-left-color:#c94c4c;border-radius:0 16px 16px 0;padding:18px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;line-height:1.55;color:#6b2d2d;";
  const titleStyle =
    "display:block;margin-bottom:6px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#8b3a3a;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;";
  return `<table role="presentation" class="callout-outer callout-urgent" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr><td style="${tdStyle}"><strong class="callout-title" style="${titleStyle}">Urgent! Same-day check-in!</strong>This request requires immediate attention and approval.</td></tr></table>`;
}

/**
 * Same-day check-in (Asia/Manila) — **subject line** prefix for ops-facing
 * mail (GAF, Pet, Parking broadcast, **New Booking Request** notify to
 * `EMAIL_REPLY_TO`). Guest-facing templates (acknowledgement, check-in details,
 * SD refund form request subject, etc.) do not use this prefix on the subject.
 */
function urgentEmailSubjectPrefix(isUrgent: boolean): string {
  return isUrgent ? "🚨 URGENT - " : "";
}

export async function sendEmail(
  formData: GuestFormData,
  pdfBuffer: Uint8Array | null,
  isUpdate = false,
) {
  console.log(`Sending ${isUpdate ? "update" : "confirmation"} email...`);

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const settings = await resolveAppSettings();
  const EMAIL_TO = settings.emailTo;
  const EMAIL_REPLY_TO = settings.emailReplyTo;

  if (!RESEND_API_KEY) {
    console.error(" Missing RESEND_API_KEY environment variable");
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  if (!EMAIL_TO) {
    console.error(" Missing EMAIL_TO environment variable");
    throw new Error("Missing EMAIL_TO environment variable");
  }

  if (!EMAIL_REPLY_TO) {
    console.error(" Missing EMAIL_REPLY_TO environment variable");
    throw new Error("Missing EMAIL_REPLY_TO environment variable");
  }

  const isUrgent = isUrgentBooking(formData.checkInDate);
  const urgentPrefix = urgentEmailSubjectPrefix(isUrgent);

  if (isUrgent) {
    console.log("🚨 URGENT BOOKING DETECTED - Same-day check-in!");
  }

  const displayCheckInDate = formatDateForEmail(formData.checkInDate);
  const displayCheckOutDate = formatDateForEmail(formData.checkOutDate);
  const displayPetVaccinationDate = formatDateForEmail(
    formData.petVaccinationDate || "",
  );

  const bodyParagraphs = isUpdate
    ? `<p>The Guest Advise Form (GAF) details for <strong>${escapeHtml(formData.towerAndUnitNumber)}</strong> have been updated. Kindly review the revised GAF request for the dates <strong>${escapeHtml(displayCheckInDate)} to ${escapeHtml(displayCheckOutDate)}</strong> for your approval.</p><p>Please disregard the previous GAF request email for the same dates and unit. The attached form contains the most current and accurate information.</p>`
    : `<p>Kindly review the Guest Advise Form (GAF) request for <strong>${escapeHtml(formData.towerAndUnitNumber)}</strong>, dated from <strong>${escapeHtml(displayCheckInDate)} to ${escapeHtml(displayCheckOutDate)}</strong>, for your approval.</p>`;

  const urgentBlock = buildUrgentSameDayCallout(isUrgent);

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const gafTpl = await loadEmailTemplate("gaf-request");
  const emailContent = replacePlaceholders(
    gafTpl,
    withEmailShellStyleVars({
      emailHeaderLogo,
      testWarning: "",
      updateSuffix: isUpdate ? " (Updated)" : "",
      urgentBlock,
      checkInDate: escapeHtml(displayCheckInDate),
      checkOutDate: escapeHtml(displayCheckOutDate),
      bodyParagraphs,
    }),
  );

  const base64PDF = pdfBuffer ? toBase64(pdfBuffer) : null;

  const updatePrefix = isUpdate ? "UPDATED - " : "";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Monaco 2604 - GAF Request <mail@kamehomes.space>",
      to: [EMAIL_TO],
      // Never CC the guest on the GAF request email — per booking-workflow.mdc §3
      reply_to: EMAIL_REPLY_TO,
      subject: `${urgentPrefix}${updatePrefix}Monaco 2604 - GAF Request (${displayCheckInDate} to ${displayCheckOutDate})`,
      html: emailContent,
      ...(base64PDF
        ? {
            attachments: [
              {
                filename: `MONACO_2604_GAF-${formData.checkInDate}.pdf`,
                content: base64PDF,
                encoding: "base64",
              },
            ],
          }
        : {}),
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
  }

  console.log("Email sent successfully");
  return await res.json();
}

export async function sendPetEmail(
  formData: GuestFormData,
  pdfBuffer: Uint8Array | null,
  petImageUrl?: string,
  petVaccinationUrl?: string,
  isUpdate = false,
) {
  console.log(`Sending pet ${isUpdate ? "update" : "request"} email...`);
  console.log("Pet Image URL:", petImageUrl);
  console.log("Pet Vaccination URL:", petVaccinationUrl);

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const settings = await resolveAppSettings();
  const EMAIL_TO = settings.emailTo;
  const EMAIL_REPLY_TO = settings.emailReplyTo;

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY environment variable");
    throw new Error("Missing RESEND_API_KEY environment variable");
  }

  if (!EMAIL_TO) {
    console.error("Missing EMAIL_TO environment variable");
    throw new Error("Missing EMAIL_TO environment variable");
  }

  if (!EMAIL_REPLY_TO) {
    console.error("Missing EMAIL_REPLY_TO environment variable");
    throw new Error("Missing EMAIL_REPLY_TO environment variable");
  }

  const displayCheckInDate = formatDateForEmail(formData.checkInDate);
  const displayCheckOutDate = formatDateForEmail(formData.checkOutDate);
  const displayPetVaccinationDate = formatDateForEmail(
    formData.petVaccinationDate || "",
  );

  const isUrgent = isUrgentBooking(formData.checkInDate);
  const urgentPrefix = urgentEmailSubjectPrefix(isUrgent);

  if (isUrgent) {
    console.log("🚨 URGENT PET BOOKING DETECTED - Same-day check-in!");
  }

  const urgentBlock = buildUrgentSameDayCallout(isUrgent);

  const bodyParagraphs = isUpdate
    ? `<p>The pet information for our guest at <strong>${escapeHtml(formData.towerAndUnitNumber)}</strong> has been updated. We kindly request your approval for the revised pet request for their stay from <strong>${escapeHtml(displayCheckInDate)}</strong> to <strong>${escapeHtml(displayCheckOutDate)}</strong>.</p><p>Please disregard the previous pet request email for the same dates and unit. The attached documents contain the most current information.</p>`
    : `<p>May we kindly request approval for our guest to bring a pet during their stay at <strong>${escapeHtml(formData.towerAndUnitNumber)}</strong> during their stay from <strong>${escapeHtml(displayCheckInDate)}</strong> to <strong>${escapeHtml(displayCheckOutDate)}</strong>.</p>`;

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const petTpl = await loadEmailTemplate("pet-request");
  const emailContent = replacePlaceholders(
    petTpl,
    withEmailShellStyleVars({
      emailHeaderLogo,
      testWarning: "",
      updateSuffix: isUpdate ? " (Updated)" : "",
      urgentBlock,
      checkInDate: escapeHtml(displayCheckInDate),
      checkOutDate: escapeHtml(displayCheckOutDate),
      bodyParagraphs,
      petName: escapeHtml(formData.petName || "N/A"),
      petType: escapeHtml(formData.petType || "N/A"),
      petBreed: escapeHtml(formData.petBreed || "N/A"),
      petAge: escapeHtml(formData.petAge || "N/A"),
      petVaccinationDate: escapeHtml(displayPetVaccinationDate || "N/A"),
    }),
  );

  // Prepare attachments array
  const attachments: any[] = [];

  // Add Pet PDF if available
  if (pdfBuffer) {
    attachments.push({
      filename: `MONACO_2604_PET_FORM-${formData.checkInDate}.pdf`,
      content: toBase64(pdfBuffer),
      encoding: "base64",
    });
  }

  // Download and attach pet image if URL is provided
  if (petImageUrl) {
    const file = await downloadStorageFile(
      petImageUrl,
      `pet-image-${formData.checkInDate}.jpg`,
    );
    if (file) {
      attachments.push({
        filename: file.filename,
        content: toBase64(file.bytes),
        encoding: "base64",
      });
      console.log("Pet image attached successfully:", file.filename);
    }
  }

  // Download and attach pet vaccination if URL is provided
  if (petVaccinationUrl) {
    const file = await downloadStorageFile(
      petVaccinationUrl,
      `pet-vaccination-${formData.checkInDate}.jpg`,
    );
    if (file) {
      attachments.push({
        filename: file.filename,
        content: toBase64(file.bytes),
        encoding: "base64",
      });
      console.log(
        "Pet vaccination record attached successfully:",
        file.filename,
      );
    }
  }

  console.log(`Sending pet email with ${attachments.length} attachment(s)...`);
  attachments.forEach((att, index) => {
    console.log(
      `  Attachment ${index + 1}: ${att.filename} (${att.content.length} chars base64)`,
    );
  });

  const updatePrefix = isUpdate ? "UPDATED - " : "";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Monaco 2604 - Pet Request <mail@kamehomes.space>",
      to: [EMAIL_TO],
      // Never CC the guest on the Pet request email — per booking-workflow.mdc §3
      reply_to: EMAIL_REPLY_TO,
      subject: `${urgentPrefix}${updatePrefix}Monaco 2604 - Pet Request (${displayCheckInDate} to ${displayCheckOutDate})`,
      html: emailContent,
      attachments: attachments,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    console.error("Failed to send pet email:", error);
    throw new Error(`Failed to send pet email: ${JSON.stringify(error)}`);
  }

  console.log("Pet email sent successfully");
  return await res.json();
}

// ─── New Phase 3 emails ──────────────────────────────────────────────────────

async function getResendCredentials() {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const settings = await resolveAppSettings();
  const EMAIL_TO = settings.emailTo;
  const EMAIL_REPLY_TO = settings.emailReplyTo;

  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
  if (!EMAIL_TO) throw new Error("Missing EMAIL_TO");
  if (!EMAIL_REPLY_TO) throw new Error("Missing EMAIL_REPLY_TO");

  return { RESEND_API_KEY, EMAIL_TO, EMAIL_REPLY_TO };
}

function pesoFormat(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function getResendNewBookingNotifyCredentials() {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const settings = await resolveAppSettings();
  const EMAIL_REPLY_TO = settings.emailReplyTo;
  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
  if (!EMAIL_REPLY_TO) throw new Error("Missing EMAIL_REPLY_TO");
  return { RESEND_API_KEY, EMAIL_REPLY_TO };
}

function formatBookingSourceLabelForNotify(
  raw: string | null | undefined,
): string {
  const s = (raw ?? "").trim();
  if (/^airbnb$/i.test(s)) return "Airbnb";
  if (/^facebook$/i.test(s)) return "Facebook";
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Facebook";
}

function yesNo(v: boolean | null | undefined): string {
  return v ? "Yes ‼️" : "No";
}

function notifyDetailTableStyle(): string {
  return [
    "width:100%;table-layout:fixed;border:1px solid #e2e8f0;border-radius:16px;",
    "border-collapse:separate;border-spacing:0;overflow:hidden;font-size:14px;",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
    "margin:0 0 26px 0;",
  ].join("");
}

function notifyRow(
  label: string,
  valueHtml: string,
  withBottomBorder: boolean,
): string {
  const b = withBottomBorder ? "border-bottom:1px solid #e2e8f0;" : "";
  return `<tr>
  <td class="tbl-label" style="padding:12px 16px;background-color:#f8fafc;${b}font-weight:600;color:#475569;vertical-align:top;width:38%;">${label}</td>
  <td class="tbl-value" style="padding:12px 16px;background-color:#ffffff;${b}color:#333333;line-height:1.55;vertical-align:top;">${valueHtml}</td>
</tr>`;
}

function notifySectionTitle(text: string): string {
  return `<p class="section-label" style="margin:24px 0 10px 0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5f954c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">${text}</p>`;
}

function receiptVerdictEmailBadgeHtml(verdict: string | null | undefined): string {
  const label = formatReceiptVerdictLabel(verdict);
  const v = String(verdict ?? '').toLowerCase();
  let bg = '#f3f4f6';
  let color = '#374151';
  if (v === 'valid' || v === 'likely_valid') {
    bg = '#dcfce7';
    color = '#166534';
  } else if (v === 'unclear' || v === 'skipped') {
    bg = '#fef9c3';
    color = '#854d0e';
  } else if (v === 'invalid') {
    bg = '#fee2e2';
    color = '#991b1b';
  }
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:${bg};color:${color};">${escapeHtml(label)}</span>`;
}

function buildDownpaymentReceiptAiEmailSection(booking: GuestSubmission): string {
  const verdict = (booking as Record<string, unknown>).dp_receipt_ai_verdict as
    | string
    | null
    | undefined;
  const summary = String(
    (booking as Record<string, unknown>).dp_receipt_ai_summary ?? '',
  ).trim();
  if (!verdict && !summary) return '';

  const tblStyle = notifyDetailTableStyle();
  const rows = [
    notifyRow('Verdict', receiptVerdictEmailBadgeHtml(verdict), true),
    notifyRow('Summary', escapeHtml(summary || 'N/A'), false),
  ].join('');

  return [
    notifySectionTitle('Downpayment receipt AI check'),
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${tblStyle}">${rows}</table>`,
  ].join('\n');
}

function buildNewBookingRequestEmailBodyMain(
  booking: GuestSubmission,
  appOrigin: string,
): string {
  const nn = booking.number_of_nights;
  const nights =
    nn != null && Number.isFinite(Number(nn)) && Number(nn) >= 0
      ? Number(nn)
      : countStayNights(booking.check_in_date, booking.check_out_date);
  const pax =
    (booking.number_of_adults ?? 0) + (booking.number_of_children ?? 0);
  const displayCheckIn = formatDateForEmail(booking.check_in_date);
  const displayCheckOut = formatDateForEmail(booking.check_out_date);
  const tblStyle = notifyDetailTableStyle();

  const stayRows = [
    notifyRow("Check-in", escapeHtml(displayCheckIn), true),
    notifyRow("Check-out", escapeHtml(displayCheckOut), true),
    notifyRow("Number of nights", escapeHtml(String(nights)), true),
    notifyRow("Number of pax", escapeHtml(String(pax)), false),
  ].join("");

  const guestRows = [
    notifyRow("Facebook Name", escapeHtml(booking.guest_facebook_name), true),
    notifyRow(
      "Primary Guest Name",
      escapeHtml(booking.primary_guest_name),
      true,
    ),
    notifyRow("Address", escapeHtml(booking.guest_address), true),
    notifyRow("Phone Number", escapeHtml(booking.guest_phone_number), true),
    notifyRow("Email", escapeHtml(booking.guest_email), true),
    notifyRow(
      "Source",
      escapeHtml(formatBookingSourceLabelForNotify(booking.booking_source)),
      false,
    ),
  ].join("");

  const notableRows = [
    notifyRow(
      "Requires pay parking?",
      escapeHtml(yesNo(booking.need_parking)),
      true,
    ),
    notifyRow(
      "Requires pet approval",
      escapeHtml(yesNo(booking.has_pets)),
      true,
    ),
    notifyRow(
      "Requires surprise setup / room decor?",
      escapeHtml(yesNo(booking.guest_requests_surprise_decor)),
      false,
    ),
  ].join("");

  const bookingId = booking.id as string;
  const base = appOrigin.replace(/\/+$/, "");
  const adminUrl = `${base}/bookings/${encodeURIComponent(bookingId)}`;
  const cta = `<div class="cta-wrap" style="margin:28px 0 8px 0;text-align:center;">
  <a class="cta-btn" style="{{emailShellCtaBtnStyle}}" href="${escapeHtml(adminUrl)}" target="_blank" rel="noopener">View Booking Details</a>
</div>`;

  return [
    notifySectionTitle("Stay details"),
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${tblStyle}">${stayRows}</table>`,
    notifySectionTitle("Guest details"),
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${tblStyle}">${guestRows}</table>`,
    notifySectionTitle("Notable information"),
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${tblStyle}">${notableRows}</table>`,
    buildDownpaymentReceiptAiEmailSection(booking),
    cta,
  ].join("\n");
}

/**
 * **Owner / ops notify** — sent only to `EMAIL_REPLY_TO` when a guest saves the public form (`submit-form`).
 * Not a workflow transition email; failures are logged as non-fatal in `submit-form`.
 */
export async function sendNewBookingRequestNotify(booking: GuestSubmission) {
  const bookingId = booking.id as string | undefined;
  if (!bookingId)
    throw new Error("sendNewBookingRequestNotify: booking.id is required");

  console.log("Sending new booking request notify email to EMAIL_REPLY_TO...");

  const { RESEND_API_KEY, EMAIL_REPLY_TO } =
    await getResendNewBookingNotifyCredentials();
  const settings = await resolveAppSettings();
  const displayCheckInDate = formatDateForEmail(booking.check_in_date);
  const displayCheckOutDate = formatDateForEmail(booking.check_out_date);
  const unitLabel =
    String(booking.tower_and_unit_number ?? "").trim() || "Monaco 2604";

  const isUrgent = isUrgentBooking(booking.check_in_date);
  const urgentBlock = buildUrgentSameDayCallout(isUrgent);
  const urgentPrefix = urgentEmailSubjectPrefix(isUrgent);
  if (isUrgent) {
    console.log("🚨 URGENT same-day check-in — new booking request notify");
  }

  const emailBodyMainRaw = buildNewBookingRequestEmailBodyMain(
    booking,
    settings.publicGuestAppOrigin,
  );
  const emailBodyMain = replacePlaceholders(
    emailBodyMainRaw,
    withEmailShellStyleVars({}),
  );

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const tpl = await loadEmailTemplate("new-booking-request");
  const html = replacePlaceholders(
    tpl,
    withEmailShellStyleVars({
      emailHeaderLogo,
      testWarning: "",
      urgentBlock,
      /** Same string prepended to API `subject` and to `<title>` / `<h1>` in the template. */
      newBookingTitlePrefix: urgentPrefix,
      checkInDate: escapeHtml(displayCheckInDate),
      checkOutDate: escapeHtml(displayCheckOutDate),
      towerAndUnitNumber: escapeHtml(unitLabel),
      emailBodyMain,
    }),
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Monaco 2604 - Kame Home <mail@kamehomes.space>",
      to: [EMAIL_REPLY_TO],
      reply_to: booking.guest_email,
      subject: `${urgentPrefix}${unitLabel} - New Booking Request (${displayCheckInDate} to ${displayCheckOutDate})`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to send new booking request notify: ${JSON.stringify(err)}`,
    );
  }

  const body = (await res.json()) as { id?: string };
  console.log(
    "[new-booking-notify] Resend accepted message; id:",
    body?.id ?? "(no id in response)",
    "| to: EMAIL_REPLY_TO from env (check spam / Resend dashboard if inbox empty)",
  );
  return body;
}

/**
 * Booking acknowledgement — sent to the **guest** when moving PENDING_REVIEW → PENDING_GAF.
 * Confirms we received the form and are processing their GAF.
 */
export async function sendBookingAcknowledgement(booking: GuestSubmission) {
  console.log("Sending booking acknowledgement email to guest...");

  const { RESEND_API_KEY, EMAIL_REPLY_TO } = await getResendCredentials();
  const displayCheckInDate = formatDateForEmail(booking.check_in_date);
  const displayCheckOutDate = formatDateForEmail(booking.check_out_date);

  const isUrgent = isUrgentBooking(booking.check_in_date);
  const urgentBlock = buildUrgentSameDayCallout(isUrgent);
  if (isUrgent) {
    console.log("🚨 URGENT same-day check-in — booking acknowledgement");
  }

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const ackTpl = await loadEmailTemplate("booking-acknowledgement");
  const html = replacePlaceholders(
    ackTpl,
    withEmailShellStyleVars({
      emailHeaderLogo,
      testWarning: "",
      urgentBlock,
      guestFacebookName: escapeHtml(booking.guest_facebook_name),
      towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
      checkInDate: escapeHtml(displayCheckInDate),
      checkOutDate: escapeHtml(displayCheckOutDate),
    }),
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Monaco 2604 - Kame Home <mail@kamehomes.space>",
      to: [booking.guest_email],
      reply_to: EMAIL_REPLY_TO,
      subject: `Monaco 2604 - Booking Acknowledgement (${displayCheckInDate} to ${displayCheckOutDate})`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to send booking acknowledgement: ${JSON.stringify(err)}`,
    );
  }

  console.log("Booking acknowledgement email sent successfully");
  return await res.json();
}

/**
 * Ready for check-in — sent to the **guest** when transitioning to READY_FOR_CHECKIN.
 * Includes payment breakdown, important reminders, and any relevant approved documents as attachments:
 *   • Approved GAF PDF (always, if available)
 *   • Approved Pet PDF (if has_pets and available)
 *   • Parking endorsement (if need_parking and available)
 */
export async function sendReadyForCheckin(booking: GuestSubmission) {
  console.log("Sending ready-for-check-in email to guest...");

  const { RESEND_API_KEY, EMAIL_REPLY_TO } = await getResendCredentials();
  const displayCheckInDate = formatDateForEmail(booking.check_in_date);
  const displayCheckOutDate = formatDateForEmail(booking.check_out_date);

  const isUrgent = isUrgentBooking(booking.check_in_date);
  const urgentBlock = buildUrgentSameDayCallout(isUrgent);
  if (isUrgent) {
    console.log("🚨 URGENT same-day check-in — ready for check-in email");
  }

  const balance =
    booking.balance ??
    (booking.booking_rate ?? 0) - (booking.down_payment ?? 0);
  const balanceNum = Number(balance);
  const additionalGuestFee = Number(booking.guest_additional_fee ?? 0) || 0;
  const totalDueAtCheckin =
    (Number.isFinite(balanceNum) ? balanceNum : 0) +
    (Number(booking.security_deposit ?? 0) || 0) +
    (booking.need_parking ? Number(booking.parking_rate_guest ?? 0) || 0 : 0) +
    (booking.has_pets ? Number(booking.pet_fee ?? 0) || 0 : 0) +
    additionalGuestFee;
  const totalBalanceDue = pesoFormat(totalDueAtCheckin);
  const pax =
    (booking.number_of_adults || 0) + (booking.number_of_children || 0);
  const displayCheckInTime = escapeHtml(
    formatTimeForDisplay(booking.check_in_time, "2:00 PM"),
  );
  const displayCheckOutTime = escapeHtml(
    formatTimeForDisplay(booking.check_out_time, "11:00 AM"),
  );

  const parkingPaymentRow = booking.need_parking
    ? `
    <tr class="fee-addon-row">
      <td class="tbl-label" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;vertical-align:top;">Guest parking fee</td>
      <td class="tbl-num" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;text-align:right;color:#333333;vertical-align:top;">${pesoFormat(booking.parking_rate_guest as number | null)}</td>
      <td class="tbl-note" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;font-size:12px;color:#555555;line-height:1.45;vertical-align:top;"><em class="italic-note">Non-refundable; no rescheduling</em></td>
    </tr>
  `
    : "";

  const petPaymentRow = booking.has_pets
    ? `
    <tr class="fee-addon-row">
      <td class="tbl-label" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;vertical-align:top;">Pet fee</td>
      <td class="tbl-num" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;text-align:right;color:#333333;vertical-align:top;">${pesoFormat(booking.pet_fee as number | null)}</td>
      <td class="tbl-note" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;font-size:12px;color:#555555;line-height:1.45;vertical-align:top;"></td>
    </tr>
  `
    : "";

  const additionalFeeRow =
    additionalGuestFee > 0
      ? `
    <tr class="fee-addon-row">
      <td class="tbl-label" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;vertical-align:top;">Additional fee</td>
      <td class="tbl-num" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;text-align:right;color:#333333;vertical-align:top;">${pesoFormat(additionalGuestFee)}</td>
      <td class="tbl-note" style="padding:12px 16px;background-color:#ffffff;border-bottom:1px solid #e2e8f0;font-size:12px;color:#555555;line-height:1.45;vertical-align:top;">Early check-in, late check-out, surprise decor, etc.</td>
    </tr>
  `
      : "";

  const docReminderCardStyle =
    "padding:18px 20px;background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #5f954c;border-radius:16px;color:#334155;font-size:14px;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;";

  const documentReminderBodies: string[] = [
    '<strong style="color:#1e293b;font-weight:700;">Guest Advise Form (GAF)</strong> — Your GAF has been approved. No need to print it! Simply present it at the guard house upon arrival and to the lobby receptionist during registration.',
  ];
  if (booking.need_parking) {
    documentReminderBodies.push(
      '<strong style="color:#1e293b;font-weight:700;">Parking</strong> — Your parking slot is confirmed. The guest parking fee is <strong style="color:#1e293b;font-weight:700;">non-refundable</strong>, and once confirmed your parking dates <strong style="color:#1e293b;font-weight:700;">cannot be rescheduled</strong>.',
    );
  }
  if (booking.has_pets) {
    documentReminderBodies.push(
      '<strong style="color:#1e293b;font-weight:700;">Pet</strong> — Your pet has been approved for this stay.',
    );
  }
  const documentReminderLis = documentReminderBodies
    .map((body, idx) => {
      const isLast = idx === documentReminderBodies.length - 1;
      const margin = isLast ? "margin:0" : "margin:0 0 12px 0";
      return `<li class="doc-reminders-card__li" style="${margin};padding:0;color:#334155;">${body}</li>`;
    })
    .join("");

  const documentRemindersSection = `
<table role="presentation" class="doc-reminders-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;margin:0;">
  <tr>
    <td class="doc-reminders-card__cell" style="${docReminderCardStyle}">
      <ul class="doc-reminders-card__list" style="margin:0;padding:0 0 0 20px;list-style-type:disc;">
        ${documentReminderLis}
      </ul>
    </td>
  </tr>
</table>`;

  // TEMP: Skip `ready-for-checkin-house-rules` (Important reminders table) to keep
  // final HTML under Gmail's ~102KB clip threshold. Re-enable by restoring the
  // loadEmailTemplate + replacePlaceholders block and `{{houseRulesSection}}` in
  // `ready-for-checkin.html`.
  const houseRulesSection = "";

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const settings = await resolveAppSettings();
  const qrAsset = await resolveReadyForCheckinPaymentQr(settings);
  const paymentQrImageUrl =
    qrAsset.bytes && qrAsset.bytes.length > 0
      ? `cid:${READY_FOR_CHECKIN_PAYMENT_QR_CONTENT_ID}`
      : escapeHtml(qrAsset.fallbackUrl);
  const rfiTpl = await loadEmailTemplate("ready-for-checkin");
  const html = replacePlaceholders(
    rfiTpl,
    withEmailShellStyleVars({
      emailHeaderLogo,
      testWarning: "",
      urgentBlock,
      checkInDate: escapeHtml(displayCheckInDate),
      checkOutDate: escapeHtml(displayCheckOutDate),
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
      additionalFeeRow,
      paymentQrImageUrl,
    }),
  );

  // ── Build attachments ─────────────────────────────────────────────────────────
  const attachments: ResendAttachment[] = [];

  if (qrAsset.bytes && qrAsset.bytes.length > 0) {
    attachments.push({
      filename: qrAsset.filename,
      content: toBase64(qrAsset.bytes),
      encoding: "base64",
      content_type: qrAsset.contentType,
      content_id: READY_FOR_CHECKIN_PAYMENT_QR_CONTENT_ID,
    });
    console.log(
      "[readyForCheckin] Inline payment QR (CID attachment)",
    );
  }

  // Approved GAF PDF — always attach if available
  if (booking.approved_gaf_pdf_url) {
    console.log("[readyForCheckin] Downloading approved GAF PDF...");
    const file = await downloadStorageFile(
      booking.approved_gaf_pdf_url,
      `approved-gaf-${booking.check_in_date}.pdf`,
    );
    if (file) {
      attachments.push({
        filename: file.filename,
        content: toBase64(file.bytes),
        encoding: "base64",
      });
      console.log(
        "[readyForCheckin] Attached approved GAF PDF:",
        file.filename,
      );
    }
  }

  // Approved Pet PDF — attach if booking has pets
  if (booking.has_pets && booking.approved_pet_pdf_url) {
    console.log("[readyForCheckin] Downloading approved pet PDF...");
    const file = await downloadStorageFile(
      booking.approved_pet_pdf_url,
      `approved-pet-form-${booking.check_in_date}.pdf`,
    );
    if (file) {
      attachments.push({
        filename: file.filename,
        content: toBase64(file.bytes),
        encoding: "base64",
      });
      console.log(
        "[readyForCheckin] Attached approved pet PDF:",
        file.filename,
      );
    }
  }

  // Parking endorsement — attach if booking has parking
  if (booking.need_parking && booking.parking_endorsement_url) {
    console.log("[readyForCheckin] Downloading parking endorsement...");
    const file = await downloadStorageFile(
      booking.parking_endorsement_url,
      `parking-endorsement-${booking.check_in_date}.pdf`,
    );
    if (file) {
      attachments.push({
        filename: file.filename,
        content: toBase64(file.bytes),
        encoding: "base64",
      });
      console.log(
        "[readyForCheckin] Attached parking endorsement:",
        file.filename,
      );
    }
  }

  console.log(
    `[readyForCheckin] Sending email with ${attachments.length} attachment(s)...`,
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Monaco 2604 - Kame Home <mail@kamehomes.space>",
      to: [booking.guest_email],
      reply_to: EMAIL_REPLY_TO,
      subject: `Monaco 2604 - Check-in Details (${displayCheckInDate} to ${displayCheckOutDate})`,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to send ready-for-check-in email: ${JSON.stringify(err)}`,
    );
  }

  console.log("Ready-for-check-in email sent successfully");
  return await res.json();
}

/**
 * Parking broadcast — BCC to all addresses in PARKING_OWNER_EMAILS env var.
 * When `options.to` is set, sends only to that address (no BCC list).
 * Sent when transitioning PENDING_REVIEW → PENDING_GAF and `need_parking` is true.
 */
export async function sendParkingBroadcast(
  booking: GuestSubmission,
  options?: { to?: string },
) {
  console.log("Sending parking broadcast email...");

  const { RESEND_API_KEY, EMAIL_REPLY_TO } = await getResendCredentials();
  const settings = await resolveAppSettings();

  const singleTo = (options?.to ?? "").trim();
  const bccEmails = settings.parkingOwnerEmails;

  let toRecipients: string[];
  let bccRecipients: string[] | undefined;

  if (singleTo) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(singleTo)) {
      throw new Error("Invalid parking owner email address");
    }
    toRecipients = [singleTo];
    bccRecipients = undefined;
  } else {
    if (bccEmails.length === 0) {
      console.warn(
        "PARKING_OWNER_EMAILS is not set — skipping parking broadcast",
      );
      return null;
    }
    toRecipients = [bccEmails[0]!];
    bccRecipients = bccEmails.slice(1);
  }
  const parkingCheckIn =
    String(booking.parking_check_in_date ?? "").trim() || booking.check_in_date;
  const parkingCheckOut =
    String(booking.parking_check_out_date ?? "").trim() ||
    booking.check_out_date;
  const displayCheckInDate = formatDateForEmail(parkingCheckIn);
  const displayCheckOutDate = formatDateForEmail(parkingCheckOut);

  const isUrgent = isUrgentBooking(parkingCheckIn);
  const urgentPrefix = urgentEmailSubjectPrefix(isUrgent);
  const urgentBlock = buildUrgentSameDayCallout(isUrgent);
  if (isUrgent) {
    console.log("🚨 URGENT same-day check-in — parking broadcast");
  }

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const parkTpl = await loadEmailTemplate("parking-broadcast");
  const unitLabel =
    String(booking.tower_and_unit_number ?? "").trim() || "Monaco 2604";
  const guestName = String(booking.primary_guest_name ?? "").trim() || "N/A";
  const carBrandModel = String(booking.car_brand_model ?? "").trim() || "N/A";
  const carColor = String(booking.car_color ?? "").trim() || "N/A";
  const carPlate = String(booking.car_plate_number ?? "").trim() || "N/A";
  const bookingVehicleCopyText = escapeHtml(
    buildParkingBroadcastCopyText({
      unit: unitLabel,
      checkInDate: displayCheckInDate,
      checkOutDate: displayCheckOutDate,
      guestName,
      carBrandModel,
      carColor,
      carPlate,
    }),
  );
  const html = replacePlaceholders(
    parkTpl,
    withEmailShellStyleVars({
      emailHeaderLogo,
      testWarning: "",
      urgentBlock,
      checkInDate: escapeHtml(displayCheckInDate),
      checkOutDate: escapeHtml(displayCheckOutDate),
      towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
      checkInTime: escapeHtml(
        formatTimeForDisplay(booking.check_in_time, "2:00 PM"),
      ),
      checkOutTime: escapeHtml(
        formatTimeForDisplay(booking.check_out_time, "11:00 AM"),
      ),
      carBrandModel: escapeHtml(carBrandModel),
      carColor: escapeHtml(carColor),
      carPlate: escapeHtml(carPlate),
      primaryGuestName: escapeHtml(guestName),
      bookingVehicleCopyText,
    }),
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Monaco 2604 - Kame Home <mail@kamehomes.space>",
      to: toRecipients,
      ...(bccRecipients && bccRecipients.length > 0
        ? { bcc: bccRecipients }
        : {}),
      reply_to: EMAIL_REPLY_TO,
      subject: `${urgentPrefix}Monaco 2604 - Parking Request (${displayCheckInDate} to ${displayCheckOutDate})`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed to send parking broadcast: ${JSON.stringify(err)}`);
  }

  console.log("Parking broadcast email sent successfully");
  return await res.json();
}

/**
 * Check-out & SD Refund Details — email guest a link to `/sd-form` (security deposit refund stepper).
 * Sent from `sd-refund-cron` when the pre-checkout **lead** window opens (independent of balance settlement),
 * on `READY_FOR_CHECKIN` → `READY_FOR_CHECKOUT` transitions when enabled, and via admin re-send.
 */
export async function sendSdRefundFormRequest(booking: GuestSubmission) {
  console.log("Sending SD refund form request email to guest...");

  const { RESEND_API_KEY, EMAIL_REPLY_TO } = await getResendCredentials();
  const settings = await resolveAppSettings();
  const displayCheckInDate = formatDateForEmail(booking.check_in_date);
  const displayCheckOutDate = formatDateForEmail(booking.check_out_date);
  const unitLabel =
    String(booking.tower_and_unit_number ?? "").trim() || "Monaco 2604";

  const isUrgent = isUrgentBooking(booking.check_in_date);
  const urgentBlock = buildUrgentSameDayCallout(isUrgent);
  if (isUrgent) {
    console.log("🚨 URGENT same-day check-in — SD refund form request");
  }

  const bookingId = booking.id as string;
  if (!bookingId)
    throw new Error("sendSdRefundFormRequest: booking.id is required");

  const sdFormUrl = `${settings.publicGuestAppOrigin.replace(/\/+$/, "")}/sd-form?bookingId=${encodeURIComponent(bookingId)}`;

  const emailHeaderLogo = await emailHeaderLogoHtml();
  const tpl = await loadEmailTemplate("sd-refund-form-request");
  const html = replacePlaceholders(
    tpl,
    withEmailShellStyleVars({
      emailHeaderLogo,
      testWarning: "",
      urgentBlock,
      guestFacebookName: escapeHtml(booking.guest_facebook_name),
      towerAndUnitNumber: escapeHtml(booking.tower_and_unit_number),
      checkInDate: escapeHtml(displayCheckInDate),
      checkOutDate: escapeHtml(displayCheckOutDate),
      sdFormUrl,
      securityDepositFormatted: pesoFormat(
        booking.security_deposit as number | null,
      ),
    }),
  );

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Monaco 2604 - Kame Home <mail@kamehomes.space>",
      to: [booking.guest_email],
      reply_to: EMAIL_REPLY_TO,
      subject: `${unitLabel} - Check-out & SD Refund Details (${displayCheckInDate} to ${displayCheckOutDate})`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(
      `Failed to send SD refund form request: ${JSON.stringify(err)}`,
    );
  }

  console.log("SD refund form request email sent successfully");
  return await res.json();
}
