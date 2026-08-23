export const PARKING_AUTOMATION_TOGGLE_KEYS = [
  'emailParkingReservationRequest',
  'emailParkingGuestConfirmed',
  'emailParkingNoHostAvailable',
] as const;

export type ParkingAutomationToggleKey = (typeof PARKING_AUTOMATION_TOGGLE_KEYS)[number];

export type ParkingAutomationToggles = Record<ParkingAutomationToggleKey, boolean>;

export const DEFAULT_PARKING_AUTOMATION_TOGGLES: ParkingAutomationToggles = {
  emailParkingReservationRequest: true,
  emailParkingGuestConfirmed: true,
  emailParkingNoHostAvailable: true,
};

export const PARKING_AUTOMATION_TOGGLE_LABELS: Record<ParkingAutomationToggleKey, string> = {
  emailParkingReservationRequest: 'Reservation request',
  emailParkingGuestConfirmed: 'Guest confirmed',
  emailParkingNoHostAvailable: 'No host available',
};

export function mergeParkingAutomationToggles(raw: unknown): ParkingAutomationToggles {
  const merged = { ...DEFAULT_PARKING_AUTOMATION_TOGGLES };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return merged;
  const record = raw as Record<string, unknown>;
  for (const key of PARKING_AUTOMATION_TOGGLE_KEYS) {
    if (typeof record[key] === 'boolean') merged[key] = record[key];
  }
  return merged;
}
