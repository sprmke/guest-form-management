/** Ages 3 and below count as children for Azure pax reporting. */
export const CHILD_MAX_AGE = 3;

/** Valid government ID required for guests 18 and above. */
export const VALID_ID_MIN_AGE = 18;

/** Primary guest must be an adult — minors cannot be the primary guest. */
export const PRIMARY_GUEST_MIN_AGE = VALID_ID_MIN_AGE;

/** Default age pre-filled on guest age inputs. */
export const DEFAULT_GUEST_AGE = PRIMARY_GUEST_MIN_AGE;

/** Max/default age for the 5th person in the party (Azure: 4 adults + 1 child). */
export const FIFTH_PARTY_GUEST_MAX_AGE = 3;
/** @deprecated Use FIFTH_PARTY_GUEST_MAX_AGE */
export const FIFTH_GUEST_MAX_AGE = FIFTH_PARTY_GUEST_MAX_AGE;
export const DEFAULT_FIFTH_PARTY_GUEST_AGE = FIFTH_PARTY_GUEST_MAX_AGE;
/** @deprecated Use DEFAULT_FIFTH_PARTY_GUEST_AGE */
export const DEFAULT_FIFTH_GUEST_AGE = DEFAULT_FIFTH_PARTY_GUEST_AGE;

/** Azure GAF accepts at most this many adult guests per booking. */
export const AZURE_MAX_ADULTS = 4;

export const AZURE_ADULT_LIMIT_MESSAGE =
  'Please note that Azure only allows a maximum of 4 adults and 1 child in the unit and at the swimming pool. Please enter age 3 or below for the 5th guest.';

export function isPrimaryGuestAgeValid(age: number): boolean {
  return age >= PRIMARY_GUEST_MIN_AGE;
}

export const MAX_GUESTS = 5;

/** Default age when a guest card is shown or added (party positions 1–4 → 18; 5th person → 3). */
export function getDefaultAgeForPartyGuest(
  partyPosition: number,
  partySize: number,
): number {
  if (isPartyFifthGuest(partyPosition, partySize)) {
    return DEFAULT_FIFTH_PARTY_GUEST_AGE;
  }
  return DEFAULT_GUEST_AGE;
}

/** @deprecated Use getDefaultAgeForPartyGuest */
export function getDefaultAgeForGuestSlot(slotIndex: number): number {
  return getDefaultAgeForPartyGuest(slotIndex, slotIndex);
}

/** Active party size = highest slot with a name or age (1–5). */
export function getActivePartySize(guests: GuestSlotValues[]): number {
  return getInitialVisibleGuestCount(guests);
}

/** True for the 5th person in the party when the booking has 5 guests. */
export function isPartyFifthGuest(
  partyPosition: number,
  partySize: number,
): boolean {
  return partySize === MAX_GUESTS && partyPosition === MAX_GUESTS;
}

/** Normalize RHF / Zod age input — empty must not coerce to 0. */
export function preprocessGuestAgeInput(value: unknown): unknown {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isNaN(value)) return undefined;
  const n =
    typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Cleared ages use `null` in form state — `undefined` makes RHF fall back to
 * defaultValues (e.g. primary guest snaps back to 18).
 */
export function parseGuestAgeInputChange(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits === '') return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatGuestAgeInputValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  return '';
}

export function exceedsAzureAdultLimit(adults: number): boolean {
  return adults > AZURE_MAX_ADULTS;
}

/** Show Azure guest-limit guidance when adults exceed 4 or the party has 5 guests. */
export function shouldShowAzureAdultLimitMessage(
  adultCount: number,
  partySize = 0,
): boolean {
  if (partySize >= MAX_GUESTS) return true;
  return exceedsAzureAdultLimit(adultCount);
}

export function isChildAge(age: number): boolean {
  return age <= CHILD_MAX_AGE;
}

export function requiresValidId(age: number): boolean {
  return age >= VALID_ID_MIN_AGE;
}

export type GuestSlotValues = {
  name?: string;
  age?: number;
};

export function computeGuestCounts(guests: GuestSlotValues[]): {
  adults: number;
  children: number;
} {
  let adults = 0;
  let children = 0;

  for (const guest of guests) {
    const name = guest.name?.trim();
    if (!name) continue;

    const age = guest.age;
    if (age == null || Number.isNaN(age)) continue;

    if (isChildAge(age)) {
      children += 1;
    } else {
      adults += 1;
    }
  }

  return {
    adults: Math.max(adults, 1),
    children,
  };
}

/** Count adults/children from ages alone (used for live UI + Azure limit banner). */
export function computeGuestCountsByAge(
  guests: Array<{ age?: number | null }>,
): { adults: number; children: number } {
  let adults = 0;
  let children = 0;

  for (const guest of guests) {
    const age = guest.age;
    if (age == null || Number.isNaN(age)) continue;

    if (isChildAge(age)) {
      children += 1;
    } else {
      adults += 1;
    }
  }

  return { adults, children };
}

export function getFilledGuestCount(guests: GuestSlotValues[]): number {
  return guests.filter((guest) => guest.name?.trim()).length;
}

/** How many guest cards to show when loading or seeding the form. */
export function getInitialVisibleGuestCount(guests: GuestSlotValues[]): number {
  let highest = 1;
  guests.forEach((guest, index) => {
    if (guest.name?.trim() || guest.age != null) {
      highest = Math.max(highest, index + 1);
    }
  });
  return Math.min(MAX_GUESTS, highest);
}

const PARTY_GUEST_LABELS = [
  'Primary Guest',
  'Second Guest',
  'Third Guest',
  'Fourth Guest',
  'Fifth Guest',
] as const;

export function guestPartyPositionLabel(partyPosition: number): string {
  return PARTY_GUEST_LABELS[partyPosition - 1] ?? `Guest ${partyPosition}`;
}

const ADDITIONAL_GUEST_ORDINALS = [
  'second',
  'third',
  'fourth',
  'fifth',
] as const;

export function additionalGuestOrdinal(index: number): string {
  return ADDITIONAL_GUEST_ORDINALS[index - 1] ?? `guest ${index + 1}`;
}
