/**
 * Catalog of next-stay vouchers shown in the slot-machine reveal animation.
 * Server allow-list lives in `supabase/functions/_shared/voucher.ts`; keep
 * the values aligned when you add/remove items.
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

export interface Voucher {
  code: VoucherCode;
  amount: number;
}

export const VOUCHER_CATALOG: ReadonlyArray<Voucher> = [
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

const VOUCHER_BY_CODE = new Map<VoucherCode, Voucher>(
  VOUCHER_CATALOG.map((v) => [v.code, v]),
);

export function findVoucher(code: string): Voucher | null {
  return VOUCHER_BY_CODE.get(code as VoucherCode) ?? null;
}
