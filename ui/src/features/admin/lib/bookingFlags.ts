/**
 * Shared booleans for booking list / card / calendar flag chips.
 */

/** Guest requested surprise decor / room setup (DB may use bool or legacy string). */
export function bookingRequestsSurpriseDecor(value: unknown): boolean {
  return value === true || value === 'true';
}
