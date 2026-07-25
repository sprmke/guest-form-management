/** Default parking space dimensions (meters) when unset in `parkings.settings`. */
export const DEFAULT_PARKING_SPACE_LENGTH_M = 5;
export const DEFAULT_PARKING_SPACE_WIDTH_M = 2.5;
export const DEFAULT_PARKING_HEIGHT_CLEARANCE_M = 2.1;

export function resolveParkingSpaceLengthM(value: number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return DEFAULT_PARKING_SPACE_LENGTH_M;
}

export function resolveParkingSpaceWidthM(value: number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return DEFAULT_PARKING_SPACE_WIDTH_M;
}

export function resolveParkingHeightClearanceM(value: number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return DEFAULT_PARKING_HEIGHT_CLEARANCE_M;
}

export function parseParkingDimensionInput(value: string, fallback: number): number {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed * 100) / 100;
}
