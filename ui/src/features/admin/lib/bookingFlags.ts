/**
 * Shared booleans for booking list / card / calendar flag chips.
 */

/** Guest requested surprise decor / room setup (DB may use bool or legacy string). */
export function bookingRequestsSurpriseDecor(value: unknown): boolean {
  return value === true || value === 'true';
}

/** Icon-only flag chips (table, card grid, calendar day panel). */
export const bookingFlagIconChipClass = {
  parking:
    'inline-flex items-center justify-center rounded-md bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
  pet: 'inline-flex items-center justify-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  decor:
    'inline-flex items-center justify-center rounded-md bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200/70 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-500/30',
} as const;

/** Compact labeled flag chips (mobile summary). */
export const bookingFlagLabelChipClass = {
  parking:
    'inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200/80 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
  pet: 'inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  decor:
    'inline-flex items-center gap-1 rounded-md bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800 ring-1 ring-inset ring-fuchsia-200/80 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-500/30',
} as const;
