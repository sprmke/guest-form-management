import { Link } from 'react-router-dom';
import {
  Banknote,
  ExternalLink,
  ShieldAlert,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { formatBookingDate, formatMoney } from '@/features/admin/lib/formatters';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import type { FinanceBookingLedgerRow } from '@/features/finance/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  row: FinanceBookingLedgerRow | null;
  onClose: () => void;
};

export function StayFinanceDrawer({ row, onClose }: Props) {
  if (!row) return null;

  const fin = row.financials;
  const guestLabel =
    row.guest_facebook_name?.trim() ||
    row.primary_guest_name?.trim() ||
    'Guest';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[min(90dvh,32rem)] overflow-y-auto rounded-t-2xl border-t border-border bg-card shadow-elevated-lg sm:inset-x-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[min(100vw-1rem,24rem)] sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0"
        role="dialog"
        aria-labelledby="stay-finance-title"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-separator bg-card px-5 py-4">
          <div className="min-w-0">
            <h2
              id="stay-finance-title"
              className="truncate text-base font-bold text-foreground"
            >
              {guestLabel}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatBookingDate(row.check_in_date)} –{' '}
              {formatBookingDate(row.check_out_date)}
            </p>
            <div className="mt-2">
              <StatusBadge status={row.status} />
            </div>
          </div>
          <button
            type="button"
            className="flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <Section label="Guest balance" icon={Wallet}>
            <DetailRow label="Total due" value={formatMoney(fin.totalGuestBalance)} />
            <DetailRow
              label="Collected"
              value={formatMoney(fin.guestCollected)}
              highlight="positive"
            />
            <DetailRow
              label="Unpaid"
              value={formatMoney(fin.guestUnpaid)}
              highlight={
                fin.guestUnpaid != null && fin.guestUnpaid > 0
                  ? 'warning'
                  : undefined
              }
            />
          </Section>

          <Section label="Breakdown" icon={Banknote}>
            <DetailRow label="Parking margin" value={formatMoney(fin.parkingMargin)} />
            <DetailRow label="SD expenses" value={formatMoney(fin.sdExpenseTotal)} />
            <DetailRow label="SD profits" value={formatMoney(fin.sdProfitTotal)} />
          </Section>

          <Section
            label={fin.isCompleted ? 'Realized profit' : 'Projected'}
            icon={fin.isCompleted ? TrendingUp : ShieldAlert}
          >
            {fin.isCompleted ? (
              <>
                <DetailRow label="Host profit" value={formatMoney(fin.hostProfit)} bold />
                <DetailRow label="Host expenses" value={formatMoney(fin.hostExpenses)} />
                <div className="mt-2 rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Net result
                    </span>
                    <span
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        fin.hostNet >= 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {formatMoney(fin.hostNet)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-amber-500/10 p-3 dark:bg-amber-500/15">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Projected net
                  </span>
                  <span className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
                    {formatMoney(fin.projectedNet)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-amber-600/80 dark:text-amber-400/80">
                  Estimate — final amount after completion.
                </p>
              </div>
            )}
          </Section>
        </div>

        <div className="sticky bottom-0 border-t border-separator bg-card p-4">
          <Link
            to={`/bookings/${row.id}`}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl gradient-primary text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-[0_8px_28px_-6px_hsl(168_65%_40%_/_0.35)]"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open booking
          </Link>
        </div>
      </div>
    </>
  );
}

function Section({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof Wallet;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: 'positive' | 'negative' | 'warning';
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/40">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm tabular-nums',
          bold ? 'font-bold' : 'font-medium',
          highlight === 'positive' && 'text-emerald-700 dark:text-emerald-300',
          highlight === 'negative' && 'text-red-600 dark:text-red-400',
          highlight === 'warning' && 'text-amber-700 dark:text-amber-300',
          !highlight && 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  );
}
