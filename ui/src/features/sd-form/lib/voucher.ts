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
  | 'KAME-500'
  | 'KAME-1000'
  | 'KAME-STAY';

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
  { code: 'KAME-1000', amount: 1000 },
  { code: 'KAME-STAY', amount: 0 },
];

const VOUCHER_BY_CODE = new Map<VoucherCode, Voucher>(
  VOUCHER_CATALOG.map((v) => [v.code, v]),
);

/** Codes the server can award — mirror `supabase/functions/_shared/voucher.ts`. */
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

/** Slot reel decoys — only prizes guests can actually win. */
export const VOUCHER_REEL_POOL: ReadonlyArray<Voucher> = VOUCHER_WIN_POOL.flatMap(
  (code) => {
    const v = VOUCHER_BY_CODE.get(code);
    return v ? [v] : [];
  },
);

export const VOUCHER_DISCOUNT_MIN = 100;
export const VOUCHER_DISCOUNT_MAX = 1000;

export function formatVoucherDiscountRange(): string {
  return `₱${VOUCHER_DISCOUNT_MIN.toLocaleString('en-PH')}–₱${VOUCHER_DISCOUNT_MAX.toLocaleString('en-PH')} discount`;
}

export function isStaycationVoucher(v: { code: string }): boolean {
  return v.code === 'KAME-STAY' || v.code === 'FREE-STAY';
}

export function formatVoucherPrizeLabel(v: Pick<Voucher, 'code' | 'amount'>): string {
  if (isStaycationVoucher(v)) return 'Free staycation';
  return `₱${v.amount.toLocaleString('en-PH')}`;
}

export function voucherPrizeRank(v: Pick<Voucher, 'code' | 'amount'>): number {
  if (isStaycationVoucher(v)) return 10_000;
  return v.amount;
}

function dedupeVouchersByCode(vouchers: ReadonlyArray<Voucher>): Voucher[] {
  const seen = new Set<VoucherCode>();
  const out: Voucher[] = [];
  for (const v of vouchers) {
    if (seen.has(v.code)) continue;
    seen.add(v.code);
    out.push(v);
  }
  return out;
}

/**
 * Three ascending, non-redundant decoys in the slow pin before `winner`.
 * Prefer lower-tier prizes; when fewer than three exist below `winner`
 * (e.g. KAME-100), pad with other distinct win-pool amounts (150, 200, …).
 */
export function pickPreWinnerTeasers(
  winner: Voucher,
): [Voucher, Voucher, Voucher] {
  const winnerRank = voucherPrizeRank(winner);

  const belowWinner = dedupeVouchersByCode(
    VOUCHER_CATALOG.filter((v) => voucherPrizeRank(v) < winnerRank),
  ).sort((a, b) => voucherPrizeRank(a) - voucherPrizeRank(b));

  if (belowWinner.length >= 3) {
    return [
      belowWinner[belowWinner.length - 3]!,
      belowWinner[belowWinner.length - 2]!,
      belowWinner[belowWinner.length - 1]!,
    ];
  }

  const picked = new Map<VoucherCode, Voucher>();
  for (const v of belowWinner) {
    picked.set(v.code, v);
  }

  const fillers = dedupeVouchersByCode(
    [...VOUCHER_REEL_POOL, ...VOUCHER_CATALOG],
  )
    .filter((v) => v.code !== winner.code && !picked.has(v.code))
    .sort((a, b) => voucherPrizeRank(a) - voucherPrizeRank(b));

  for (const v of fillers) {
    if (picked.size >= 3) break;
    picked.set(v.code, v);
  }

  const floor = VOUCHER_BY_CODE.get('KAME-50') ?? {
    code: 'KAME-50' as const,
    amount: 50,
  };
  if (picked.size < 3 && !picked.has(floor.code)) {
    picked.set(floor.code, floor);
  }

  const ordered = [...picked.values()].sort(
    (a, b) => voucherPrizeRank(a) - voucherPrizeRank(b),
  );

  return [ordered[0]!, ordered[1]!, ordered[2]!];
}

export function findVoucher(code: string): Voucher | null {
  const normalized = code === 'FREE-STAY' ? 'KAME-STAY' : code;
  return VOUCHER_BY_CODE.get(normalized as VoucherCode) ?? null;
}
