/** Occupied nights for calendar math; defaults to 1 when missing/invalid. */
export function occupiedNightCount(nights: number | null | undefined): number {
  if (nights == null || !Number.isFinite(nights) || nights < 1) return 1;
  return Math.floor(nights);
}

/** Split a stay total across occupied nights (each calendar cell is one night). */
export function amountPerOccupiedNight(
  total: number | string | null | undefined,
  nights: number | null | undefined,
): number | null {
  if (total === null || total === undefined || total === "") return null;
  const amount = typeof total === "string" ? Number(total) : total;
  if (Number.isNaN(amount)) return null;
  return amount / occupiedNightCount(nights);
}
