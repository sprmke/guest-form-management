export const DEFAULT_PARKING_WEEKDAY_NIGHTLY_RATE = 300;
export const DEFAULT_PARKING_WEEKEND_NIGHTLY_RATE = 400;

export type ParkingPricingDefaults = {
  weekdayNightlyRate: number;
  weekendNightlyRate: number;
};

export const FALLBACK_PARKING_PRICING_DEFAULTS: ParkingPricingDefaults = {
  weekdayNightlyRate: DEFAULT_PARKING_WEEKDAY_NIGHTLY_RATE,
  weekendNightlyRate: DEFAULT_PARKING_WEEKEND_NIGHTLY_RATE,
};

export function parkingPricingDefaultsFromDto(
  dto?: Partial<ParkingPricingDefaults> | null
): ParkingPricingDefaults {
  if (!dto) return FALLBACK_PARKING_PRICING_DEFAULTS;
  return {
    weekdayNightlyRate:
      dto.weekdayNightlyRate ?? FALLBACK_PARKING_PRICING_DEFAULTS.weekdayNightlyRate,
    weekendNightlyRate:
      dto.weekendNightlyRate ?? FALLBACK_PARKING_PRICING_DEFAULTS.weekendNightlyRate,
  };
}
