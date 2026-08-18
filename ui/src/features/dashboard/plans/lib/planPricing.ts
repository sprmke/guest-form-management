/**
 * Subscription list price + discount math — keep in sync with supabase/functions/_shared/planPricing.ts.
 */

export function normalizePlanDiscountPercent(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.floor(value)));
}

/** Whole pesos only; always rounds down. */
export function discountedPlanPricePhp(
  listPricePhp: number | null | undefined,
  discountPercent: number | null | undefined
): number {
  const list = Math.max(0, Math.floor(Number(listPricePhp ?? 0)));
  if (list <= 0) return 0;

  const discount = normalizePlanDiscountPercent(discountPercent);
  if (discount <= 0) return list;
  if (discount >= 100) return 0;

  return Math.floor((list * (100 - discount)) / 100);
}
