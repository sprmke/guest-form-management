import {
  buildHostNetBreakdown,
  computeBookingFinancials,
  type HostNetBreakdown,
  type HostNetBreakdownLine,
} from '@/features/admin/lib/bookingFinance';
import { formatMoney, formatRelative } from '@/features/admin/lib/formatters';
import type { BookingRow } from '@/features/admin/lib/types';
import {
  computeTotalGuestBalance,
  guestBalancePaidRecorded,
} from '@/features/admin/lib/totalGuestBalance';
import { cn } from '@/lib/utils';

export const SD_REFUND_METHOD_LABELS: Record<string, string> = {
  same_phone: 'Refund to same phone (GCash)',
  other_bank: 'Bank transfer',
  cash: 'Cash pickup',
};

/** Minimum booking fields needed to render the pricing / settlement / P&L summary. */
export type BookingPricingSummarySource = Pick<
  BookingRow,
  | 'status'
  | 'booking_source'
  | 'booking_rate'
  | 'down_payment'
  | 'balance'
  | 'security_deposit'
  | 'has_pets'
  | 'pet_fee'
  | 'need_parking'
  | 'parking_rate_guest'
  | 'parking_rate_paid'
  | 'guest_additional_fee'
  | 'guest_balance_paid_amount'
  | 'sd_refund_amount'
  | 'sd_refund_method'
  | 'sd_refund_bank'
  | 'sd_refund_account_name'
  | 'sd_refund_account_number'
  | 'sd_refund_phone_confirmed'
  | 'sd_refund_guest_feedback'
  | 'sd_refund_form_emailed_at'
  | 'sd_refund_form_submitted_at'
  | 'settled_at'
  | 'sd_additional_expense_items'
  | 'sd_additional_profit_items'
  | 'sd_additional_expenses'
  | 'sd_additional_profits'
>;

type Props = {
  booking: BookingPricingSummarySource;
  /** `page` = booking detail (rates when in-progress; breakdown when completed). `modal` = finance drawer. */
  layout?: 'page' | 'modal';
  /** Show projected net for in-progress stays (finance modal). */
  showProjectedEstimate?: boolean;
  className?: string;
};

export function BookingPricingSummary({
  booking,
  layout = 'page',
  showProjectedEstimate = false,
  className,
}: Props) {
  if (booking.status === 'PENDING_REVIEW') {
    return (
      <p className={cn('text-caption text-muted-foreground', className)}>
        Rates are set when the booking moves out of Pending Review.
      </p>
    );
  }

  const isCompleted = booking.status === 'COMPLETED';
  const totalGuestBalance = computeTotalGuestBalance(booking);
  const paidTowardBalance = guestBalancePaidRecorded(booking);
  const unpaidCents =
    totalGuestBalance != null
      ? Math.round(totalGuestBalance * 100) -
        Math.round(paidTowardBalance * 100)
      : null;
  const fin = computeBookingFinancials(booking);
  const hostNetBreakdown = buildHostNetBreakdown(booking, isCompleted);
  const showGuestSettlement =
    totalGuestBalance != null && unpaidCents != null && unpaidCents > 0;

  const ratesGridClass =
    layout === 'page'
      ? 'grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-3'
      : '';

  if (layout === 'modal') {
    return (
      <div className={cn('space-y-3', className)}>
        <HostNetBreakdownCard
          breakdown={hostNetBreakdown}
          title={isCompleted ? 'Breakdown' : 'Estimated breakdown'}
          titleEmphasis="prominent"
        />

        {!isCompleted && showProjectedEstimate && fin.projectedNet != null ? (
          <p className="text-caption leading-relaxed text-muted-foreground">
            Estimate until SD refund is settled. Open booking for final details.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {!isCompleted ? (
        <div>
          <p className="mb-2 text-overline">Rates &amp; fees</p>
          <div className={ratesGridClass}>
            <PricingInfoField
              label="Booking rate"
              value={formatMoney(booking.booking_rate as number)}
            />
            <PricingInfoField
              label="Down payment"
              value={formatMoney(booking.down_payment as number)}
            />
            <PricingInfoField
              label="Security deposit"
              value={formatMoney(booking.security_deposit as number)}
            />
            <PricingInfoField
              label="Balance after down (recorded)"
              value={formatMoney(booking.balance as number)}
            />
            <PricingInfoField
              label="Pet fee"
              value={
                booking.has_pets === true
                  ? formatMoney(booking.pet_fee as number)
                  : '—'
              }
            />
            <PricingInfoField
              label="Parking fee (guest)"
              value={
                booking.need_parking === true
                  ? formatMoney(booking.parking_rate_guest as number)
                  : '—'
              }
            />
            <PricingInfoField
              label="Parking Owner Rate"
              value={formatMoney(booking.parking_rate_paid as number)}
            />
            <PricingInfoField
              label="Additional guest fee"
              value={formatMoney(booking.guest_additional_fee as number)}
            />
          </div>
        </div>
      ) : null}

      {showGuestSettlement ? (
        <div className="overflow-hidden rounded-lg border border-border/50">
          <p className="bg-muted/50 px-4 py-1.5 text-overline">Guest settlement</p>
          <div className="divide-y divide-separator bg-card">
            <PricingMiniRow
              label="Total guest balance"
              value={formatMoney(totalGuestBalance)}
            />
            <PricingMiniRow
              label="Balance paid"
              value={
                paidTowardBalance > 0 ? formatMoney(paidTowardBalance) : '—'
              }
            />
            <PricingMiniRow
              label="Unpaid"
              value={formatMoney(unpaidCents / 100)}
              valueClass="text-amber-800 dark:text-amber-300"
            />
          </div>
        </div>
      ) : null}

      {isCompleted ? (
        <HostNetBreakdownCard
          breakdown={hostNetBreakdown}
          title="Breakdown"
          titleEmphasis="prominent"
        />
      ) : null}

      {!isCompleted && showProjectedEstimate && fin.projectedNet != null ? (
        <HostNetBreakdownCard
          breakdown={hostNetBreakdown}
          title="Estimated breakdown"
          titleEmphasis="prominent"
        />
      ) : null}

      {isCompleted ? <SdRefundSummaryCard booking={booking} /> : null}
    </div>
  );
}

function SdRefundSummaryCard({
  booking,
}: {
  booking: BookingPricingSummarySource;
}) {
  const refundMethodLabel = booking.sd_refund_method
    ? (SD_REFUND_METHOD_LABELS[booking.sd_refund_method] ??
      booking.sd_refund_method)
    : null;

  const phoneConfirmedLabel =
    booking.sd_refund_phone_confirmed === true
      ? 'Yes'
      : booking.sd_refund_phone_confirmed === false
        ? 'No'
        : null;

  const milestones = [
    {
      label: 'Form emailed',
      value: booking.sd_refund_form_emailed_at
        ? formatRelative(booking.sd_refund_form_emailed_at)
        : null,
    },
    {
      label: 'Form submitted',
      value: booking.sd_refund_form_submitted_at
        ? formatRelative(booking.sd_refund_form_submitted_at)
        : null,
    },
    {
      label: 'Settled',
      value: booking.settled_at ? formatRelative(booking.settled_at) : null,
    },
  ];

  const bankName = booking.sd_refund_bank?.trim() || null;
  const accountName = booking.sd_refund_account_name?.trim() || null;
  const accountNumber = booking.sd_refund_account_number?.trim() || null;
  const guestFeedback = booking.sd_refund_guest_feedback?.trim() || null;

  const hasBankDetails = Boolean(bankName || accountName || accountNumber);
  const hasRefundDetails = Boolean(
    refundMethodLabel ||
      hasBankDetails ||
      phoneConfirmedLabel ||
      guestFeedback,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border/50">
      <p className="bg-muted/50 px-4 py-1.5 text-overline">
        Security deposit refund
      </p>

      <div className="border-b border-separator bg-card">
        <p className="px-4 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Timeline
        </p>
        <div className="grid grid-cols-1 gap-2 px-4 py-2.5 sm:grid-cols-3">
          {milestones.map((milestone) => (
            <SdRefundMilestone key={milestone.label} {...milestone} />
          ))}
        </div>
      </div>

      {hasRefundDetails ? (
        <div className="divide-y divide-separator border-b border-separator bg-card">
          <p className="px-4 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Refund details
          </p>
          <div className="divide-y divide-separator">
            {refundMethodLabel ? (
              <PricingMiniRow label="Method" value={refundMethodLabel} />
            ) : null}

            {hasBankDetails ? (
              <>
                {bankName ? (
                  <PricingMiniRow label="Bank" value={bankName} />
                ) : null}
                {accountName ? (
                  <PricingMiniRow label="Account name" value={accountName} />
                ) : null}
                {accountNumber ? (
                  <PricingMiniRow
                    label="Account number"
                    value={accountNumber}
                  />
                ) : null}
              </>
            ) : null}

            {phoneConfirmedLabel ? (
              <PricingMiniRow
                label="Phone confirmed"
                value={phoneConfirmedLabel}
              />
            ) : null}

            {guestFeedback ? (
              <div className="px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Guest feedback
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {guestFeedback}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SdRefundMilestone({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const isDone = value != null;
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        isDone
          ? 'border-border/60 bg-muted/30'
          : 'border-dashed border-border/40 bg-transparent',
      )}
    >
      <p className="text-overline">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-sm tabular-nums',
          isDone
            ? 'font-semibold text-foreground'
            : 'font-medium text-muted-foreground',
        )}
      >
        {value ?? 'Pending'}
      </p>
    </div>
  );
}

function HostNetBreakdownCard({
  breakdown,
  title,
  embedded = false,
  titleEmphasis = 'default',
}: {
  breakdown: HostNetBreakdown;
  title: string;
  embedded?: boolean;
  titleEmphasis?: 'default' | 'prominent';
}) {
  const titleClassName =
    titleEmphasis === 'prominent'
      ? 'px-4 py-2.5 text-sm font-bold tracking-tight text-foreground sm:text-base'
      : 'bg-muted/50 px-4 py-1.5 text-overline';
  const netClass =
    breakdown.net > 0
      ? 'text-emerald-700 dark:text-emerald-300'
      : breakdown.net < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground';

  const body = (
    <div className="divide-y divide-separator bg-card">
      <HostNetBreakdownSection
        title="Income"
        lines={breakdown.income}
        titleClassName="text-emerald-700 dark:text-emerald-300"
      />
      {breakdown.sd ? (
        <HostNetBreakdownSdSection sd={breakdown.sd} />
      ) : null}
      <HostNetBreakdownSection
        title="Expenses"
        lines={breakdown.expenses}
        titleClassName="text-red-600 dark:text-red-400"
      />
      <PricingMiniRow
        label="Net"
        bold
        value={formatMoney(breakdown.net)}
        valueClass={netClass}
      />
      {breakdown.isEstimate ? (
        <p className="px-4 pb-2.5 pt-0 text-caption text-muted-foreground">
          SD refund not included until the stay is completed.
        </p>
      ) : null}
    </div>
  );

  if (embedded) {
    return (
      <>
        <p className={titleClassName}>{title}</p>
        {body}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/50">
      <p
        className={cn(
          titleClassName,
          titleEmphasis === 'prominent' && 'border-b border-separator bg-muted/30',
        )}
      >
        {title}
      </p>
      {body}
    </div>
  );
}

function HostNetBreakdownSection({
  title,
  lines,
  titleClassName,
}: {
  title: string;
  lines: HostNetBreakdownLine[];
  titleClassName?: string;
}) {
  if (lines.length === 0) return null;

  return (
    <div>
      <p
        className={cn(
          'bg-muted/50 px-4 py-1.5 text-overline',
          titleClassName,
        )}
      >
        {title}
      </p>
      <div className="divide-y divide-separator">
        {lines.map((line) => (
          <HostNetBreakdownRow key={line.key} line={line} />
        ))}
      </div>
    </div>
  );
}

function HostNetBreakdownSdSection({
  sd,
}: {
  sd: NonNullable<HostNetBreakdown['sd']>;
}) {
  return (
    <div className="divide-y divide-separator">
      {sd.lines.map((line) => (
        <HostNetBreakdownRow key={line.key} line={line} />
      ))}
    </div>
  );
}

function HostNetBreakdownRow({ line }: { line: HostNetBreakdownLine }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-2 pr-4',
        line.indent ? 'pl-7' : 'pl-4',
      )}
    >
      <span
        className={cn(
          'min-w-0 truncate text-xs font-medium text-muted-foreground',
          line.indent && 'text-muted-foreground/90',
        )}
      >
        {line.label}
      </span>
      <span className="shrink-0 text-data-primary tabular-nums text-foreground">
        {formatMoney(line.amount)}
      </span>
    </div>
  );
}

function PricingMiniRow({
  label,
  value,
  valueClass,
  bold,
  children,
}: {
  label: string;
  value?: string;
  valueClass?: string;
  bold?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <span
        className={cn(
          'text-xs uppercase tracking-wider',
          bold ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
        )}
      >
        {label}
      </span>
      {children ?? (
        <span
          className={cn(
            'text-data-primary tabular-nums',
            bold ? 'font-bold' : 'font-semibold',
            valueClass ?? 'text-foreground',
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function PricingInfoField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === '' || value === '—') {
    return null;
  }
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-overline">{label}</span>
      <span className="text-sm text-foreground">{String(value)}</span>
    </div>
  );
}

