/**
 * Same formula as the admin UI `computeTotalGuestBalance`:
 * booking_rate − down_payment + security_deposit + pet_fee + parking_rate_guest + guest_additional_fee.
 */

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export function computeTotalGuestBalanceFromBooking(
  booking: Record<string, unknown>,
): number | null {
  const raw = booking.booking_rate;
  if (raw === null || raw === undefined || raw === '') return null;
  const rate = num(raw);
  return (
    rate -
    num(booking.down_payment) +
    num(booking.security_deposit) +
    num(booking.pet_fee) +
    num(booking.parking_rate_guest) +
    num(booking.guest_additional_fee)
  );
}
