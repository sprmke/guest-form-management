import { Link } from 'react-router-dom';

import { Gift, Ticket } from 'lucide-react';

import { GuestAccountContentCard } from '@/features/guest/account/components/GuestAccountContentCard';
import { GuestAccountEmptyState } from '@/features/guest/account/components/GuestAccountEmptyState';
import { useGuestVouchersQuery } from '@/features/guest/account/hooks/useGuestVouchersQuery';
import { formatVoucherOfferLabel } from '@/features/guest/account/lib/voucherDiscount';
import { guestFormPath } from '@/features/guest/lib/guestPublicPaths';

import { publicPageTitle, usePageTitle } from '@/lib/pageTitle';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/utils/format/bookingDisplay';

function VoucherCardSkeleton() {
  return (
    <div className="border-border bg-card animate-pulse rounded-2xl border p-4 shadow-sm">
      <div className="bg-muted h-4 w-24 rounded" />
      <div className="bg-muted mt-3 h-6 w-32 rounded" />
      <div className="bg-muted mt-2 h-3 w-40 rounded" />
    </div>
  );
}

export function GuestVouchersPage() {
  usePageTitle(publicPageTitle('Vouchers'));
  const { data: vouchers = [], isLoading } = useGuestVouchersQuery({ includeRedeemed: true });

  const available = vouchers.filter((v) => !v.redeemedAt);
  const used = vouchers.filter((v) => v.redeemedAt);

  if (isLoading) {
    return (
      <GuestAccountContentCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <VoucherCardSkeleton key={i} />
          ))}
        </div>
      </GuestAccountContentCard>
    );
  }

  if (vouchers.length === 0) {
    return (
      <GuestAccountEmptyState
        message="No vouchers yet."
        actionLabel="Browse properties"
        actionHref="/properties"
      />
    );
  }

  return (
    <GuestAccountContentCard>
      <div className="space-y-6">
        {available.length > 0 ? (
          <section className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Ready to use
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {available.map((v) => {
                const offer = formatVoucherOfferLabel({
                  code: v.code,
                  percentOff: v.percentOff,
                  legacyAmountPhp: v.legacyAmountPhp,
                });
                const bookHref = v.propertySlug ? guestFormPath(v.propertySlug) : '/properties';
                return (
                  <li key={v.sourceBookingId}>
                    <div
                      className={cn(
                        'border-border bg-card relative overflow-hidden rounded-2xl border p-4 shadow-sm',
                        'ring-1 ring-emerald-100/80 dark:ring-emerald-900/40'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                          <Ticket className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm font-semibold">
                            {v.propertyName ?? 'Property'}
                          </p>
                          <p className="mt-1 font-mono text-base font-bold tracking-wide text-emerald-800 dark:text-emerald-200">
                            {offer}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {v.code}
                            {v.awardedAt ? (
                              <>
                                {' · '}
                                <span title={v.awardedAt}>
                                  awarded {formatRelative(v.awardedAt)}
                                </span>
                              </>
                            ) : null}
                          </p>
                          <Link
                            to={bookHref}
                            className="text-primary mt-3 inline-flex min-h-[44px] items-center text-sm font-medium"
                          >
                            Book again
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {used.length > 0 ? (
          <section className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Used
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {used.map((v) => {
                const offer = formatVoucherOfferLabel({
                  code: v.code,
                  percentOff: v.percentOff,
                  legacyAmountPhp: v.legacyAmountPhp,
                });
                return (
                  <li key={v.sourceBookingId}>
                    <div className="border-border bg-muted/30 rounded-2xl border p-4 opacity-80">
                      <div className="flex items-start gap-3">
                        <span className="bg-muted text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                          <Gift className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm font-semibold">
                            {v.propertyName ?? 'Property'}
                          </p>
                          <p className="text-muted-foreground mt-1 text-sm">{offer}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Used
                            {v.redeemedAt ? (
                              <>
                                {' · '}
                                <span title={v.redeemedAt}>{formatRelative(v.redeemedAt)}</span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </GuestAccountContentCard>
  );
}
