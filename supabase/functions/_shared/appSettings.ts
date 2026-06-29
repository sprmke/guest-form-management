/**
 * Resolved operator settings: DB (`app_settings`) with env fallbacks.
 * Secrets (API keys, service accounts) are never stored here.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { DEFAULT_EMAIL_LOGO_URL } from "./renderEmailHtml.ts";

type AppSettingsRow = {
  id: number;
  updated_at: string;
  email_to: string | null;
  email_reply_to: string | null;
  parking_owner_emails: string | null;
  sd_refund_cron_email_lead_minutes: number | null;
  sd_refund_cron_max_checkout_age_days: number | null;
  public_guest_app_origin: string | null;
  facebook_reviews_url: string | null;
  email_logo_url: string | null;
  default_parking_rate_guest: number | null;
  gcash_name: string | null;
  gcash_number: string | null;
  gcash_qr_image_url: string | null;
  gaf_unit_owner: string | null;
  gaf_tower_and_unit_number: string | null;
  gaf_guests_onsite_contact_person: string | null;
  gaf_owner_contact_number: string | null;
  gaf_unit_owner_signature_url: string | null;
};

const DEFAULT_GAF_UNIT_OWNER = "Arianna Perez";
const DEFAULT_GAF_TOWER_AND_UNIT_NUMBER = "Monaco 2604";
const DEFAULT_GAF_GUESTS_ONSITE_CONTACT_PERSON = "Arianna Perez";
const DEFAULT_GAF_OWNER_CONTACT_NUMBER = "0962 541 2941";

export type GafDetailsResolved = {
  gafUnitOwner: string;
  gafTowerAndUnitNumber: string;
  gafGuestsOnsiteContactPerson: string;
  gafOwnerContactNumber: string;
  gafUnitOwnerSignatureUrl: string;
};

const DEFAULT_GCASH_NAME = "Arianna Perez";
const DEFAULT_GCASH_NUMBER = "0962 564 7541";
/** Path segment after public guest app origin (no leading slash — avoids Supabase CLI false import scan). */
export const DEFAULT_GCASH_QR_RELATIVE_PATH =
  "images/kame-home-gcash-qr-payment.jpg";

export type AppSettingsResolved = {
  emailTo: string;
  emailReplyTo: string;
  parkingOwnerEmails: string[];
  sdRefundCronEmailLeadMinutes: number;
  sdRefundCronMaxCheckoutAgeDays: number;
  publicGuestAppOrigin: string;
  facebookReviewsUrl: string;
  emailLogoUrl: string;
  defaultParkingRateGuest: number;
  gcashName: string;
  gcashNumber: string;
  gcashQrImageUrl: string;
} & GafDetailsResolved;

export type GuestPaymentInfoDto = {
  gcashName: string;
  gcashNumber: string;
  gcashQrImageUrl: string;
} & GafDetailsResolved;

export type AppSettingsFieldSource = "db" | "env" | "default";

export type AppSettingsSecretsStatus = {
  resendApiKeyConfigured: boolean;
  googleServiceAccountConfigured: boolean;
  googleCalendarIdConfigured: boolean;
  googleSpreadsheetIdConfigured: boolean;
  telegramBotTokenConfigured: boolean;
  telegramChatIdConfigured: boolean;
  telegramStaffChatIdConfigured: boolean;
  telegramAdminChatIdConfigured: boolean;
  telegramFinanceChatIdConfigured: boolean;
  telegramMaintenanceChatIdConfigured: boolean;
  gmailEncryptionKeyConfigured: boolean;
  gmailWebClientConfigured: boolean;
  geminiApiKeyConfigured: boolean;
  groqApiKeyConfigured: boolean;
};

export type AppSettingsDto = AppSettingsResolved & {
  updatedAt: string | null;
  fieldSources: Record<keyof AppSettingsResolved, AppSettingsFieldSource>;
  secretsStatus: AppSettingsSecretsStatus;
};

const CACHE_TTL_MS = 30_000;
let cache: { at: number; row: AppSettingsRow | null } | null = null;

export function invalidateAppSettingsCache(): void {
  cache = null;
}

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

async function loadSettingsRow(): Promise<AppSettingsRow | null> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.row;
  }

  const { data, error } = await supabaseAdmin()
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("[appSettings] load failed, using env only:", error.message);
    cache = { at: now, row: null };
    return null;
  }

  cache = { at: now, row: data as AppSettingsRow | null };
  return cache.row;
}

function trimOrEmpty(v: string | null | undefined): string {
  return (v ?? "").trim();
}

function pickString(
  dbVal: string | null | undefined,
  envKey: string,
): { value: string; source: AppSettingsFieldSource } {
  const fromDb = trimOrEmpty(dbVal);
  if (fromDb) return { value: fromDb, source: "db" };
  if (envKey.trim()) {
    const fromEnv = trimOrEmpty(Deno.env.get(envKey));
    if (fromEnv) return { value: fromEnv, source: "env" };
  }
  return { value: "", source: "default" };
}

/** DB-only optional URL (no env fallback). */
function pickOptionalUrl(dbVal: string | null | undefined): {
  value: string;
  source: AppSettingsFieldSource;
} {
  const fromDb = trimOrEmpty(dbVal);
  if (fromDb) return { value: fromDb, source: "db" };
  return { value: "", source: "default" };
}

function pickInt(
  dbVal: number | null | undefined,
  envKey: string,
  fallback: number,
  min: number,
  max: number,
): { value: number; source: AppSettingsFieldSource } {
  if (dbVal != null && Number.isFinite(Number(dbVal))) {
    const n = Math.floor(Number(dbVal));
    if (n >= min && n <= max) {
      return { value: n, source: "db" };
    }
  }
  const raw = trimOrEmpty(Deno.env.get(envKey));
  if (raw) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= min && n <= max) {
      return { value: n, source: "env" };
    }
  }
  return { value: fallback, source: "default" };
}

function pickMoney(
  dbVal: number | null | undefined,
  fallback: number,
): { value: number; source: AppSettingsFieldSource } {
  if (dbVal != null) {
    const n = Number(dbVal);
    if (Number.isFinite(n) && n > 0) {
      return { value: n, source: "db" };
    }
  }
  return { value: fallback, source: "default" };
}

function pickGafString(
  dbVal: string | null | undefined,
  fallback: string,
): { value: string; source: AppSettingsFieldSource } {
  const fromDb = trimOrEmpty(dbVal);
  if (fromDb) return { value: fromDb, source: "db" };
  return { value: fallback, source: "default" };
}

function resolveGafDetailsFromRow(row: AppSettingsRow | null): {
  resolved: GafDetailsResolved;
  picks: Record<
    keyof GafDetailsResolved,
    { value: string; source: AppSettingsFieldSource }
  >;
} {
  const unitOwner = pickGafString(row?.gaf_unit_owner, DEFAULT_GAF_UNIT_OWNER);
  const tower = pickGafString(
    row?.gaf_tower_and_unit_number,
    DEFAULT_GAF_TOWER_AND_UNIT_NUMBER,
  );
  const guestsOnsite = pickGafString(
    row?.gaf_guests_onsite_contact_person,
    DEFAULT_GAF_GUESTS_ONSITE_CONTACT_PERSON,
  );
  const contact = pickGafString(
    row?.gaf_owner_contact_number,
    DEFAULT_GAF_OWNER_CONTACT_NUMBER,
  );
  const signatureUrl = pickOptionalUrl(row?.gaf_unit_owner_signature_url);

  return {
    resolved: {
      gafUnitOwner: unitOwner.value,
      gafTowerAndUnitNumber: tower.value,
      gafGuestsOnsiteContactPerson: guestsOnsite.value,
      gafOwnerContactNumber: contact.value,
      gafUnitOwnerSignatureUrl: signatureUrl.value,
    },
    picks: {
      gafUnitOwner: unitOwner,
      gafTowerAndUnitNumber: tower,
      gafGuestsOnsiteContactPerson: guestsOnsite,
      gafOwnerContactNumber: contact,
      gafUnitOwnerSignatureUrl: {
        value: signatureUrl.value,
        source: signatureUrl.source,
      },
    },
  };
}

function parseCommaSeparatedEmails(raw: string): string[] {
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function parseCommaSeparatedEmailsLower(raw: string): string[] {
  return parseCommaSeparatedEmails(raw).map((e) => e.toLowerCase());
}

function buildSecretsStatus(): AppSettingsSecretsStatus {
  return {
    resendApiKeyConfigured: !!trimOrEmpty(Deno.env.get("RESEND_API_KEY")),
    googleServiceAccountConfigured: !!trimOrEmpty(
      Deno.env.get("GOOGLE_SERVICE_ACCOUNT"),
    ),
    googleCalendarIdConfigured: !!trimOrEmpty(
      Deno.env.get("GOOGLE_CALENDAR_ID"),
    ),
    googleSpreadsheetIdConfigured: !!trimOrEmpty(
      Deno.env.get("GOOGLE_SPREADSHEET_ID"),
    ),
    telegramBotTokenConfigured: !!trimOrEmpty(
      Deno.env.get("TELEGRAM_BOT_TOKEN"),
    ),
    telegramChatIdConfigured: !!trimOrEmpty(Deno.env.get("TELEGRAM_CHAT_ID")),
    telegramStaffChatIdConfigured: !!trimOrEmpty(
      Deno.env.get("TELEGRAM_STAFF_CHAT_ID"),
    ),
    telegramAdminChatIdConfigured: !!trimOrEmpty(
      Deno.env.get("TELEGRAM_ADMIN_CHAT_ID"),
    ),
    telegramFinanceChatIdConfigured: !!trimOrEmpty(
      Deno.env.get("TELEGRAM_FINANCE_CHAT_ID"),
    ),
    telegramMaintenanceChatIdConfigured: !!trimOrEmpty(
      Deno.env.get("TELEGRAM_MAINTENANCE_CHAT_ID"),
    ),
    gmailEncryptionKeyConfigured: !!trimOrEmpty(
      Deno.env.get("GMAIL_OAUTH_TOKEN_ENCRYPTION_KEY"),
    ),
    gmailWebClientConfigured: !!trimOrEmpty(
      Deno.env.get("GMAIL_API_WEB_CLIENT_JSON"),
    ),
    geminiApiKeyConfigured:
      !!trimOrEmpty(Deno.env.get("GEMINI_API_KEYS")) ||
      !!trimOrEmpty(Deno.env.get("GEMINI_API_KEY")),
    groqApiKeyConfigured: !!trimOrEmpty(Deno.env.get("GROQ_API_KEY")),
  };
}

type SettingsFieldPicks = {
  emailTo: ReturnType<typeof pickString>;
  emailReplyTo: ReturnType<typeof pickString>;
  parkingRaw: ReturnType<typeof pickString>;
  lead: ReturnType<typeof pickInt>;
  maxAge: ReturnType<typeof pickInt>;
  origin: ReturnType<typeof pickString>;
  facebook: ReturnType<typeof pickString>;
  logo: ReturnType<typeof pickString>;
  parkingRate: ReturnType<typeof pickMoney>;
  gcashName: ReturnType<typeof pickString>;
  gcashNumber: ReturnType<typeof pickString>;
  gcashQr: ReturnType<typeof pickString>;
  originBase: string;
  gaf: ReturnType<typeof resolveGafDetailsFromRow>;
};

function pickSettingsFieldsFromRow(
  row: AppSettingsRow | null,
): SettingsFieldPicks {
  const emailTo = pickString(row?.email_to, "EMAIL_TO");
  const emailReplyTo = pickString(row?.email_reply_to, "EMAIL_REPLY_TO");
  const parkingRaw = pickString(
    row?.parking_owner_emails,
    "PARKING_OWNER_EMAILS",
  );
  const lead = pickInt(
    row?.sd_refund_cron_email_lead_minutes,
    "SD_REFUND_CRON_EMAIL_LEAD_MINUTES",
    120,
    0,
    10080,
  );
  const maxAge = pickInt(
    row?.sd_refund_cron_max_checkout_age_days,
    "SD_REFUND_CRON_MAX_CHECKOUT_AGE_DAYS",
    21,
    0,
    365,
  );
  const origin = pickString(
    row?.public_guest_app_origin,
    "PUBLIC_GUEST_APP_ORIGIN",
  );
  const facebook = pickString(
    row?.facebook_reviews_url,
    "FACEBOOK_REVIEWS_URL",
  );
  const logo = pickString(row?.email_logo_url, "EMAIL_LOGO_URL");
  const parkingRate = pickMoney(row?.default_parking_rate_guest, 400);
  const gcashName = pickString(row?.gcash_name, "GCASH_NAME");
  const gcashNumber = pickString(row?.gcash_number, "GCASH_NUMBER");
  const gcashQr = pickString(row?.gcash_qr_image_url, "GCASH_QR_IMAGE_URL");
  const originBase = (origin.value || "https://kamehomes.space").replace(
    /\/+$/,
    "",
  );
  const gaf = resolveGafDetailsFromRow(row);

  return {
    emailTo,
    emailReplyTo,
    parkingRaw,
    lead,
    maxAge,
    origin,
    facebook,
    logo,
    parkingRate,
    gcashName,
    gcashNumber,
    gcashQr,
    originBase,
    gaf,
  };
}

export async function resolveAppSettings(): Promise<AppSettingsResolved> {
  const row = await loadSettingsRow();
  const {
    emailTo,
    emailReplyTo,
    parkingRaw,
    lead,
    maxAge,
    origin,
    facebook,
    logo,
    parkingRate,
    gcashName,
    gcashNumber,
    gcashQr,
    originBase,
    gaf,
  } = pickSettingsFieldsFromRow(row);

  return {
    emailTo: emailTo.value,
    emailReplyTo: emailReplyTo.value,
    parkingOwnerEmails: parseCommaSeparatedEmails(parkingRaw.value),
    sdRefundCronEmailLeadMinutes: lead.value,
    sdRefundCronMaxCheckoutAgeDays: maxAge.value,
    publicGuestAppOrigin: origin.value || "https://kamehomes.space",
    facebookReviewsUrl: facebook.value || "https://www.facebook.com",
    emailLogoUrl: logo.value || DEFAULT_EMAIL_LOGO_URL,
    defaultParkingRateGuest: parkingRate.value,
    gcashName: gcashName.value || DEFAULT_GCASH_NAME,
    gcashNumber: formatGcashNumberDisplay(
      gcashNumber.value || DEFAULT_GCASH_NUMBER,
    ),
    gcashQrImageUrl:
      gcashQr.value || `${originBase}/${DEFAULT_GCASH_QR_RELATIVE_PATH}`,
    ...gaf.resolved,
  };
}

export async function serializeGuestPaymentInfo(): Promise<GuestPaymentInfoDto> {
  const s = await resolveAppSettings();
  return {
    gcashName: s.gcashName,
    gcashNumber: s.gcashNumber,
    gcashQrImageUrl: s.gcashQrImageUrl,
    gafUnitOwner: s.gafUnitOwner,
    gafTowerAndUnitNumber: s.gafTowerAndUnitNumber,
    gafGuestsOnsiteContactPerson: s.gafGuestsOnsiteContactPerson,
    gafOwnerContactNumber: s.gafOwnerContactNumber,
  };
}

/** Gmail GAF/pet approval replies must match Documents Approver (`EMAIL_TO`) when set. */
export async function getGmailApprovalSenderAllowList(): Promise<string[]> {
  const s = await resolveAppSettings();
  return parseCommaSeparatedEmailsLower(s.emailTo);
}

export async function serializeAppSettingsForAdmin(): Promise<AppSettingsDto> {
  const row = await loadSettingsRow();
  const resolved = await resolveAppSettings();
  const {
    emailTo,
    emailReplyTo,
    parkingRaw,
    lead,
    maxAge,
    origin,
    facebook,
    logo,
    parkingRate,
    gcashName,
    gcashNumber,
    gcashQr,
    originBase,
    gaf,
  } = pickSettingsFieldsFromRow(row);
  const defaultGcashQrUrl = `${originBase}/${DEFAULT_GCASH_QR_RELATIVE_PATH}`;

  const listSource = (
    items: string[],
    rawPick: { source: AppSettingsFieldSource },
  ): AppSettingsFieldSource => {
    if (items.length === 0) return "default";
    return rawPick.source === "default" ? "env" : rawPick.source;
  };

  const urlSource = (
    pick: { value: string; source: AppSettingsFieldSource },
    resolvedDefault: string,
    resolved: string,
  ): AppSettingsFieldSource => {
    if (pick.source === "db") return "db";
    if (pick.source === "env") return "env";
    if (resolved !== resolvedDefault) return "default";
    return "default";
  };

  return {
    ...resolved,
    updatedAt: row?.updated_at ?? null,
    fieldSources: {
      emailTo: resolved.emailTo
        ? emailTo.source === "default"
          ? "env"
          : emailTo.source
        : "default",
      emailReplyTo: resolved.emailReplyTo
        ? emailReplyTo.source === "default"
          ? "env"
          : emailReplyTo.source
        : "default",
      parkingOwnerEmails: listSource(resolved.parkingOwnerEmails, parkingRaw),
      sdRefundCronEmailLeadMinutes: lead.source,
      sdRefundCronMaxCheckoutAgeDays: maxAge.source,
      publicGuestAppOrigin: urlSource(
        origin,
        "https://kamehomes.space",
        resolved.publicGuestAppOrigin,
      ),
      facebookReviewsUrl: urlSource(
        facebook,
        "https://www.facebook.com",
        resolved.facebookReviewsUrl,
      ),
      emailLogoUrl: urlSource(
        logo,
        DEFAULT_EMAIL_LOGO_URL,
        resolved.emailLogoUrl,
      ),
      defaultParkingRateGuest: parkingRate.source,
      gcashName:
        gcashName.source === "db"
          ? "db"
          : trimOrEmpty(Deno.env.get("GCASH_NAME"))
            ? "env"
            : "default",
      gcashNumber:
        gcashNumber.source === "db"
          ? "db"
          : trimOrEmpty(Deno.env.get("GCASH_NUMBER"))
            ? "env"
            : "default",
      gcashQrImageUrl: urlSource(
        gcashQr,
        defaultGcashQrUrl,
        resolved.gcashQrImageUrl,
      ),
      gafUnitOwner: gaf.picks.gafUnitOwner.source,
      gafTowerAndUnitNumber: gaf.picks.gafTowerAndUnitNumber.source,
      gafGuestsOnsiteContactPerson:
        gaf.picks.gafGuestsOnsiteContactPerson.source,
      gafOwnerContactNumber: gaf.picks.gafOwnerContactNumber.source,
      gafUnitOwnerSignatureUrl: gaf.picks.gafUnitOwnerSignatureUrl.source,
    },
    secretsStatus: buildSecretsStatus(),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmailList(raw: string, label: string): string | null {
  const parts = parseCommaSeparatedEmails(raw);
  if (parts.length === 0) return null;
  for (const e of parts) {
    if (!EMAIL_RE.test(e)) return `Invalid ${label} address: ${e}`;
  }
  return null;
}

export function validateOptionalEmail(
  raw: string,
  label: string,
): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (!EMAIL_RE.test(v)) return `Invalid ${label}`;
  return null;
}

export function validateOptionalUrl(raw: string, label: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return `${label} must use http or https`;
    }
  } catch {
    return `Invalid ${label} URL`;
  }
  return null;
}

export function validateOptionalOrigin(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return "Guest app origin must use http or https";
    }
    if (u.pathname !== "/" || u.search || u.hash) {
      return "Guest app origin should be scheme + host only (no path)";
    }
  } catch {
    return "Invalid guest app origin URL";
  }
  return null;
}

export function formatGcashNumberDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return raw.trim();
}

export function validateGcashName(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.length > 120) return "GCash name is too long (max 120 characters)";
  return null;
}

export function validateGcashNumber(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    return "GCash number must be 10–11 digits";
  }
  if (
    !digits.startsWith("09") &&
    !(digits.length === 10 && digits.startsWith("9"))
  ) {
    return "GCash number should start with 09";
  }
  return null;
}

export function validateGafTextField(
  raw: string,
  label: string,
  maxLen = 120,
): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.length > maxLen)
    return `${label} is too long (max ${maxLen} characters)`;
  return null;
}

export function validateGafContactNumber(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.length > 40)
    return "Owner contact number is too long (max 40 characters)";
  const digits = v.replace(/\D/g, "");
  if (digits.length > 0 && digits.length < 7) {
    return "Owner contact number looks too short";
  }
  return null;
}

/** Apply operator GAF defaults — server always wins over client-submitted values. */
export async function applyGafDefaultsToFormData<
  T extends Record<string, unknown>,
>(data: T): Promise<T> {
  const s = await resolveAppSettings();
  return {
    ...data,
    unitOwner: s.gafUnitOwner,
    towerAndUnitNumber: s.gafTowerAndUnitNumber,
    ownerOnsiteContactPerson: s.gafGuestsOnsiteContactPerson,
    ownerContactNumber: s.gafOwnerContactNumber,
  };
}
