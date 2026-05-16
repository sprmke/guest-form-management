/**
 * Telegram Bot API sends + marketing copy from `telegram_marketing_settings`.
 * Non-fatal on failure — callers log only.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { DatabaseService } from './databaseService.ts';
import {
  addDaysYmd,
  calendarDaysBetween,
  collectBlockedNights,
  earliestAvailableCheckInYmd,
  formatAvailableDatesHuman,
  formatCancellationDatesHuman,
  formatDatesListForMonth,
  formatMonthName,
  listAvailableCheckIns,
  manilaTodayYmd,
  normalizeBookingDateToYmd,
} from './calendarAvailabilityManila.ts';

export type TelegramMarketingSettings = {
  id: number;
  enabled: boolean;
  notify_on_new_booking: boolean;
  notify_on_cancellation: boolean;
  urgency_days_threshold: number;
  new_booking_dates_limit: number;
  daily_default_template: string;
  daily_urgency_template: string;
  new_booking_template: string;
  cancellation_template: string;
};

export function applyTemplatePlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

/**
 * Trim, strip BOM/CR, remove wrapping quotes. Telegram expects a numeric id for groups
 * (often negative, e.g. -100…). @username is not accepted here — use getUpdates / RawDataBot.
 */
export function normalizeTelegramChatId(raw: string): { ok: true; chatId: string } | { ok: false; error: string } {
  let s = raw.trim().replace(/\r/g, '').replace(/\uFEFF/g, '');
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim().replace(/\r/g, '').replace(/\uFEFF/g, '');
  }
  if (!s) return { ok: false, error: 'TELEGRAM_CHAT_ID is empty after normalization' };
  if (!/^-?[0-9]+$/.test(s)) {
    return {
      ok: false,
      error:
        'TELEGRAM_CHAT_ID must be a numeric id (e.g. -100… for supergroups). Remove @ prefixes, labels, and non-digits.',
    };
  }
  return { ok: true, chatId: s };
}

type ResolveTelegramCreds =
  | { ok: true; token: string; chatId: string }
  | { ok: false; error: string; code: 'missing_token' | 'missing_chat_id' | 'invalid_chat_id' };

function resolveTelegramCredentials(): ResolveTelegramCreds {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim() ?? '';
  const rawChat = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN unset', code: 'missing_token' };
  if (rawChat == null || !String(rawChat).trim()) {
    return { ok: false, error: 'TELEGRAM_CHAT_ID unset', code: 'missing_chat_id' };
  }
  const n = normalizeTelegramChatId(String(rawChat));
  if (!n.ok) return { ok: false, error: n.error, code: 'invalid_chat_id' };
  return { ok: true, token, chatId: n.chatId };
}

export type TelegramEnvVerifyResult = {
  credentials: {
    tokenConfigured: boolean;
    chatIdRawLength: number;
    normalizedChatId?: string;
    normalizeError?: string;
  };
  getMe: { ok: boolean; username?: string; error?: string };
  getChat: { ok: boolean; type?: string; title?: string; username?: string; error?: string };
};

/** Admin-only: getMe + getChat using the same env normalization as sends. */
export async function verifyTelegramEnv(): Promise<TelegramEnvVerifyResult> {
  const rawChat = Deno.env.get('TELEGRAM_CHAT_ID') ?? '';
  const creds = resolveTelegramCredentials();
  const credentials = {
    tokenConfigured: !!Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim(),
    chatIdRawLength: rawChat.length,
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

  const meUrl = `https://api.telegram.org/bot${creds.token}/getMe`;
  const meRes = await fetch(meUrl);
  const meJson = (await meRes.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { username?: string };
    description?: string;
  };

  const chatUrl = `https://api.telegram.org/bot${creds.token}/getChat?chat_id=${
    encodeURIComponent(creds.chatId)
  }`;
  const chatRes = await fetch(chatUrl);
  const chatJson = (await chatRes.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { type?: string; title?: string; username?: string };
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
      username: chatJson?.result?.username,
      error: chatJson?.ok ? undefined : String(chatJson?.description ?? chatRes.statusText),
    },
  };
}

async function sendTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const creds = resolveTelegramCredentials();
  if (!creds.ok) {
    if (creds.code === 'missing_token' || creds.code === 'missing_chat_id') {
      console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID unset — skip send');
      return { ok: false, error: 'missing_env' };
    }
    console.error('[telegram] invalid TELEGRAM_CHAT_ID:', creds.error);
    return { ok: false, error: creds.error };
  }
  const url = `https://api.telegram.org/bot${creds.token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: creds.chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    const desc = json?.description ?? res.statusText;
    console.error('[telegram] sendMessage failed:', desc);
    return { ok: false, error: String(desc) };
  }
  return { ok: true };
}

async function loadSettings(): Promise<TelegramMarketingSettings | null> {
  try {
    const row = await DatabaseService.getTelegramMarketingSettings();
    if (!row) return null;
    return row as TelegramMarketingSettings;
  } catch (e) {
    console.error('[telegram] load settings:', e);
    return null;
  }
}

function buildBlockedSet(): Promise<Set<string>> {
  return DatabaseService.listBookingRangesForAvailability().then((ranges) =>
    collectBlockedNights(ranges),
  );
}

/** Sample values for Settings “send test” on draft templates (placeholders only). */
export const TELEGRAM_PLACEHOLDER_SAMPLES: Record<string, string> = {
  available_dates: 'May 17, 18, 20',
  month_name: 'May',
  dates_list: '16, 18, 19, 24',
  cancellation_dates: 'May 14–15',
};

export function applySamplePlaceholdersToTemplate(template: string): string {
  return applyTemplatePlaceholders(template, { ...TELEGRAM_PLACEHOLDER_SAMPLES });
}

/** Send arbitrary text (admin tests); ignores `telegram_marketing_settings.enabled`. */
export async function sendTelegramAdminPreview(text: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'empty_message' };
  return sendTelegramMessage(trimmed.slice(0, 4096));
}

/** Scheduled 3×/day: default vs urgency copy. */
export async function runTelegramDailyReminder(opts?: { force?: boolean }): Promise<{
  sent: boolean;
  mode: 'skipped' | 'default' | 'urgency' | 'disabled' | 'no_env';
  detail?: string;
}> {
  const settings = await loadSettings();
  if (!settings) {
    return { sent: false, mode: 'skipped', detail: 'no_settings_row' };
  }
  if (!opts?.force && !settings.enabled) {
    return { sent: false, mode: 'disabled' };
  }
  const creds = resolveTelegramCredentials();
  if (!creds.ok) {
    return {
      sent: false,
      mode: 'no_env',
      detail: creds.code === 'invalid_chat_id' ? creds.error : undefined,
    };
  }

  const todayYmd = manilaTodayYmd();
  const blocked = await buildBlockedSet();
  const earliest = earliestAvailableCheckInYmd(blocked, todayYmd);
  if (!earliest) {
    const text = settings.daily_default_template;
    const r = await sendTelegramMessage(text);
    return { sent: r.ok, mode: 'default', detail: 'no_availability_found' };
  }

  const daysOut = calendarDaysBetween(todayYmd, earliest);
  const threshold = settings.urgency_days_threshold;

  if (daysOut < threshold) {
    const sample = listAvailableCheckIns(blocked, todayYmd, 12);
    const availText = formatAvailableDatesHuman(sample);
    const text = applyTemplatePlaceholders(settings.daily_urgency_template, {
      available_dates: availText,
    });
    const r = await sendTelegramMessage(text);
    return { sent: r.ok, mode: 'urgency' };
  }

  const text = settings.daily_default_template;
  const r = await sendTelegramMessage(text);
  return { sent: r.ok, mode: 'default' };
}

export type TelegramNotifySkip =
  | 'disabled'
  | 'notify_off'
  | 'no_dates'
  | 'missing_env'
  | 'send_failed'
  | 'no_settings';

/** After a brand-new guest submission row is inserted. */
export async function notifyTelegramNewBookingRequest(opts?: {
  force?: boolean;
}): Promise<{ sent: boolean; skip?: TelegramNotifySkip; telegramError?: string }> {
  const settings = await loadSettings();
  if (!settings) {
    return { sent: false, skip: 'no_settings' };
  }
  if (!opts?.force && (!settings.enabled || !settings.notify_on_new_booking)) {
    return { sent: false, skip: !settings.enabled ? 'disabled' : 'notify_off' };
  }

  const todayYmd = manilaTodayYmd();
  const blocked = await buildBlockedSet();

  const anchorMonth = todayYmd.slice(0, 7); // YYYY-MM
  const monthStart = `${anchorMonth}-01`;
  const limit = settings.new_booking_dates_limit;

  const candidates = listAvailableCheckIns(blocked, todayYmd, 60).filter((ymd) =>
    ymd.startsWith(anchorMonth),
  );
  const picked = candidates.slice(0, limit);
  if (picked.length === 0) {
    return { sent: false, skip: 'no_dates' };
  }

  const monthName = formatMonthName(monthStart);
  const datesList = formatDatesListForMonth(picked, monthStart);
  const text = applyTemplatePlaceholders(settings.new_booking_template, {
    month_name: monthName,
    dates_list: datesList,
    available_dates: formatAvailableDatesHuman(picked),
  });
  const r = await sendTelegramMessage(text);
  if (!r.ok) {
    console.error('[telegram] new booking notify failed');
    return {
      sent: false,
      skip: r.error === 'missing_env' ? 'missing_env' : 'send_failed',
      telegramError: r.error,
    };
  }
  return { sent: true };
}

/** After cancel — dates are still on the row until transition; pass explicit YMDs. */
export async function notifyTelegramCancellation(
  checkInYmd: string,
  checkOutYmd: string,
  opts?: { force?: boolean },
): Promise<{ sent: boolean; skip?: TelegramNotifySkip; telegramError?: string }> {
  const settings = await loadSettings();
  if (!settings) {
    return { sent: false, skip: 'no_settings' };
  }
  if (!opts?.force && (!settings.enabled || !settings.notify_on_cancellation)) {
    return { sent: false, skip: !settings.enabled ? 'disabled' : 'notify_off' };
  }

  const ci = normalizeBookingDateToYmd(checkInYmd) ?? checkInYmd;
  const co = normalizeBookingDateToYmd(checkOutYmd) ?? checkOutYmd;
  const cancellationDates = formatCancellationDatesHuman(ci, co);
  const text = applyTemplatePlaceholders(settings.cancellation_template, {
    cancellation_dates: cancellationDates,
  });
  const r = await sendTelegramMessage(text);
  if (!r.ok) {
    console.error('[telegram] cancellation notify failed');
    return {
      sent: false,
      skip: r.error === 'missing_env' ? 'missing_env' : 'send_failed',
      telegramError: r.error,
    };
  }
  return { sent: true };
}

/** Optional gate for cron: if TELEGRAM_CRON_SECRET is set, header must match. */
export function verifyTelegramCronSecret(req: Request): boolean {
  const expected = Deno.env.get('TELEGRAM_CRON_SECRET')?.trim();
  if (!expected) return true;
  const got = req.headers.get('x-telegram-cron-secret')?.trim();
  return got === expected;
}

/** Public shape for Settings GET (no secrets). */
export function serializeTelegramSettings(row: TelegramMarketingSettings) {
  return {
    enabled: row.enabled,
    notifyOnNewBooking: row.notify_on_new_booking,
    notifyOnCancellation: row.notify_on_cancellation,
    urgencyDaysThreshold: row.urgency_days_threshold,
    newBookingDatesLimit: row.new_booking_dates_limit,
    dailyDefaultTemplate: row.daily_default_template,
    dailyUrgencyTemplate: row.daily_urgency_template,
    newBookingTemplate: row.new_booking_template,
    cancellationTemplate: row.cancellation_template,
    placeholdersReference: [
      '{{available_dates}} — urgency / optional (human-readable date list)',
      '{{month_name}} — calendar month name (new booking)',
      '{{dates_list}} — day numbers or short dates for the month (new booking)',
      '{{cancellation_dates}} — freed stay window (cancellation)',
      'Manual “Send draft + sample data” replaces only known placeholders; unknown {{tokens}} stay literal.',
    ],
  };
}

/** Ensure row exists (migration should); used defensively. */
export async function ensureTelegramSettingsRow(): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { data } = await supabase.from('telegram_marketing_settings').select('id').eq('id', 1).maybeSingle();
  if (data) return;
  await supabase.from('telegram_marketing_settings').insert({
    id: 1,
    daily_default_template: 'Pa up and share po ka-uppers! Salamuch!',
    daily_urgency_template:
      'Available this {{available_dates}}. Book now and get huge last minute discount!',
    new_booking_template:
      'Available next dates: {{month_name}} {{dates_list}}. Book now and get huge discount for this month!',
    cancellation_template:
      'Available this {{cancellation_dates}} due to guest cancellation! Book now and get huge discount for this specific date/s!',
  });
}
