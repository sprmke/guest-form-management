import { Link } from 'react-router-dom';

import { CheckCircle2, Clock, Loader2, MapPin, RefreshCw, XCircle } from 'lucide-react';

import { ParkingStaySummary } from '@/components/parking/ParkingStaySummary';
import type { ParkingBookingStatusValue } from '@/features/guest/marketing/parkings/hooks/useParkingBookingStatus';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  ParkingBookingStatusValue,
  {
    label: string;
    headline: string;
    tone: 'waiting' | 'accepted' | 'ended';
    icon: typeof Clock;
  }
> = {
  PENDING_HOST_ACCEPTANCE: {
    label: 'Waiting for a host',
    headline: 'Finding a parking host',
    tone: 'waiting',
    icon: Clock,
  },
  PENDING_REVIEW: {
    label: 'Accepted',
    headline: 'Request accepted',
    tone: 'accepted',
    icon: CheckCircle2,
  },
  READY_FOR_CHECKIN: {
    label: 'Ready for check-in',
    headline: 'Ready for check-in',
    tone: 'accepted',
    icon: CheckCircle2,
  },
  COMPLETED: {
    label: 'Completed',
    headline: 'Stay completed',
    tone: 'accepted',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'Cancelled',
    headline: 'Request cancelled',
    tone: 'ended',
    icon: XCircle,
  },
  NO_HOST_AVAILABLE: {
    label: 'No host available',
    headline: 'No host was available',
    tone: 'ended',
    icon: XCircle,
  },
};

const TONE_STYLES: Record<
  'waiting' | 'accepted' | 'ended',
  { badge: string; iconWrap: string; icon: string }
> = {
  waiting: {
    badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200',
    icon: 'text-amber-600 dark:text-amber-300',
  },
  accepted: {
    badge: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
    iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
    icon: 'text-emerald-600 dark:text-emerald-300',
  },
  ended: {
    badge: 'bg-muted text-muted-foreground',
    iconWrap: 'bg-muted text-muted-foreground',
    icon: 'text-muted-foreground',
  },
};

type StatusData = {
  status: ParkingBookingStatusValue;
  checkInDate: string;
  checkOutDate: string;
  expiresAt: string | null;
  parkingLabel: string | null;
  endorsementNote: string | null;
  organizationName: string | null;
};

type CountdownState = {
  display: string | null;
  minutesLabel: string | null;
  remainingMs: number;
};

type Props = {
  data: StatusData;
  countdown: CountdownState;
  isRefetching?: boolean;
};

function RequestProgress({ status }: { status: ParkingBookingStatusValue }) {
  const steps = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'matching', label: 'Host match' },
    { key: 'confirmed', label: 'Confirmed' },
  ] as const;

  const activeIndex =
    status === 'PENDING_HOST_ACCEPTANCE'
      ? 1
      : ['PENDING_REVIEW', 'READY_FOR_CHECKIN', 'COMPLETED'].includes(status)
        ? 2
        : 0;

  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Request progress">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        return (
          <li key={step.key} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                done && 'bg-primary text-primary-foreground',
                current && !done && 'bg-primary/15 text-primary ring-primary/30 ring-2',
                !done && !current && 'bg-muted text-muted-foreground'
              )}
              aria-current={current ? 'step' : undefined}
            >
              {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : index + 1}
            </span>
            <span
              className={cn(
                'text-[11px] font-medium leading-tight',
                current ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ParkingRequestStatusView({ data, countdown, isRefetching }: Props) {
  const meta = STATUS_META[data.status];
  const tone = TONE_STYLES[meta.tone];
  const StatusIcon = meta.icon;
  const showProgress = data.status === 'PENDING_HOST_ACCEPTANCE';
  const showCountdown =
    data.status === 'PENDING_HOST_ACCEPTANCE' && countdown.display && countdown.remainingMs > 0;

  return (
    <div
      className="border-border bg-card mx-auto w-full max-w-lg overflow-hidden rounded-2xl border shadow-[0_8px_40px_-16px_rgba(0,0,0,0.12)]"
      aria-live="polite"
    >
      <div className="border-border/60 from-primary/[0.04] border-b bg-gradient-to-b to-transparent px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
              tone.iconWrap
            )}
          >
            <StatusIcon className={cn('h-6 w-6', tone.icon)} aria-hidden />
          </div>
          {isRefetching && (
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              <span className="sr-only">Updating status</span>
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              tone.badge
            )}
          >
            {meta.label}
          </span>
          <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
            {meta.headline}
          </h1>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-7">
        <ParkingStaySummary
          checkIn={data.checkInDate}
          checkOut={data.checkOutDate}
          organizationName={data.organizationName}
        />

        {showProgress && <RequestProgress status={data.status} />}

        {showCountdown && (
          <div className="border-border/80 bg-muted/20 flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium">Response window</p>
              <p className="text-muted-foreground text-xs">
                Hosts must respond before time runs out
              </p>
            </div>
            <p
              className="text-foreground shrink-0 font-mono text-lg font-semibold tabular-nums tracking-tight"
              aria-live="polite"
            >
              {countdown.display}
              <span className="sr-only">{countdown.minutesLabel}</span>
            </p>
          </div>
        )}

        {data.parkingLabel &&
          ['PENDING_REVIEW', 'READY_FOR_CHECKIN', 'COMPLETED'].includes(data.status) && (
            <div className="border-border/80 flex gap-3 rounded-xl border p-4">
              <MapPin className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium">Assigned slot</p>
                <p className="text-foreground text-sm font-semibold">{data.parkingLabel}</p>
              </div>
            </div>
          )}

        {data.endorsementNote && (
          <div className="border-border bg-muted/40 rounded-xl border p-4">
            <p className="text-muted-foreground mb-1 text-xs font-medium">Access instructions</p>
            <p className="text-foreground text-sm leading-relaxed">{data.endorsementNote}</p>
          </div>
        )}

        {data.status === 'NO_HOST_AVAILABLE' && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            No host was available for these dates. Try another listing or contact us for help.
          </p>
        )}

        {data.status === 'CANCELLED' && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            This request was cancelled. Browse other listings or contact us for help.
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          {data.status === 'PENDING_HOST_ACCEPTANCE' ? (
            <Button asChild variant="outline" className="min-h-[44px] flex-1">
              <Link to="/parkings">
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                Browse Parking
              </Link>
            </Button>
          ) : (
            <Button asChild className="min-h-[44px] flex-1">
              <Link to="/parkings">Browse Parking</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
