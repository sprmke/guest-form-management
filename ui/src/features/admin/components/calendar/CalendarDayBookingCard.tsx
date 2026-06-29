import {
  ArrowUpRight,
  Car,
  Dog,
  PartyPopper,
} from 'lucide-react';
import { GuestAvatar } from '@/features/admin/components/GuestAvatar';
import { StatusBadge } from '@/features/admin/components/StatusBadge';
import { hostNetToneClass } from '@/features/admin/lib/bookingFinance';
import {
  bookingRequestsSurpriseDecor,
  bookingFlagIconChipClass,
} from '@/features/admin/lib/bookingFlags';
import {
  formatBookingDate,
  formatMoney,
} from '@/features/admin/lib/formatters';
import { cn } from '@/lib/utils';

type CalendarDayBookingCardSource = {
  id: string;
  primary_guest_name: string;
  guest_facebook_name: string;
  guest_email: string;
  valid_id_url: string | null;
  status: string;
  need_parking: boolean | null;
  has_pets: boolean | null;
  guest_requests_surprise_decor?: unknown;
  check_in_date: string;
  check_out_date: string;
  number_of_nights: number | null;
};

type CalendarDayBookingCardAmount =
  | { mode: 'booking_rate'; amount: number | string | null | undefined }
  | {
      mode: 'host_net';
      amount: number | null;
      isRealized: boolean;
    };

type Props = {
  row: CalendarDayBookingCardSource;
  amount: CalendarDayBookingCardAmount;
  onOpen: () => void;
};

export function CalendarDayBookingCard({ row, amount, onOpen }: Props) {
  const name =
    row.primary_guest_name ||
    row.guest_facebook_name ||
    row.guest_email ||
    'Guest';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open details for ${name}`}
      className={cn(
        'group w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors',
        'border border-border/50',
        'hover:bg-muted/50 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/40',
      )}
    >
      <GuestAvatar
        name={name}
        validIdUrl={row.valid_id_url}
        size="md"
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 justify-between items-start">
          <p className="text-[13px] font-bold text-foreground truncate">{name}</p>
          <ArrowUpRight
            className="size-3.5 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors"
            aria-hidden
          />
        </div>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={row.status} />
          {row.need_parking === true && (
            <span
              title="Needs parking"
              className={cn('size-5 rounded', bookingFlagIconChipClass.parking)}
            >
              <Car className="size-3" aria-hidden />
            </span>
          )}
          {row.has_pets === true && (
            <span
              title="Has pets"
              className={cn('size-5 rounded', bookingFlagIconChipClass.pet)}
            >
              <Dog className="size-3" aria-hidden />
            </span>
          )}
          {bookingRequestsSurpriseDecor(row.guest_requests_surprise_decor) && (
            <span
              title="Surprise decor setup"
              className={cn('size-5 rounded', bookingFlagIconChipClass.decor)}
            >
              <PartyPopper className="size-3" aria-hidden />
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground truncate">
          {formatBookingDate(row.check_in_date)}
          <span className="mx-1.5 text-muted-foreground/50">→</span>
          {formatBookingDate(row.check_out_date)}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {row.number_of_nights != null ? (
            <>
              {row.number_of_nights}{' '}
              {row.number_of_nights === 1 ? 'night' : 'nights'}
            </>
          ) : null}
          {amount.amount != null && (
            <>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <CalendarDayAmount amount={amount} />
            </>
          )}
        </p>
      </div>
    </button>
  );
}

function CalendarDayAmount({ amount }: { amount: CalendarDayBookingCardAmount }) {
  if (amount.mode === 'booking_rate') {
    return (
      <span className="font-semibold text-muted-foreground">
        {formatMoney(amount.amount)}
      </span>
    );
  }

  const { amount: net, isRealized } = amount;
  const tone = hostNetToneClass(net, isRealized);

  return (
    <span className={cn('font-semibold tabular-nums', tone)}>
      {formatMoney(net)}
      {!isRealized && net != null ? (
        <span className="ml-1 align-middle text-[9px] font-medium uppercase tracking-wide text-amber-600/90 dark:text-amber-400/90">
          est
        </span>
      ) : null}
    </span>
  );
}
