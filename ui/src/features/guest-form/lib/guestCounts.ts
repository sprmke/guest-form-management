/** Guests aged 18+ count as adults everywhere except Azure occupancy checks on the guest form. */
export const ADULT_MIN_AGE = 18;

/** Valid government ID required for guests 18 and above. */
export const VALID_ID_MIN_AGE = ADULT_MIN_AGE;

/** Primary guest must be an adult — minors cannot be the primary guest. */
export const PRIMARY_GUEST_MIN_AGE = ADULT_MIN_AGE;

/** Default age pre-filled on guest age inputs. */
export const DEFAULT_GUEST_AGE = PRIMARY_GUEST_MIN_AGE;

/** Azure building rule: ages at or below this count as a child for occupancy limits. */
export const AZURE_CHILD_MAX_AGE = 3;

/** Max/default age for the 5th person on the public guest form (Azure: 4 adults + 1 child). */
export const FIFTH_PARTY_GUEST_MAX_AGE = AZURE_CHILD_MAX_AGE;
const DEFAULT_FIFTH_PARTY_GUEST_AGE = FIFTH_PARTY_GUEST_MAX_AGE;
/** @deprecated Use DEFAULT_FIFTH_PARTY_GUEST_AGE */
export const DEFAULT_FIFTH_GUEST_AGE = DEFAULT_FIFTH_PARTY_GUEST_AGE;

/** Azure GAF accepts at most this many adult guests per booking (Azure definition: age 4+). */
export const AZURE_MAX_ADULTS = 4;

export const AZURE_ADULT_LIMIT_MESSAGE =
  "Please note that Azure only allows a maximum of 4 adults and 1 child in the unit and at the swimming pool. Please enter age 3 or below for the 5th guest.";

export const MAX_GUESTS = 5;

/** Default age when adding a guest on the public guest form (5th person → 3 for Azure). */
export function getDefaultAgeForGuestFormPartyGuest(
  partyPosition: number,
  partySize: number,
): number {
  if (isPartyFifthGuest(partyPosition, partySize)) {
    return DEFAULT_FIFTH_PARTY_GUEST_AGE;
  }
  return DEFAULT_GUEST_AGE;
}

/** @deprecated Use getDefaultAgeForGuestFormPartyGuest on the public guest form only. */
export function getDefaultAgeForPartyGuest(
  partyPosition: number,
  partySize: number,
): number {
  return getDefaultAgeForGuestFormPartyGuest(partyPosition, partySize);
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
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isNaN(value)) return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Cleared ages use `null` in form state — `undefined` makes RHF fall back to
 * defaultValues (e.g. primary guest snaps back to 18).
 */
export function parseGuestAgeInputChange(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatGuestAgeInputValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number" && !Number.isNaN(value)) return String(value);
  return "";
}

function exceedsAzureAdultLimit(adults: number): boolean {
  return adults > AZURE_MAX_ADULTS;
}

/** Show Azure guest-limit guidance when Azure adults exceed 4 or the party has 5 guests. */
export function shouldShowAzureAdultLimitMessage(
  azureAdultCount: number,
  partySize = 0,
): boolean {
  if (partySize >= MAX_GUESTS) return true;
  return exceedsAzureAdultLimit(azureAdultCount);
}

/** General rule: under 18 = child. */
function isGeneralChildAge(age: number): boolean {
  return age < ADULT_MIN_AGE;
}

/** Azure occupancy rule: age 3 and below = child. Guest form only. */
function isAzureChildAge(age: number): boolean {
  return age <= AZURE_CHILD_MAX_AGE;
}

export function requiresValidId(age: number): boolean {
  return age >= VALID_ID_MIN_AGE;
}

export type GuestSlotValues = {
  name?: string;
  age?: number | null;
};

/** Count adults/children using the general 18+ rule (named guests only). */
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

    if (isGeneralChildAge(age)) {
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

/** Azure occupancy counts from ages alone — public guest form validation/banner only. */
export function computeAzureGuestCountsByAge(
  guests: Array<{ age?: number | null }>,
): { adults: number; children: number } {
  let adults = 0;
  let children = 0;

  for (const guest of guests) {
    const age = guest.age;
    if (age == null || Number.isNaN(age)) continue;

    if (isAzureChildAge(age)) {
      children += 1;
    } else {
      adults += 1;
    }
  }

  return { adults, children };
}

/** @deprecated Use computeAzureGuestCountsByAge on the guest form; computeGuestCounts elsewhere. */
export function computeGuestCountsByAge(
  guests: Array<{ age?: number | null }>,
): { adults: number; children: number } {
  return computeAzureGuestCountsByAge(guests);
}

export type BookingGuestAgeFields = {
  primary_guest_name?: string | null;
  primary_guest_age?: number | null;
  guest2_name?: string | null;
  guest2_age?: number | null;
  guest3_name?: string | null;
  guest3_age?: number | null;
  guest4_name?: string | null;
  guest4_age?: number | null;
  guest5_name?: string | null;
  guest5_age?: number | null;
  number_of_adults?: number | null;
  number_of_children?: number | null;
};

export function bookingGuestSlotsFromRow(
  row: BookingGuestAgeFields,
): GuestSlotValues[] {
  return [
    {
      name: row.primary_guest_name ?? undefined,
      age: row.primary_guest_age ?? undefined,
    },
    { name: row.guest2_name ?? undefined, age: row.guest2_age ?? undefined },
    { name: row.guest3_name ?? undefined, age: row.guest3_age ?? undefined },
    { name: row.guest4_name ?? undefined, age: row.guest4_age ?? undefined },
    { name: row.guest5_name ?? undefined, age: row.guest5_age ?? undefined },
  ];
}

/** Prefer recomputing from per-guest ages; fall back to stored DB counts. */
export function resolveGuestCountsFromBooking(row: BookingGuestAgeFields): {
  adults: number;
  children: number;
} {
  const slots = bookingGuestSlotsFromRow(row);
  const hasPerGuestAge = slots.some(
    (slot) => slot.name?.trim() && slot.age != null && !Number.isNaN(slot.age),
  );
  if (hasPerGuestAge) {
    return computeGuestCounts(slots);
  }
  return {
    adults: Math.max(row.number_of_adults ?? 1, 1),
    children: row.number_of_children ?? 0,
  };
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
  "Primary Guest",
  "Second Guest",
  "Third Guest",
  "Fourth Guest",
  "Fifth Guest",
] as const;

export function guestPartyPositionLabel(partyPosition: number): string {
  return PARTY_GUEST_LABELS[partyPosition - 1] ?? `Guest ${partyPosition}`;
}

const ADDITIONAL_GUEST_ORDINALS = [
  "second",
  "third",
  "fourth",
  "fifth",
] as const;

export function additionalGuestOrdinal(index: number): string {
  return ADDITIONAL_GUEST_ORDINALS[index - 1] ?? `guest ${index + 1}`;
}
