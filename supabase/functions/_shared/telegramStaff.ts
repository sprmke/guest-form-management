/**
 * Telegram staff/cleaner daily booking summary.
 * Sends active today's bookings (check-ins and in-house multi-night stays) + next 3 days to the staff Telegram group.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { DatabaseService } from './databaseService.ts';
import {
  bookingOccupiesNight,
  manilaTodayYmd,
  normalizeBookingDateToYmd,
} from './calendarAvailabilityManila.ts';
import { normalizeTelegramChatId } from './telegramMarketing.ts';
import { formatTimeForDisplay, DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME } from './utils.ts';
import { computeTotalGuestBalanceFromBooking } from './totalGuestBalance.ts';

export const DEFAULT_STAFF_NO_BOOKINGS_TEMPLATE =
  '📋 No bookings for today.\n\n' +
  'Kindly do a general cleaning, especially the following items:\n\n' +
  '* Clean the aircon filter\n' +
  '* Clean the tower fan\n' +
  '* Clean behind the sofa\n' +
  '* Clean the exhaust fan\n' +
  '* Remove dust and cobwebs from the ceiling\n' +
  '* Clean the balcony (including underneath the grass)\n' +
  '* Clean the bathroom tiles & shower head\n' +
  '* Clean the walls and cabinets\n\n' +
  'Next Bookings\n' +
  '{{next_bookings}}';

export type TelegramStaffSettings = {
  id: number;
  enabled: boolean;
  notify_on_same_day_checkin: boolean;
  daily_summary_template: string;
  daily_summary_no_bookings_template: string;
  same_day_checkin_template: string;
  daily_summary_time_manila: unknown;
  updated_at: string;
};

export type StaffManilaTimeSlot = { hour: number; minute: number };

export const STAFF_KNOWN_PLACEHOLDERS = [
  'check_in_date',
  'check_out_date',
  'check_in_time',
  'check_out_time',
  'nights',
  'pax',
  'primary_guest_name',
  'guest_phone',
  'decor_status',
  'pet_status',
  'has_decor',
  'has_pets',
  'decor_flag',
  'pet_flag',
  'special_requests',
  'total_guest_balance',
  'next_bookings',
] as const;

export type StaffKnownPlaceholder = (typeof STAFF_KNOWN_PLACEHOLDERS)[number];

type BookingRow = Record<string, unknown>;

const MANILA_TZ = 'Asia/Manila';

function manilaClockParts(now = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { hour, minute };
}

function isManilaTimeAtOrAfter(
  targetHour: number,
  targetMinute: number,
  now = new Date(),
): boolean {
  const { hour, minute } = manilaClockParts(now);
  return hour > targetHour || (hour === targetHour && minute >= targetMinute);
}

export function parseStaffSlot(raw: unknown): StaffManilaTimeSlot {
  if (raw && typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    const h = typeof o.hour === 'number' ? o.hour : 8;
    const m = typeof o.minute === 'number' ? o.minute : 0;
    return {
      hour: Math.max(0, Math.min(23, Math.round(h))),
      minute: Math.max(0, Math.min(59, Math.round(m))),
    };
  }
  return { hour: 8, minute: 0 };
}

export function formatStaffManilaTimeLabel(slot: StaffManilaTimeSlot): string {
  const d = new Date(2000, 0, 1, slot.hour, slot.minute);
  return d.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isCancelledStatus(status: unknown): boolean {
  const s = String(status ?? '');
  return s === 'CANCELLED' || s === 'canceled';
}

/** Check-in is today (Manila) and submission time is at/after the daily summary time. */
export function bookingQualifiesForSameDayCheckinStaffAlert(
  booking: BookingRow,
  cutoff: StaffManilaTimeSlot,
  now = new Date(),
): boolean {
  if (isCancelledStatus(booking.status)) return false;
  const ciYmd = normalizeBookingDateToYmd(String(booking.check_in_date ?? ''));
  if (!ciYmd || ciYmd !== manilaTodayYmd()) return false;
  return isManilaTimeAtOrAfter(cutoff.hour, cutoff.minute, now);
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return 'Not set';
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDateHuman(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function formatDateHumanFull(ymd: string): string {
  const d = new Date(ymd + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function bookingFlagTrue(val: unknown): boolean {
  if (val === true || val === 'true' || val === 'yes' || val === 'Yes') return true;
  return false;
}

function bookingTimeRaw(time: unknown): string {
  if (typeof time !== 'string') return '';
  return time.trim();
}

/** Display time for staff Telegram; falls back to standard check-in/out defaults. */
function displayStaffBookingTime(
  time: unknown,
  default24h: string,
): string {
  const raw = bookingTimeRaw(time);
  const fallback = formatTimeForDisplay(default24h, 'N/A');
  if (!raw) return fallback;
  return formatTimeForDisplay(raw, fallback);
}

function buildBookingPlaceholders(booking: BookingRow): Record<string, string> {
  const ciRaw = String(booking.check_in_date ?? '');
  const coRaw = String(booking.check_out_date ?? '');
  const ciYmd = normalizeBookingDateToYmd(ciRaw) ?? ciRaw;
  const coYmd = normalizeBookingDateToYmd(coRaw) ?? coRaw;

  const balance = computeTotalGuestBalanceFromBooking(booking);
  const hasDecor = bookingFlagTrue(booking.guest_requests_surprise_decor);
  const hasPets = bookingFlagTrue(booking.has_pets);
  const specialReqs = String(booking.guest_special_requests ?? '').trim();

  const adults = Number(booking.number_of_adults ?? 1) || 1;
  const children = Number(booking.number_of_children ?? 0) || 0;
  const totalPax = adults + children;

  return {
    check_in_date: formatDateHumanFull(ciYmd),
    check_out_date: formatDateHumanFull(coYmd),
    check_in_time: displayStaffBookingTime(
      booking.check_in_time,
      DEFAULT_CHECK_IN_TIME,
    ),
    check_out_time: displayStaffBookingTime(
      booking.check_out_time,
      DEFAULT_CHECK_OUT_TIME,
    ),
    nights: String(booking.number_of_nights ?? '1'),
    pax: String(totalPax),
    primary_guest_name: String(booking.primary_guest_name ?? 'N/A'),
    guest_phone: String(booking.guest_phone_number ?? 'N/A'),
    decor_status: hasDecor ? '🎉 Yes' : 'No',
    pet_status: hasPets ? '🐶 Yes' : 'No',
    has_decor: hasDecor ? 'Yes' : 'No',
    has_pets: hasPets ? 'Yes' : 'No',
    /** Empty when false — optional in custom templates for one-line flags. */
    decor_flag: hasDecor ? '🎉 Has decor' : '',
    pet_flag: hasPets ? '🐶 Has pets' : '',
    special_requests: specialReqs || 'None',
    total_guest_balance: formatCurrency(balance),
  };
}

function buildNextBookingLine(booking: BookingRow): string {
  const ciRaw = String(booking.check_in_date ?? '');
  const ciYmd = normalizeBookingDateToYmd(ciRaw) ?? ciRaw;

  const ciTime = displayStaffBookingTime(
    booking.check_in_time,
    DEFAULT_CHECK_IN_TIME,
  );
  const coTime = displayStaffBookingTime(
    booking.check_out_time,
    DEFAULT_CHECK_OUT_TIME,
  );
  const adults = Number(booking.number_of_adults ?? 1) || 1;
  const children = Number(booking.number_of_children ?? 0) || 0;
  const pax = String(adults + children);

  const parts: string[] = [];
  if (ciTime && coTime) parts.push(`${ciTime}-${coTime}`);
  parts.push(`${pax}pax`);

  // Next-days summary: decor + pets only.
  if (bookingFlagTrue(booking.guest_requests_surprise_decor)) {
    parts.push('🎉 Has decor');
  }
  if (bookingFlagTrue(booking.has_pets)) {
    parts.push('🐶 Has pets');
  }

  return `${formatDateHuman(ciYmd)}: ${parts.join(', ')}`;
}

function applyPlaceholders(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

/** Legacy staff templates included admin booking URLs; strip on send/save. */
export function sanitizeStaffDailySummaryTemplate(template: string): string {
  let out = template;
  out = out.replace(/\r?\n*View Booking Details:\s*\r?\n*/gi, '\n');
  out = out.replace(/\r?\n*\{\{booking_link\}\}\s*\r?\n*/g, '\n');
  out = out.replace(/\r?\n*https?:\/\/[^\s]*\/bookings\/[0-9a-f-]+\s*\r?\n*/gi, '\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

export async function tryClaimStaffNotification(
  bookingId: string,
  notificationType: 'same_day_checkin',
): Promise<boolean> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { error } = await supabase.from('telegram_staff_notification_log').insert({
    booking_id: bookingId,
    notification_type: notificationType,
  });
  if (error?.code === '23505') return false;
  if (error) {
    console.error('[telegram-staff] claim notification:', error);
    return false;
  }
  return true;
}

export type StaffNotifySkip =
  | 'disabled'
  | 'notify_off'
  | 'missing_env'
  | 'send_failed'
  | 'no_settings'
  | 'not_qualified'
  | 'already_sent';

/** Instant one-time alert when a same-day check-in is received after the daily summary time. */
export async function notifyTelegramStaffSameDayCheckIn(
  booking: BookingRow,
  opts?: { force?: boolean },
): Promise<{ sent: boolean; skip?: StaffNotifySkip; telegramError?: string }> {
  const settings = await loadStaffSettings();
  if (!settings) return { sent: false, skip: 'no_settings' };
  if (!opts?.force && !settings.notify_on_same_day_checkin) {
    return { sent: false, skip: 'notify_off' };
  }
  const cutoff = parseStaffSlot(settings.daily_summary_time_manila);
  if (!opts?.force && !bookingQualifiesForSameDayCheckinStaffAlert(booking, cutoff)) {
    return { sent: false, skip: 'not_qualified' };
  }
  const creds = resolveStaffTelegramCredentials();
  if (!creds.ok) return { sent: false, skip: 'missing_env', telegramError: creds.error };

  const bookingId = String(booking.id ?? '').trim();
  if (!bookingId) return { sent: false, skip: 'not_qualified' };

  if (!opts?.force && !(await tryClaimStaffNotification(bookingId, 'same_day_checkin'))) {
    return { sent: false, skip: 'already_sent' };
  }

  const text = applyPlaceholders(
    sanitizeStaffDailySummaryTemplate(settings.same_day_checkin_template),
    buildBookingPlaceholders(booking),
  );
  const r = await sendStaffTelegramMessage(text.slice(0, 4096));
  if (!r.ok) {
    return { sent: false, skip: 'send_failed', telegramError: r.error };
  }
  return { sent: true };
}

/** Bookings active today for staff: check-in day and each occupied overnight night (not checkout day). */
export function bookingIsActiveForStaffToday(
  booking: BookingRow,
  todayYmd: string,
): boolean {
  if (isCancelledStatus(booking.status)) return false;
  const ciYmd = normalizeBookingDateToYmd(String(booking.check_in_date ?? ''));
  const coYmd = normalizeBookingDateToYmd(String(booking.check_out_date ?? ''));
  if (!ciYmd || !coYmd) return false;
  return bookingOccupiesNight(ciYmd, coYmd, todayYmd);
}

export async function queryTodayBookings(todayYmd: string): Promise<BookingRow[]> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data, error } = await supabase
    .from('guest_submissions')
    .select('*')
    .neq('status', 'CANCELLED')
    .neq('status', 'canceled');

  if (error) {
    console.error('[telegram-staff] queryTodayBookings:', error);
    throw new Error(`Failed to query bookings: ${error.message}`);
  }

  const active = (data ?? []).filter((r: BookingRow) =>
    bookingIsActiveForStaffToday(r, todayYmd),
  );

  // New check-ins today first, then ongoing stays by check-in date.
  return active.sort((a, b) => {
    const aCi = normalizeBookingDateToYmd(String(a.check_in_date ?? '')) ?? '';
    const bCi = normalizeBookingDateToYmd(String(b.check_in_date ?? '')) ?? '';
    const aNewToday = aCi === todayYmd ? 0 : 1;
    const bNewToday = bCi === todayYmd ? 0 : 1;
    if (aNewToday !== bNewToday) return aNewToday - bNewToday;
    return aCi.localeCompare(bCi);
  });
}

export async function queryNextDaysBookings(
  todayYmd: string,
  days: number,
): Promise<Map<string, BookingRow[]>> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const targetDates = new Set<string>();
  for (let i = 1; i <= days; i++) {
    targetDates.add(addDays(todayYmd, i));
  }

  const { data, error } = await supabase
    .from('guest_submissions')
    .select('*')
    .neq('status', 'CANCELLED')
    .neq('status', 'canceled');

  if (error) {
    console.error('[telegram-staff] queryNextDaysBookings:', error);
    throw new Error(`Failed to query bookings: ${error.message}`);
  }

  const byDate = new Map<string, BookingRow[]>();
  for (const dateYmd of targetDates) {
    byDate.set(dateYmd, []);
  }

  for (const r of data ?? []) {
    const ciYmd = normalizeBookingDateToYmd(String(r.check_in_date ?? ''));
    if (ciYmd && targetDates.has(ciYmd)) {
      byDate.get(ciYmd)!.push(r);
    }
  }

  return byDate;
}

function buildNextBookingsText(nextBookings: Map<string, BookingRow[]>): string {
  const sortedDates = [...nextBookings.keys()].sort();
  const lines: string[] = [];

  for (const dateYmd of sortedDates) {
    const bookings = nextBookings.get(dateYmd) ?? [];
    if (bookings.length === 0) {
      lines.push(`${formatDateHuman(dateYmd)}: No bookings`);
    } else {
      for (const b of bookings) {
        lines.push(buildNextBookingLine(b));
      }
    }
  }

  return lines.join('\n');
}

type StaffCreds =
  | { ok: true; token: string; chatId: string }
  | { ok: false; error: string };

function resolveStaffTelegramCredentials(): StaffCreds {
  const token = (Deno.env.get('TELEGRAM_STAFF_BOT_TOKEN') ?? Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '').trim();
  const rawChat = Deno.env.get('TELEGRAM_STAFF_CHAT_ID');
  if (!token) return { ok: false, error: 'TELEGRAM_STAFF_BOT_TOKEN (or TELEGRAM_BOT_TOKEN) unset' };
  if (rawChat == null || !String(rawChat).trim()) {
    return { ok: false, error: 'TELEGRAM_STAFF_CHAT_ID unset' };
  }
  const n = normalizeTelegramChatId(String(rawChat));
  if (!n.ok) return { ok: false, error: n.error };
  return { ok: true, token, chatId: n.chatId };
}

async function sendStaffTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const creds = resolveStaffTelegramCredentials();
  if (!creds.ok) {
    console.warn('[telegram-staff] credentials issue:', creds.error);
    return { ok: false, error: creds.error };
  }

  const url = `https://api.telegram.org/bot${creds.token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: creds.chatId,
      text,
      disable_web_page_preview: false,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    const desc = json?.description ?? res.statusText;
    console.error('[telegram-staff] sendMessage failed:', desc);
    return { ok: false, error: String(desc) };
  }
  return { ok: true };
}

export async function sendStaffAdminPreview(text: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'empty_message' };
  return sendStaffTelegramMessage(trimmed.slice(0, 4096));
}

export type StaffDraftPreviewResult = {
  sent: boolean;
  messageCharCount?: number;
  previewGuestName?: string;
  todayBookingCount?: number;
  error?: string;
};

export type StaffDraftRenderResult = {
  renderedText?: string;
  placeholders?: Record<string, string>;
  previewGuestName?: string;
  todayBookingCount?: number;
  error?: string;
};

/** In-app preview: fill placeholders from a qualifying same-day check-in booking. */
export async function renderStaffSameDayCheckinDraftPreview(
  template: string,
): Promise<StaffDraftRenderResult> {
  const trimmed = template.trim();
  if (!trimmed) return { error: 'empty_message' };

  const settings = await loadStaffSettings();
  if (!settings) return { error: 'no_settings_row' };

  const todayYmd = manilaTodayYmd();
  const todayBookings = await queryTodayBookings(todayYmd);
  const cutoff = parseStaffSlot(settings.daily_summary_time_manila);
  const booking = todayBookings.find((b) =>
    bookingQualifiesForSameDayCheckinStaffAlert(b, cutoff),
  );
  if (!booking) {
    return {
      error:
        `No same-day check-in booking qualifies for preview (needs check-in today after ${formatStaffManilaTimeLabel(cutoff)} Manila, or use test send with force).`,
    };
  }

  const placeholders = buildBookingPlaceholders(booking);
  const renderedText = applyPlaceholders(
    sanitizeStaffDailySummaryTemplate(trimmed),
    placeholders,
  );
  return {
    renderedText,
    placeholders,
    previewGuestName: String(booking.primary_guest_name ?? 'Guest'),
    todayBookingCount: todayBookings.length,
  };
}

/** In-app preview: no-bookings daily summary — fills {{next_bookings}} only (same as cron). */
export async function renderStaffNoBookingsDraftPreview(
  template: string,
): Promise<StaffDraftRenderResult> {
  const trimmed = template.trim();
  if (!trimmed) return { error: 'empty_message' };

  const todayYmd = manilaTodayYmd();
  const todayBookings = await queryTodayBookings(todayYmd);
  const nextBookings = await queryNextDaysBookings(todayYmd, 3);
  const nextBookingsText = buildNextBookingsText(nextBookings);
  const placeholders: Record<string, string> = { next_bookings: nextBookingsText };

  const renderedText = applyPlaceholders(
    sanitizeStaffDailySummaryTemplate(trimmed),
    placeholders,
  );
  const unresolved = renderedText.match(/\{\{[^}]+\}\}/g);
  if (unresolved?.length) {
    console.warn('[telegram-staff] no-bookings draft preview unresolved:', unresolved.join(', '));
  }

  return {
    renderedText,
    placeholders,
    todayBookingCount: todayBookings.length,
  };
}

/** In-app preview: fill placeholders from today's first check-in + next 3 days (same as cron). */
export async function renderStaffDraftPreview(
  template: string,
): Promise<StaffDraftRenderResult> {
  const trimmed = template.trim();
  if (!trimmed) return { error: 'empty_message' };

  const todayYmd = manilaTodayYmd();
  const todayBookings = await queryTodayBookings(todayYmd);
  if (todayBookings.length === 0) {
    return {
      error:
        'No active bookings for today. Preview needs at least one in-house or check-in-today booking (same data source as the daily cron).',
    };
  }

  const nextBookings = await queryNextDaysBookings(todayYmd, 3);
  const nextBookingsText = buildNextBookingsText(nextBookings);
  const booking = todayBookings[0]!;
  const placeholders = buildBookingPlaceholders(booking);
  placeholders.next_bookings = nextBookingsText;

  const renderedText = applyPlaceholders(
    sanitizeStaffDailySummaryTemplate(trimmed),
    placeholders,
  );
  const unresolved = renderedText.match(/\{\{[^}]+\}\}/g);
  if (unresolved?.length) {
    console.warn('[telegram-staff] draft preview unresolved:', unresolved.join(', '));
  }

  return {
    renderedText,
    placeholders,
    previewGuestName: String(booking.primary_guest_name ?? 'Guest'),
    todayBookingCount: todayBookings.length,
  };
}

/** Admin preview: fill placeholders from a qualifying same-day check-in booking. */
export async function sendStaffSameDayCheckinDraftPreview(
  template: string,
): Promise<StaffDraftPreviewResult> {
  const rendered = await renderStaffSameDayCheckinDraftPreview(template);
  if (rendered.error || !rendered.renderedText) {
    return { sent: false, error: rendered.error ?? 'empty_message' };
  }
  const r = await sendStaffAdminPreview(rendered.renderedText);
  if (!r.ok) return { sent: false, error: r.error ?? 'send_failed' };

  return {
    sent: true,
    messageCharCount: rendered.renderedText.length,
    previewGuestName: rendered.previewGuestName,
    todayBookingCount: rendered.todayBookingCount,
  };
}

/** Admin preview: no-bookings daily summary with live next 3 days. */
export async function sendStaffNoBookingsDraftPreview(
  template: string,
): Promise<StaffDraftPreviewResult> {
  const rendered = await renderStaffNoBookingsDraftPreview(template);
  if (rendered.error || !rendered.renderedText) {
    return { sent: false, error: rendered.error ?? 'empty_message' };
  }

  const r = await sendStaffAdminPreview(rendered.renderedText);
  if (!r.ok) {
    return { sent: false, error: r.error ?? 'send_failed' };
  }

  return {
    sent: true,
    messageCharCount: rendered.renderedText.length,
    todayBookingCount: rendered.todayBookingCount,
  };
}

/** Admin preview: fill placeholders from today's first check-in + next 3 days (same as cron). */
export async function sendStaffDraftPreview(template: string): Promise<StaffDraftPreviewResult> {
  const rendered = await renderStaffDraftPreview(template);
  if (rendered.error || !rendered.renderedText) {
    return { sent: false, error: rendered.error ?? 'empty_message' };
  }

  const r = await sendStaffAdminPreview(rendered.renderedText);
  if (!r.ok) {
    return { sent: false, error: r.error ?? 'send_failed' };
  }

  return {
    sent: true,
    messageCharCount: rendered.renderedText.length,
    previewGuestName: rendered.previewGuestName,
    todayBookingCount: rendered.todayBookingCount,
  };
}

async function loadStaffSettings(): Promise<TelegramStaffSettings | null> {
  try {
    const row = await DatabaseService.getTelegramStaffSettings();
    if (!row) return null;
    return row as unknown as TelegramStaffSettings;
  } catch (e) {
    console.error('[telegram-staff] load settings:', e);
    return null;
  }
}

export type StaffDailySummaryResult = {
  sent: boolean;
  mode: 'sent' | 'no_bookings_sent' | 'disabled' | 'no_env' | 'no_settings' | 'error';
  detail?: string;
  todayBookingCount?: number;
  nextDaysBookingCount?: number;
  messagesSent?: number;
};

export async function runStaffDailySummary(opts?: {
  force?: boolean;
}): Promise<StaffDailySummaryResult> {
  const settings = await loadStaffSettings();
  if (!settings) {
    return { sent: false, mode: 'no_settings', detail: 'no_settings_row' };
  }
  if (!opts?.force && !settings.enabled) {
    return { sent: false, mode: 'disabled' };
  }
  const creds = resolveStaffTelegramCredentials();
  if (!creds.ok) {
    return { sent: false, mode: 'no_env', detail: creds.error };
  }

  const todayYmd = manilaTodayYmd();
  const todayBookings = await queryTodayBookings(todayYmd);
  const nextBookings = await queryNextDaysBookings(todayYmd, 3);

  const nextBookingsText = buildNextBookingsText(nextBookings);
  const nextDaysCount = [...nextBookings.values()].reduce((sum, arr) => sum + arr.length, 0);

  if (todayBookings.length === 0) {
    const noBookingTemplate =
      settings.daily_summary_no_bookings_template?.trim() ||
      DEFAULT_STAFF_NO_BOOKINGS_TEMPLATE;
    const noBookingMsg = applyPlaceholders(
      sanitizeStaffDailySummaryTemplate(noBookingTemplate),
      { next_bookings: nextBookingsText },
    );
    const r = await sendStaffTelegramMessage(noBookingMsg.slice(0, 4096));
    return {
      sent: r.ok,
      mode: r.ok ? 'no_bookings_sent' : 'error',
      detail: r.error,
      todayBookingCount: 0,
      nextDaysBookingCount: nextDaysCount,
      messagesSent: r.ok ? 1 : 0,
    };
  }

  let messagesSent = 0;
  const errors: string[] = [];

  for (const booking of todayBookings) {
    const vars = buildBookingPlaceholders(booking);
    vars.next_bookings = nextBookingsText;

    const text = applyPlaceholders(
      sanitizeStaffDailySummaryTemplate(settings.daily_summary_template),
      vars,
    );

    const unresolved = text.match(/\{\{[^}]+\}\}/g);
    if (unresolved?.length) {
      console.warn('[telegram-staff] unresolved placeholders:', unresolved.join(', '));
    }

    const r = await sendStaffTelegramMessage(text.slice(0, 4096));
    if (r.ok) {
      messagesSent++;
    } else if (r.error) {
      errors.push(r.error);
    }
  }

  return {
    sent: messagesSent > 0,
    mode: messagesSent > 0 ? 'sent' : 'error',
    detail: errors.length ? errors.join('; ') : undefined,
    todayBookingCount: todayBookings.length,
    nextDaysBookingCount: nextDaysCount,
    messagesSent,
  };
}

export function verifyStaffCronSecret(req: Request): boolean {
  const expected = Deno.env.get('TELEGRAM_STAFF_CRON_SECRET')?.trim();
  if (!expected) return true;
  const got = req.headers.get('x-telegram-cron-secret')?.trim();
  return got === expected;
}

export async function verifyStaffTelegramEnv(): Promise<{
  credentials: {
    tokenConfigured: boolean;
    chatIdConfigured: boolean;
    normalizedChatId?: string;
    normalizeError?: string;
  };
  getMe: { ok: boolean; username?: string; error?: string };
  getChat: { ok: boolean; type?: string; title?: string; error?: string };
}> {
  const creds = resolveStaffTelegramCredentials();
  const credentials = {
    tokenConfigured: !!(Deno.env.get('TELEGRAM_STAFF_BOT_TOKEN') ?? Deno.env.get('TELEGRAM_BOT_TOKEN'))?.trim(),
    chatIdConfigured: !!Deno.env.get('TELEGRAM_STAFF_CHAT_ID')?.trim(),
    normalizedChatId: creds.ok ? creds.chatId : undefined,
    normalizeError: creds.ok ? undefined : creds.error,
  };

  if (!creds.ok) {
    return {
      credentials,
      getMe: { ok: false, error: creds.error },
      getChat: { ok: false, error: creds.error },
    };
  }

  const meRes = await fetch(`https://api.telegram.org/bot${creds.token}/getMe`);
  const meJson = (await meRes.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { username?: string };
    description?: string;
  };

  const chatRes = await fetch(
    `https://api.telegram.org/bot${creds.token}/getChat?chat_id=${encodeURIComponent(creds.chatId)}`,
  );
  const chatJson = (await chatRes.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { type?: string; title?: string };
    description?: string;
  };

  return {
    credentials,
    getMe: {
      ok: !!meJson?.ok,
      username: meJson?.result?.username,
      error: meJson?.ok ? undefined : String(meJson?.description ?? meRes.statusText),
    },
    getChat: {
      ok: !!chatJson?.ok,
      type: chatJson?.result?.type,
      title: chatJson?.result?.title,
      error: chatJson?.ok ? undefined : String(chatJson?.description ?? chatRes.statusText),
    },
  };
}

export function serializeStaffSettings(row: TelegramStaffSettings) {
  const slot = parseStaffSlot(row.daily_summary_time_manila);
  const utcTotal = (slot.hour * 60 + slot.minute - 480 + 2880) % 1440;
  const utcH = Math.floor(utcTotal / 60) % 24;
  const utcM = utcTotal % 60;

  return {
    enabled: row.enabled,
    notifyOnSameDayCheckin: row.notify_on_same_day_checkin,
    dailySummaryTemplate: row.daily_summary_template,
    dailySummaryNoBookingsTemplate:
      row.daily_summary_no_bookings_template || DEFAULT_STAFF_NO_BOOKINGS_TEMPLATE,
    sameDayCheckinTemplate: row.same_day_checkin_template,
    dailySummaryTimeManila: slot,
    dailySummaryUtcCronPreview: `${utcM} ${utcH} * * *`,
    placeholdersReference: [
      '{{check_in_date}} — check-in date',
      '{{check_out_date}} — check-out date',
      '{{check_in_time}} — check-in time',
      '{{check_out_time}} — check-out time',
      '{{nights}} — number of nights',
      '{{pax}} — number of guests',
      '{{primary_guest_name}} — primary guest name',
      '{{guest_phone}} — guest phone',
      '{{decor_status}} — decor: "🎉 Yes" or "No"',
      '{{pet_status}} — pets: "🐶 Yes" or "No"',
      '{{has_decor}} — plain "Yes" or "No" for decor labels',
      '{{has_pets}} — plain "Yes" or "No" for pet labels',
      '{{decor_flag}} — "🎉 Has decor" or empty',
      '{{pet_flag}} — "🐶 Has pets" or empty',
      '{{special_requests}} — guest requests or "None"',
      '{{total_guest_balance}} — guest balance due (₱ formatted)',
      '{{next_bookings}} — next 3 days (decor + pet flags only)',
    ],
    scenarios: [
      {
        id: 'daily_summary',
        label: 'Daily summary',
        trigger: 'Once daily at the configured Manila time when there are active bookings today',
        type: 'scheduled',
      },
      {
        id: 'daily_summary_no_bookings',
        label: 'No bookings daily summary',
        trigger: 'Once daily at the configured Manila time when there are no active bookings today',
        type: 'scheduled',
      },
      {
        id: 'same_day_checkin',
        label: 'Same-day check-in alert',
        trigger:
          `Instant for same-day check-ins at or after ${formatStaffManilaTimeLabel(slot)} Manila`,
        type: 'event',
      },
    ],
  };
}

export async function ensureStaffSettingsRow(): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { data, error } = await supabase
    .from('telegram_staff_settings')
    .select('id')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.error('ensureStaffSettingsRow select:', error);
    throw new Error(
      `telegram_staff_settings query failed (${error.code ?? 'no-code'}: ${error.message}). ` +
        `Deploy migration 20260622120000_telegram_staff_settings.sql to this database.`,
    );
  }
  if (data) return;
  const defaultTemplate =
    '📋 Today\'s Booking\n\n' +
    'Booking Details\n{{check_in_date}} - {{check_out_date}}\n{{check_in_time}} - {{check_out_time}}\n{{nights}} night/s, {{pax}} pax\n\n' +
    'Guest Details\n{{primary_guest_name}}, {{guest_phone}}\n\n' +
    'Additional Details\nHas decor: {{decor_status}}\nHas pets: {{pet_status}}\nSpecial Requests: {{special_requests}}\nTotal guest balance: {{total_guest_balance}}\n\n' +
    'Next Bookings\n{{next_bookings}}';

  const { error: insertError } = await supabase.from('telegram_staff_settings').insert({
    id: 1,
    daily_summary_template: defaultTemplate,
    daily_summary_no_bookings_template: DEFAULT_STAFF_NO_BOOKINGS_TEMPLATE,
  });
  if (insertError) {
    console.error('ensureStaffSettingsRow insert:', insertError);
    throw new Error(
      `Could not seed telegram_staff_settings (${insertError.message}). ` +
        `Apply migration 20260622120000_telegram_staff_settings.sql first.`,
    );
  }
}
