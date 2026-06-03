/**
 * Next-stay voucher catalog and current win pool.
 *
 * Server is the source of truth: even though the UI also has a list, the
 * edge function validates that the requested voucher code is in the
 * `WIN_POOL` (and falls back to a server-side roll otherwise).
 *
 * Allowed values mirror `ui/src/features/sd-form/lib/voucher.ts`. Keep both
 * lists in sync when the catalog changes.
 */

export type VoucherCode =
  | 'KAME-50'
  | 'KAME-100'
  | 'KAME-150'
  | 'KAME-200'
  | 'KAME-250'
  | 'KAME-300'
  | 'KAME-350'
  | 'KAME-400'
  | 'KAME-450'
  | 'KAME-500'
  | 'KAME-1000'
  | 'KAME-STAY';

export const VOUCHER_CATALOG: ReadonlyArray<{ code: VoucherCode; amount: number }> = [
  { code: 'KAME-50', amount: 50 },
  { code: 'KAME-100', amount: 100 },
  { code: 'KAME-150', amount: 150 },
  { code: 'KAME-200', amount: 200 },
  { code: 'KAME-250', amount: 250 },
  { code: 'KAME-300', amount: 300 },
  { code: 'KAME-350', amount: 350 },
  { code: 'KAME-400', amount: 400 },
  { code: 'KAME-450', amount: 450 },
  { code: 'KAME-500', amount: 500 },
  { code: 'KAME-1000', amount: 1000 },
  { code: 'KAME-STAY', amount: 0 },
];

/** Codes that may be awarded (odds in `VOUCHER_WIN_WEIGHTS`). */
export const VOUCHER_WIN_POOL: ReadonlyArray<VoucherCode> = [
  'KAME-100',
  'KAME-150',
  'KAME-200',
  'KAME-250',
  'KAME-300',
  'KAME-350',
  'KAME-400',
  'KAME-450',
  'KAME-500',
  'KAME-1000',
  'KAME-STAY',
];

/**
 * Relative weights for `rollVoucher()` (total 1000 → divide by 10 for %).
 * `KAME-STAY` is intentionally rare (0.5%).
 */
export const VOUCHER_WIN_WEIGHTS: ReadonlyArray<{
  code: VoucherCode;
  weight: number;
}> = [
  { code: 'KAME-100', weight: 50 },
  { code: 'KAME-150', weight: 50 },
  { code: 'KAME-200', weight: 50 },
  { code: 'KAME-250', weight: 252 },
  { code: 'KAME-300', weight: 252 },
  { code: 'KAME-350', weight: 251 },
  { code: 'KAME-400', weight: 30 },
  { code: 'KAME-450', weight: 30 },
  { code: 'KAME-500', weight: 20 },
  { code: 'KAME-1000', weight: 10 },
  { code: 'KAME-STAY', weight: 5 },
];

const VOUCHER_INDEX = new Map<VoucherCode, number>(
  VOUCHER_CATALOG.map((v) => [v.code, v.amount]),
);

export function isVoucherCode(value: string): value is VoucherCode {
  if (value === 'FREE-STAY') return true;
  return VOUCHER_INDEX.has(value as VoucherCode);
}

export function voucherAmountFor(code: string): number {
  if (code === 'FREE-STAY') return 0;
  return VOUCHER_INDEX.get(code as VoucherCode) ?? 0;
}

/**
 * Pick one voucher using `VOUCHER_WIN_WEIGHTS`.
 * Uses Web Crypto when available so the result is not predictable.
 */
export function rollVoucher(): { code: VoucherCode; amount: number } {
  const weights = VOUCHER_WIN_WEIGHTS;
  const total = weights.reduce((sum, row) => sum + row.weight, 0);
  if (total <= 0) {
    return { code: 'KAME-250', amount: voucherAmountFor('KAME-250') };
  }

  let roll = 0;
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    roll = buf[0] % total;
  } else {
    roll = Math.floor(Math.random() * total);
  }

  for (const { code, weight } of weights) {
    if (roll < weight) {
      return { code, amount: voucherAmountFor(code) };
    }
    roll -= weight;
  }

  const fallback = weights[weights.length - 1]?.code ?? 'KAME-250';
  return { code: fallback, amount: voucherAmountFor(fallback) };
}
