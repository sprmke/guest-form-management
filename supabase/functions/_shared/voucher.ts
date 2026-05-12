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
  | 'KAME-500';

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
];

/** Codes the server will actually award today. Tweak here to bias the rng. */
export const VOUCHER_WIN_POOL: ReadonlyArray<VoucherCode> = [
  'KAME-250',
  'KAME-300',
  'KAME-350',
];

const VOUCHER_INDEX = new Map<VoucherCode, number>(
  VOUCHER_CATALOG.map((v) => [v.code, v.amount]),
);

export function isVoucherCode(value: string): value is VoucherCode {
  return VOUCHER_INDEX.has(value as VoucherCode);
}

export function voucherAmountFor(code: VoucherCode): number {
  return VOUCHER_INDEX.get(code) ?? 0;
}

/**
 * Pick one voucher from the configured win pool.
 * Uses Web Crypto when available so the result is not predictable.
 */
export function rollVoucher(): { code: VoucherCode; amount: number } {
  const pool = VOUCHER_WIN_POOL;
  if (pool.length === 0) {
    return { code: 'KAME-250', amount: voucherAmountFor('KAME-250') };
  }
  let idx = 0;
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    idx = buf[0] % pool.length;
  } else {
    idx = Math.floor(Math.random() * pool.length);
  }
  const code = pool[idx];
  return { code, amount: voucherAmountFor(code) };
}
