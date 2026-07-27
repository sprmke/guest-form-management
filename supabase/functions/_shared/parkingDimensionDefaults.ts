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

function readStoredDimension(settings: Record<string, unknown>, key: string): number | null {
  const value = settings[key];
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function readParkingSpaceLengthM(settings: Record<string, unknown>): number {
  return resolveParkingSpaceLengthM(readStoredDimension(settings, 'spaceLengthM'));
}

export function readParkingSpaceWidthM(settings: Record<string, unknown>): number {
  return resolveParkingSpaceWidthM(readStoredDimension(settings, 'spaceWidthM'));
}

export function readParkingHeightClearanceM(settings: Record<string, unknown>): number {
  return resolveParkingHeightClearanceM(readStoredDimension(settings, 'heightClearanceM'));
}
