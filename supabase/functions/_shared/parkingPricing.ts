/**
 * Parking pricing — weekday/weekend defaults (parking_settings) + date overrides.
 */

import { createServiceClient } from './orgAuth.ts';
import { ensureParkingSettings } from './parkingSettingsSeed.ts';

export const DEFAULT_PARKING_WEEKDAY = 300;
export const DEFAULT_PARKING_WEEKEND = 400;

export type ParkingPricingDto = {
  weekdayNightlyRate: number;
  weekendNightlyRate: number;
  dateOverrides: Record<string, number>;
  bookedDateKeys: string[];
};

export type ParkingPricingPatch = {
  weekdayNightlyRate?: number;
  weekendNightlyRate?: number;
  dateOverrides?: Record<string, number>;
};

type ParkingSettingsPricingRow = {
  weekday_nightly_rate: unknown;
  weekend_nightly_rate: unknown;
};

function pickMoney(value: unknown, fallback: number): number {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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

function validateDateKey(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

async function loadDateOverrides(parkingId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('parking_pricing_date_overrides')
    .select('pricing_date, nightly_rate')
    .eq('parking_id', parkingId)
    .order('pricing_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to load parking pricing overrides: ${error.message}`);
  }

  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = String(row.pricing_date).slice(0, 10);
    out[key] = Number(row.nightly_rate);
  }
  return out;
}

function rowToDefaults(
  row: ParkingSettingsPricingRow | null
): Pick<ParkingPricingDto, 'weekdayNightlyRate' | 'weekendNightlyRate'> {
  return {
    weekdayNightlyRate: pickMoney(row?.weekday_nightly_rate, DEFAULT_PARKING_WEEKDAY),
    weekendNightlyRate: pickMoney(row?.weekend_nightly_rate, DEFAULT_PARKING_WEEKEND),
  };
}

export async function loadParkingPricing(
  parkingId: string,
  _options?: { monthStart?: string; monthEnd?: string }
): Promise<ParkingPricingDto> {
  await ensureParkingSettings(parkingId);
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from('parking_settings')
    .select('weekday_nightly_rate, weekend_nightly_rate')
    .eq('parking_id', parkingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load parking pricing: ${error.message}`);
  }

  const dateOverrides = await loadDateOverrides(parkingId);

  return {
    ...rowToDefaults(row as ParkingSettingsPricingRow | null),
    dateOverrides,
    bookedDateKeys: [],
  };
}

export async function saveParkingPricing(
  parkingId: string,
  patch: ParkingPricingPatch
): Promise<ParkingPricingDto> {
  await ensureParkingSettings(parkingId);
  const supabase = createServiceClient();

  const settingsPatch: Record<string, unknown> = {};
  const fields: Array<[keyof ParkingPricingPatch, string, string]> = [
    ['weekdayNightlyRate', 'weekday_nightly_rate', 'Weekday rate'],
    ['weekendNightlyRate', 'weekend_nightly_rate', 'Weekend rate'],
  ];

  for (const [patchKey, dbKey, label] of fields) {
    if (patch[patchKey] === undefined) continue;
    const validated = validateMoneyField(patch[patchKey], label);
    if (typeof validated === 'string') throw new Error(validated);
    if (validated !== null) settingsPatch[dbKey] = validated;
  }

  if (Object.keys(settingsPatch).length > 0) {
    settingsPatch.updated_at = new Date().toISOString();
    const { error } = await supabase
      .from('parking_settings')
      .update(settingsPatch)
      .eq('parking_id', parkingId);

    if (error) {
      throw new Error(`Failed to save parking pricing defaults: ${error.message}`);
    }
  }

  if (patch.dateOverrides !== undefined) {
    const { error: deleteError } = await supabase
      .from('parking_pricing_date_overrides')
      .delete()
      .eq('parking_id', parkingId);

    if (deleteError) {
      throw new Error(`Failed to clear parking pricing overrides: ${deleteError.message}`);
    }

    const rows = Object.entries(patch.dateOverrides).map(([date, rate]) => {
      if (!validateDateKey(date)) {
        throw new Error(`Invalid override date: ${date}`);
      }
      const validated = validateMoneyField(rate, 'Override rate');
      if (typeof validated === 'string') throw new Error(validated);
      if (validated === null) throw new Error('Override rate is required');
      return {
        parking_id: parkingId,
        pricing_date: date,
        nightly_rate: validated,
        updated_at: new Date().toISOString(),
      };
    });

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from('parking_pricing_date_overrides')
        .insert(rows);

      if (insertError) {
        throw new Error(`Failed to save parking pricing overrides: ${insertError.message}`);
      }
    }
  }

  return loadParkingPricing(parkingId);
}
