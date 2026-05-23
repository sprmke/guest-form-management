import {
  AlertCircle,
  CalendarDays,
  Car,
  ParkingCircle,
  type LucideIcon,
} from 'lucide-react';

import {
  formatBookingDate,
  formatMoney,
} from '@/features/admin/lib/formatters';
import type { PayParkingBootstrap } from '@/features/pay-parking/lib/api';

function PayParkingSectionShell({
  icon: Icon,
  title,
  ariaLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className="form-section !px-4 !py-5 sm:!px-5 sm:!py-6"
    >
      <div className="form-section-header">
        <Icon className="form-section-icon" aria-hidden />
        <h2 className="form-section-title !text-base sm:!text-lg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PayParkingHighlightBox({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="px-4 py-4 rounded-lg border-2 border-primary/25 bg-primary/5"
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export function PayParkingIntro({ data }: { data: PayParkingBootstrap }) {
  const nights = data.number_of_nights || 1;

  return (
    <PayParkingSectionShell
      icon={CalendarDays}
      title="Booking Info"
      ariaLabel="Booking Info"
    >
      <div className="space-y-2">
        <p className="text-xl font-bold text-foreground">
          {data.primary_guest_name}
        </p>
        <p className="text-sm font-medium leading-snug font-base text-foreground">
          {formatBookingDate(data.check_in_date)} –{' '}
          {formatBookingDate(data.check_out_date)}
        </p>
        <p className="text-sm font-semibold text-primary/70">
          {nights} night{nights !== 1 ? 's' : ''} · {data.pax} guest
          {data.pax !== 1 ? 's' : ''}
        </p>
      </div>
    </PayParkingSectionShell>
  );
}

export function PayParkingDetailsCard({ data }: { data: PayParkingBootstrap }) {
  const nights = data.number_of_parking_nights || 1;
  const ratePerNight = data.parking_rate_guest;
  const totalEstimate = ratePerNight * nights;

  return (
    <PayParkingSectionShell
      icon={ParkingCircle}
      title="Parking Details"
      ariaLabel="Parking Details"
    >
      <PayParkingHighlightBox ariaLabel="Parking details breakdown">
        <div className="space-y-2">
          <p className="text-sm font-medium leading-snug text-foreground">
            {formatBookingDate(data.parking_check_in_date)} –{' '}
            {formatBookingDate(data.parking_check_out_date)}
          </p>
          <div className="flex gap-4 justify-between items-center pt-2 border-t border-primary/15">
            <span className="text-2xl font-bold tabular-nums tracking-tight text-primary sm:text-3xl">
              {formatMoney(totalEstimate)}
            </span>
            <p className="text-sm font-semibold text-primary/70">
              {formatMoney(ratePerNight)} / night
            </p>
          </div>
        </div>
      </PayParkingHighlightBox>
    </PayParkingSectionShell>
  );
}

/** @deprecated Use PayParkingDetailsCard */
export const PayParkingRateCard = PayParkingDetailsCard;

export function PayParkingLastMinuteWarning() {
  return (
    <p
      className="mt-3 flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-left text-sm leading-relaxed text-amber-950/90"
      role="alert"
    >
      <AlertCircle
        className="mt-0.5 size-4 shrink-0 text-amber-600"
        aria-hidden
      />
      <span>
        For last-minute parking requests, please allow us additional time to
        secure a parking slot, as paid parking availability is limited.
      </span>
    </p>
  );
}

export function PayParkingNonRefundableNote() {
  return (
    <p
      className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm leading-relaxed text-amber-950/90"
      role="note"
    >
      <AlertCircle
        className="mt-0.5 size-4 shrink-0 text-amber-600"
        aria-hidden
      />
      <span>
        Parking fee is{' '}
        <span className="font-semibold">
          non-refundable and cannot be re-scheduled
        </span>{' '}
        after you submit.
      </span>
    </p>
  );
}

export function PayParkingVehicleSection({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PayParkingSectionShell
      icon={Car}
      title="Vehicle Info"
      ariaLabel="Vehicle Info"
    >
      <PayParkingNonRefundableNote />
      <div className="mt-4 space-y-4">{children}</div>
    </PayParkingSectionShell>
  );
}
