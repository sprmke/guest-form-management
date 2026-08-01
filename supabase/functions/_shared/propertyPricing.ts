/**
 * Property pricing — load/save defaults (app_settings) + date overrides + booked nights.
 */

import { manilaTodayYmd } from './calendarAvailabilityManila.ts';
import { createServiceClient } from './orgAuth.ts';
import {
  deleteBlockedRangesCovering,
  insertBlockedRange,
  loadBlockedDateKeys,
} from './propertyBlockedDates.ts';
import { ensurePropertySettings } from './propertySettingsSeed.ts';

const DEFAULT_WEEKDAY = 2799;
const DEFAULT_WEEKEND = 2999;
const DEFAULT_DOWN_PAYMENT = 1500;
const DEFAULT_SECURITY_DEPOSIT = 1500;
const DEFAULT_PET_FEE = 300;
const DEFAULT_PARKING = 400;
const DEFAULT_GUEST_ADDITIONAL = 0;

export type PricingHolidayRuleDto = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  percentage: number;
};

const DEFAULT_HOLIDAY_RULES: PricingHolidayRuleDto[] = [
  {
    id: 'new-year',
    name: "New Year's Day",
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    percentage: 50,
  },
  {
    id: 'chinese-new-year',
    name: 'Chinese New Year',
    startDate: '2026-02-17',
    endDate: '2026-02-17',
    percentage: 30,
  },
  {
    id: 'holy-week',
    name: 'Holy Week',
    startDate: '2026-04-02',
    endDate: '2026-04-05',
    percentage: 40,
  },
  {
    id: 'labor-day',
    name: 'Labor Day',
    startDate: '2026-05-01',
    endDate: '2026-05-01',
    percentage: 20,
  },
  {
    id: 'independence',
    name: 'Independence Day',
    startDate: '2026-06-12',
    endDate: '2026-06-12',
    percentage: 30,
  },
  {
    id: 'peak-july',
    name: 'Peak season',
    startDate: '2026-07-04',
    endDate: '2026-07-04',
    percentage: 25,
  },
  {
    id: 'all-saints',
    name: "All Saints' Day",
    startDate: '2026-11-01',
    endDate: '2026-11-02',
    percentage: 30,
  },
  {
    id: 'christmas',
    name: 'Christmas Season',
    startDate: '2026-12-24',
    endDate: '2026-12-26',
    percentage: 50,
  },
  {
    id: 'new-year-eve',
    name: "New Year's Eve",
    startDate: '2026-12-31',
    endDate: '2026-12-31',
    percentage: 50,
  },
];

export type PropertyPricingDto = {
  weekdayNightlyRate: number;
  weekendNightlyRate: number;
  downPayment: number;
  securityDeposit: number;
  petFee: number;
  parkingRateGuest: number;
  guestAdditionalFee: number;
  dateOverrides: Record<string, number>;
  bookedDateKeys: string[];
  blockedDateKeys: string[];
  holidayRules: PricingHolidayRuleDto[];
};

type AppSettingsPricingRow = {
  weekday_nightly_rate: unknown;
  weekend_nightly_rate: unknown;
  default_down_payment: unknown;
  default_security_deposit: unknown;
  default_pet_fee: unknown;
  default_parking_rate_guest: unknown;
  default_guest_additional_fee: unknown;
  pricing_holiday_rules: unknown;
};

function pickMoney(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseOccupancyDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const mdy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  }

  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day);
  }

  return null;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Nights `[startDate, endDate)` as YYYY-MM-DD keys, checkout-exclusive. */
function expandNightsInRange(startDate: string, endDate: string): string[] {
  const start = parseOccupancyDate(startDate);
  const end = parseOccupancyDate(endDate);
  if (!start || !end || end <= start) return [];

  const nights: string[] = [];
  let cursor = new Date(start);
  const lastNight = addDays(end, -1);
  while (cursor <= lastNight) {
    nights.push(formatDateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return nights;
}

function rowToDefaults(
  row: AppSettingsPricingRow | null
): Omit<
  PropertyPricingDto,
  'dateOverrides' | 'bookedDateKeys' | 'blockedDateKeys' | 'holidayRules'
> {
  return {
    weekdayNightlyRate: pickMoney(row?.weekday_nightly_rate, DEFAULT_WEEKDAY),
    weekendNightlyRate: pickMoney(row?.weekend_nightly_rate, DEFAULT_WEEKEND),
    downPayment: pickMoney(row?.default_down_payment, DEFAULT_DOWN_PAYMENT),
    securityDeposit: pickMoney(row?.default_security_deposit, DEFAULT_SECURITY_DEPOSIT),
    petFee: pickMoney(row?.default_pet_fee, DEFAULT_PET_FEE),
    parkingRateGuest: pickMoney(row?.default_parking_rate_guest, DEFAULT_PARKING),
    guestAdditionalFee: pickMoney(row?.default_guest_additional_fee, DEFAULT_GUEST_ADDITIONAL),
  };
}

function parseHolidayRules(raw: unknown): PricingHolidayRuleDto[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_HOLIDAY_RULES;
  }

  const rules: PricingHolidayRuleDto[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? '').trim();
    const name = String(row.name ?? '').trim();
    const startDate = String(row.startDate ?? '').trim();
    const endDate = String(row.endDate ?? '').trim();
    const percentage = Number(row.percentage);
    if (!id || !name || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) continue;
    if (!Number.isFinite(percentage) || percentage < 0) continue;
    if (startDate > endDate) continue;
    rules.push({ id, name, startDate, endDate, percentage });
  }

  return rules.length > 0 ? rules : DEFAULT_HOLIDAY_RULES;
}

function validateHolidayRules(value: unknown): PricingHolidayRuleDto[] {
  if (!Array.isArray(value)) {
    throw new Error('holidayRules must be an array');
  }

  const rules: PricingHolidayRuleDto[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? '').trim();
    const name = String(row.name ?? '').trim();
    const startDate = String(row.startDate ?? '').trim();
    const endDate = String(row.endDate ?? '').trim();
    const percentage = Number(row.percentage);
    if (!id || !name || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error('Invalid holiday rule date or id');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error('Invalid holiday rule end date');
    }
    if (!Number.isFinite(percentage) || percentage < 0) {
      throw new Error('Holiday percentage must be non-negative');
    }
    if (startDate > endDate) {
      throw new Error('Holiday start date must be on or before end date');
    }
    rules.push({ id, name, startDate, endDate, percentage });
  }

  if (rules.length === 0) {
    throw new Error('At least one holiday rule is required');
  }
  return rules;
}

async function loadDateOverrides(propertyId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('property_pricing_date_overrides')
    .select('pricing_date, nightly_rate')
    .eq('property_id', propertyId);

  if (error) {
    throw new Error(`Failed to load pricing overrides: ${error.message}`);
  }

  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = String(row.pricing_date).slice(0, 10);
    map[key] = pickMoney(row.nightly_rate, 0);
  }
  return map;
}

/** Occupied nights [check-in, check-out) for non-cancelled bookings. */
export async function loadBookedDateKeys(
  propertyId: string,
  monthStart?: string,
  monthEnd?: string
): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('guest_submissions')
    .select('check_in_date, check_out_date, status')
    .eq('property_id', propertyId)
    .neq('status', 'CANCELLED');

  if (error) {
    throw new Error(`Failed to load booked dates: ${error.message}`);
  }

  const keys = new Set<string>();
  const rangeStart = monthStart ? parseOccupancyDate(monthStart) : null;
  const rangeEnd = monthEnd ? parseOccupancyDate(monthEnd) : null;

  for (const row of data ?? []) {
    if (row.status === 'CANCELLED') continue;
    const checkIn = parseOccupancyDate(row.check_in_date);
    const checkOut = parseOccupancyDate(row.check_out_date);
    if (!checkIn || !checkOut || checkIn >= checkOut) continue;

    let cursor = new Date(checkIn);
    const lastNight = addDays(checkOut, -1);
    while (cursor <= lastNight) {
      const key = formatDateKey(cursor);
      if (!rangeStart || !rangeEnd || (cursor >= rangeStart && cursor <= rangeEnd)) {
        keys.add(key);
      }
      cursor = addDays(cursor, 1);
    }
  }

  return [...keys].sort();
}

export async function loadPropertyPricing(
  propertyId: string,
  options?: { monthStart?: string; monthEnd?: string }
): Promise<PropertyPricingDto> {
  await ensurePropertySettings(propertyId);
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from('app_settings')
    .select(
      'weekday_nightly_rate, weekend_nightly_rate, default_down_payment, default_security_deposit, default_pet_fee, default_parking_rate_guest, default_guest_additional_fee, pricing_holiday_rules'
    )
    .eq('property_id', propertyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load property pricing: ${error.message}`);
  }

  const [dateOverrides, bookedDateKeys, blockedDateKeys] = await Promise.all([
    loadDateOverrides(propertyId),
    loadBookedDateKeys(propertyId, options?.monthStart, options?.monthEnd),
    loadBlockedDateKeys(propertyId, options?.monthStart, options?.monthEnd),
  ]);

  return {
    ...rowToDefaults(row as AppSettingsPricingRow | null),
    dateOverrides,
    bookedDateKeys,
    blockedDateKeys,
    holidayRules: parseHolidayRules((row as AppSettingsPricingRow | null)?.pricing_holiday_rules),
  };
}

function validateMoneyField(value: unknown, label: string): number | null | string {
  if (value === undefined) return null;
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return `${label} must be a non-negative number`;
  }
  if (n > 999_999_999) {
    return `${label} is too large`;
  }
  return n;
}

export type PropertyPricingPatch = {
  weekdayNightlyRate?: number;
  weekendNightlyRate?: number;
  downPayment?: number;
  securityDeposit?: number;
  petFee?: number;
  parkingRateGuest?: number;
  guestAdditionalFee?: number;
  dateOverrides?: Record<string, number>;
  holidayRules?: PricingHolidayRuleDto[];
  blockRange?: { startDate: string; endDate: string; note?: string };
  unblockDateKeys?: string[];
};

export async function savePropertyPricing(
  propertyId: string,
  patch: PropertyPricingPatch,
  options?: { userId?: string | null }
): Promise<PropertyPricingDto> {
  await ensurePropertySettings(propertyId);
  const supabase = createServiceClient();

  const settingsPatch: Record<string, unknown> = {};
  const fields: Array<[keyof PropertyPricingPatch, string, string]> = [
    ['weekdayNightlyRate', 'weekday_nightly_rate', 'Weekday rate'],
    ['weekendNightlyRate', 'weekend_nightly_rate', 'Weekend rate'],
    ['downPayment', 'default_down_payment', 'Down payment'],
    ['securityDeposit', 'default_security_deposit', 'Security deposit'],
    ['petFee', 'default_pet_fee', 'Pet fee'],
    ['parkingRateGuest', 'default_parking_rate_guest', 'Parking rate'],
    ['guestAdditionalFee', 'default_guest_additional_fee', 'Extra guest fee'],
  ];

  for (const [patchKey, dbKey, label] of fields) {
    if (patch[patchKey] === undefined) continue;
    const validated = validateMoneyField(patch[patchKey], label);
    if (typeof validated === 'string') throw new Error(validated);
    if (validated !== null) settingsPatch[dbKey] = validated;
  }

  if (patch.holidayRules !== undefined) {
    settingsPatch.pricing_holiday_rules = validateHolidayRules(patch.holidayRules);
  }

  if (Object.keys(settingsPatch).length > 0) {
    const { error } = await supabase
      .from('app_settings')
      .update(settingsPatch)
      .eq('property_id', propertyId);

    if (error) {
      throw new Error(`Failed to save pricing defaults: ${error.message}`);
    }
  }

  if (patch.dateOverrides !== undefined) {
    const { error: deleteError } = await supabase
      .from('property_pricing_date_overrides')
      .delete()
      .eq('property_id', propertyId);

    if (deleteError) {
      throw new Error(`Failed to clear pricing overrides: ${deleteError.message}`);
    }

    const rows = Object.entries(patch.dateOverrides).map(([date, rate]) => {
      const validated = validateMoneyField(rate, 'Override rate');
      if (typeof validated === 'string') throw new Error(validated);
      if (validated === null) throw new Error('Override rate is required');
      return {
        property_id: propertyId,
        pricing_date: date,
        nightly_rate: validated,
        updated_at: new Date().toISOString(),
      };
    });

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from('property_pricing_date_overrides')
        .insert(rows);

      if (insertError) {
        throw new Error(`Failed to save pricing overrides: ${insertError.message}`);
      }
    }
  }

  if (patch.blockRange) {
    const { startDate, endDate } = patch.blockRange;
    const nights = expandNightsInRange(startDate, endDate);
    if (nights.length === 0) {
      throw new Error('blockRange endDate must be after startDate');
    }

    const today = manilaTodayYmd();
    if (nights.some((key) => key < today)) {
      throw new Error('Cannot block dates in the past');
    }

    const bookedKeys = new Set(await loadBookedDateKeys(propertyId, startDate, endDate));
    if (nights.some((key) => bookedKeys.has(key))) {
      throw new Error('Cannot block dates that are already booked');
    }

    await insertBlockedRange(
      propertyId,
      startDate,
      endDate,
      patch.blockRange.note,
      options?.userId
    );
  }

  if (patch.unblockDateKeys && patch.unblockDateKeys.length > 0) {
    await deleteBlockedRangesCovering(propertyId, patch.unblockDateKeys);
  }

  return loadPropertyPricing(propertyId);
}

/** Fri–Sun weekend rate (matches Pricing calendar). */
export function isWeekendRateDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 5 || day === 6;
}

export function computeDefaultBookingRateFromDefaults(
  checkIn: Date | null,
  checkOut: Date | null,
  numberOfNights: number | null | undefined,
  defaults: Pick<PropertyPricingDto, 'weekdayNightlyRate' | 'weekendNightlyRate'>,
  options?: {
    dateOverrides?: Record<string, number>;
    holidayRules?: PricingHolidayRuleDto[];
  }
): number | null {
  if (checkIn && checkOut && checkOut > checkIn) {
    let total = 0;
    let cursor = new Date(checkIn);
    while (cursor < checkOut) {
      total += resolveNightlyRateForDate(cursor, defaults, options);
      cursor = addDays(cursor, 1);
    }
    return total;
  }

  const nights = Number(numberOfNights ?? 0);
  if (Number.isFinite(nights) && nights > 0) {
    return nights * defaults.weekdayNightlyRate;
  }

  return defaults.weekdayNightlyRate;
}

function findHolidayRuleForDateKey(
  dateKey: string,
  rules: PricingHolidayRuleDto[]
): PricingHolidayRuleDto | undefined {
  return rules.find((r) => dateKey >= r.startDate && dateKey <= r.endDate);
}

function resolveNightlyRateForDate(
  date: Date,
  defaults: Pick<PropertyPricingDto, 'weekdayNightlyRate' | 'weekendNightlyRate'>,
  options?: {
    dateOverrides?: Record<string, number>;
    holidayRules?: PricingHolidayRuleDto[];
  }
): number {
  const key = formatDateKey(date);
  const override = options?.dateOverrides?.[key];
  if (override !== undefined) return override;

  const base = isWeekendRateDay(date) ? defaults.weekendNightlyRate : defaults.weekdayNightlyRate;

  const rules =
    options?.holidayRules && options.holidayRules.length > 0
      ? options.holidayRules
      : DEFAULT_HOLIDAY_RULES;
  const holiday = findHolidayRuleForDateKey(key, rules);
  if (holiday) {
    return Math.round(base * (1 + holiday.percentage / 100));
  }

  return base;
}
