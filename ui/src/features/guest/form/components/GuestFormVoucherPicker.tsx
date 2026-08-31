import { Ticket } from 'lucide-react';

import {
  formatVoucherOfferLabel,
  computePercentDiscountPhp,
} from '@/features/guest/account/lib/voucherDiscount';
import type { GuestVoucherDto } from '@/features/guest/account/lib/guestAccountApi';

import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/format/currency';

type Props = {
  propertySlug: string | null | undefined;
  selectedSourceBookingId: string | null | undefined;
  onSelect: (sourceBookingId: string | null) => void;
  vouchers: GuestVoucherDto[];
  isLoading?: boolean;
  /** Estimated stay subtotal before voucher (host rates × nights). */
  estimatedStayPhp?: number | null;
  className?: string;
};

export function GuestFormVoucherPicker({
  propertySlug,
  selectedSourceBookingId,
  onSelect,
  vouchers,
  isLoading = false,
  estimatedStayPhp,
  className,
}: Props) {
  const enabled = Boolean(propertySlug);

  if (!enabled || isLoading || vouchers.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)} role="group" aria-label="Vouchers">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Voucher</p>
      <ul className="space-y-2">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              'border-border flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
              !selectedSourceBookingId
                ? 'border-primary bg-primary/5 ring-primary/20 ring-1'
                : 'bg-card hover:bg-muted/40'
            )}
          >
            <span className="text-muted-foreground">None</span>
          </button>
        </li>
        {vouchers.map((v) => (
          <VoucherOption
            key={v.sourceBookingId}
            voucher={v}
            selected={selectedSourceBookingId === v.sourceBookingId}
            estimatedStayPhp={estimatedStayPhp}
            onSelect={() => onSelect(v.sourceBookingId)}
          />
        ))}
      </ul>
    </div>
  );
}

function VoucherOption({
  voucher,
  selected,
  estimatedStayPhp,
  onSelect,
}: {
  voucher: GuestVoucherDto;
  selected: boolean;
  estimatedStayPhp?: number | null;
  onSelect: () => void;
}) {
  const offer = formatVoucherOfferLabel({
    code: voucher.code,
    percentOff: voucher.percentOff,
    legacyAmountPhp: voucher.legacyAmountPhp,
  });
  const discount =
    estimatedStayPhp != null && voucher.percentOff > 0
      ? computePercentDiscountPhp(estimatedStayPhp, voucher.percentOff)
      : estimatedStayPhp != null && voucher.legacyAmountPhp
        ? Math.min(estimatedStayPhp, voucher.legacyAmountPhp)
        : null;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'border-border flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
          selected
            ? 'border-emerald-500/60 bg-emerald-50/80 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-800'
            : 'bg-card hover:bg-muted/40'
        )}
      >
        <span
          className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
            selected
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Ticket className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-foreground block text-sm font-semibold">{offer}</span>
          <span className="text-muted-foreground block font-mono text-xs">{voucher.code}</span>
        </span>
        {discount != null && discount > 0 ? (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            −{formatMoney(discount)}
          </span>
        ) : null}
      </button>
    </li>
  );
}
