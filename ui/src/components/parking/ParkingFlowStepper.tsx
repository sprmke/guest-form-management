import { cn } from '@/lib/utils';

export type ParkingFlowStepItem = {
  id: string;
  label: string;
};

type Props = {
  steps: readonly ParkingFlowStepItem[];
  /** 0-based active index. */
  activeIndex: number;
  className?: string;
};

/**
 * Shared parking-flow stepper — all labels · trail + fraction + segmented bar.
 * Same chrome on registration form, guest status, and host booking detail.
 */
export function ParkingFlowStepper({ steps, activeIndex, className }: Props) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(steps.length - 1, 0));
  const current = steps[safeIndex];
  const displayIndex = safeIndex + 1;

  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-muted-foreground min-w-0 text-xs font-medium uppercase tracking-wide">
          {steps.map((step, index) => (
            <span key={step.id}>
              {index > 0 ? <span className="text-border mx-1.5">·</span> : null}
              <span
                className={cn(index === safeIndex && 'text-foreground font-semibold')}
                aria-current={index === safeIndex ? 'step' : undefined}
              >
                {step.label}
              </span>
            </span>
          ))}
        </p>
        <p className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {displayIndex}/{steps.length}
        </p>
      </div>
      <div
        className="mt-2.5 flex items-center gap-1"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={displayIndex}
        aria-valuetext={`Step ${displayIndex} of ${steps.length}: ${current?.label ?? ''}`}
      >
        {steps.map((step, index) => (
          <span
            key={step.id}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              index <= safeIndex ? 'bg-primary' : 'bg-muted'
            )}
            aria-hidden
          />
        ))}
      </div>
    </nav>
  );
}

export const PARKING_REQUEST_FORM_STEPS: ParkingFlowStepItem[] = [
  { id: 'guest', label: 'Guest' },
  { id: 'booking', label: 'Booking' },
  { id: 'vehicle', label: 'Vehicle' },
];

export const PARKING_STATUS_FLOW_STEPS: ParkingFlowStepItem[] = [
  { id: 'match', label: 'Match' },
  { id: 'pay', label: 'Pay' },
  { id: 'done', label: 'Done' },
];

export function parkingStatusFlowIndex(status: string): number {
  if (status === 'PENDING_HOST_ACCEPTANCE') return 0;
  if (status === 'PENDING_PAYMENT') return 1;
  if (status === 'PENDING_REVIEW' || status === 'READY_FOR_CHECKIN' || status === 'COMPLETED') {
    return 2;
  }
  return 0;
}
