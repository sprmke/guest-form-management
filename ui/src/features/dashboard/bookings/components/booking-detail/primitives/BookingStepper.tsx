import { Check } from 'lucide-react';

import { statusLabel, type BookingStatus } from '@/features/dashboard/bookings/lib/bookingStatus';
import type { DocumentRequirement } from '@/features/dashboard/bookings/lib/documentRequirements';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';
import {
  bookingPipeline,
  canNavigatePendingParkingSubStep,
  pendingDocumentsNestedItemsForStepper,
  PARKING_NESTED_KEY,
  type PendingDocNestedKey,
  type ViewedWorkflowStep,
} from '@/features/dashboard/bookings/lib/workflow';

import { cn } from '@/lib/utils';
import { formatRelative } from '@/utils/format/bookingDisplay';

/**
 * The booking detail page's signature element — a redesigned pipeline
 * stepper. Purely presentational: all step order / completion logic comes
 * from `lib/workflow.ts` (same calls the pre-redesign `PipelineStepper` /
 * `PendingDocumentsSubTree` made), so this component never re-derives
 * transition rules.
 */
type BookingStepperProps = {
  booking: BookingRow;
  currentStatus: BookingStatus;
  statusUpdatedAt?: string | null;
  viewedStep: ViewedWorkflowStep;
  documentRequirements: DocumentRequirement[];
  onSelectStep: (step: BookingStatus) => void;
  onSelectSubStep: (sub: PendingDocNestedKey) => void;
  disabled?: boolean;
  size?: 'default' | 'compact';
};

function isPipelineStepSelected(step: BookingStatus, viewedStep: ViewedWorkflowStep): boolean {
  if (step === 'PENDING_DOCUMENTS') return viewedStep.kind === 'pending-doc-sub';
  return viewedStep.kind === 'pipeline' && viewedStep.status === step;
}

export function BookingStepper({
  booking,
  currentStatus,
  statusUpdatedAt,
  viewedStep,
  documentRequirements,
  onSelectStep,
  onSelectSubStep,
  disabled,
  size = 'default',
}: BookingStepperProps) {
  const pipeline = bookingPipeline(booking, currentStatus, documentRequirements);
  const currentIdx = pipeline.indexOf(currentStatus);
  const pendingDocsIdx = pipeline.indexOf('PENDING_DOCUMENTS');
  const pendingDocsBrowsable =
    pendingDocsIdx >= 0 && currentIdx >= pendingDocsIdx && currentStatus !== 'CANCELLED';
  const compact = size === 'compact';

  return (
    <ol className="flex flex-col">
      {pipeline.map((step, i) => {
        const isCompleted = currentIdx >= 0 && i < currentIdx;
        const isCurrent = i === currentIdx;
        const isLast = i === pipeline.length - 1;
        const isReachable = isCompleted || isCurrent;
        const isSelected = isPipelineStepSelected(step, viewedStep);

        const labelClass = cn(
          compact ? 'text-xs' : 'text-sm',
          'leading-tight transition-colors',
          isSelected || isCurrent
            ? 'text-primary font-semibold'
            : isCompleted
              ? 'text-foreground font-medium'
              : 'text-muted-foreground font-medium'
        );

        return (
          <li key={step} className="flex gap-3">
            <div className="flex w-6 shrink-0 flex-col items-center">
              <div className="flex size-6 shrink-0 items-center justify-center">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full transition-all',
                    isCurrent
                      ? 'bg-primary/10 ring-primary shadow-primary-glow size-6 ring-2'
                      : isCompleted
                        ? 'gradient-primary text-primary-foreground size-5'
                        : 'bg-card ring-border/60 size-5 ring-1'
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="gradient-primary size-2 rounded-full motion-safe:animate-pulse" />
                  ) : null}
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mb-0.5 mt-0.5 min-h-[14px] w-px flex-1',
                    isCompleted ? 'gradient-primary opacity-40' : 'bg-muted'
                  )}
                />
              )}
            </div>

            <div
              className={cn(
                'flex flex-1 flex-col gap-3',
                isLast ? 'pb-0' : compact ? 'pb-2' : 'pb-3'
              )}
            >
              <div className="flex min-h-6 items-center">
                {isReachable ? (
                  <button
                    type="button"
                    disabled={!!disabled}
                    onClick={() => {
                      if (!disabled) onSelectStep(step);
                    }}
                    className={cn(
                      '-my-[10px] inline-flex min-h-[44px] w-full items-center py-2 text-left leading-tight transition-colors',
                      disabled ? 'text-muted-foreground cursor-not-allowed' : labelClass,
                      !disabled && !isSelected && isCompleted ? 'hover:text-primary' : null
                    )}
                    aria-label={`View ${statusLabel(step)}`}
                    aria-current={isSelected ? 'step' : undefined}
                  >
                    {statusLabel(step)}
                  </button>
                ) : (
                  <div className={labelClass}>{statusLabel(step)}</div>
                )}
              </div>
              {step === 'PENDING_DOCUMENTS' && pendingDocsBrowsable && (
                <PendingDocumentsSubTree
                  booking={booking}
                  documentRequirements={documentRequirements}
                  viewedStep={viewedStep}
                  onSelect={onSelectSubStep}
                  disabled={disabled}
                  currentStatus={currentStatus}
                  currentIdx={currentIdx}
                  pendingDocsIdx={pendingDocsIdx}
                />
              )}
              {isCurrent && statusUpdatedAt && (
                <div className="text-caption mt-0.5">Since {formatRelative(statusUpdatedAt)}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PendingDocumentsSubTree({
  booking,
  documentRequirements,
  viewedStep,
  onSelect,
  disabled,
  currentStatus,
  currentIdx,
  pendingDocsIdx,
}: {
  booking: BookingRow;
  documentRequirements: DocumentRequirement[];
  viewedStep: ViewedWorkflowStep;
  onSelect: (key: PendingDocNestedKey) => void;
  disabled?: boolean;
  currentStatus: BookingStatus;
  currentIdx: number;
  pendingDocsIdx: number;
}) {
  const items = pendingDocumentsNestedItemsForStepper(booking, documentRequirements);
  const activeKey = viewedStep.kind === 'pending-doc-sub' ? viewedStep.sub : undefined;
  const isLivePendingDocs = currentStatus === 'PENDING_DOCUMENTS';
  const canBrowseCompletedPendingDocs = pendingDocsIdx >= 0 && currentIdx > pendingDocsIdx;

  function isItemInteractive(key: PendingDocNestedKey): boolean {
    if (isLivePendingDocs) return true;
    if (canBrowseCompletedPendingDocs) return true;
    if (key === PARKING_NESTED_KEY && canNavigatePendingParkingSubStep(booking, currentStatus)) {
      return true;
    }
    return false;
  }

  if (items.length === 0) return null;

  return (
    <ul className="relative flex flex-col gap-3">
      {items.length > 1 ? (
        <div
          aria-hidden
          className="bg-muted pointer-events-none absolute bottom-[10px] left-2 top-[10px] w-px"
        />
      ) : null}
      {items.map((item) => {
        const isActive = activeKey === item.key;
        const itemInteractive = isItemInteractive(item.key);
        const approvalHint =
          item.approvalSource === 'email-listener'
            ? 'Email'
            : item.approvalSource === 'manual'
              ? 'Manual'
              : null;

        const iconClass = cn(
          'relative z-[1] box-border flex size-4 shrink-0 items-center justify-center rounded-full',
          item.completed
            ? 'gradient-primary text-primary-foreground'
            : 'border-border/60 bg-card border'
        );

        const labelClass = cn(
          'text-xs leading-4 transition-colors',
          disabled
            ? 'text-muted-foreground cursor-not-allowed'
            : isActive
              ? 'text-primary font-semibold'
              : item.completed
                ? 'text-foreground font-medium'
                : 'text-muted-foreground font-medium',
          itemInteractive && !disabled && !isActive && 'hover:text-primary'
        );

        return (
          <li key={item.key} className="flex items-center gap-2.5">
            <div className={iconClass}>
              {item.completed ? <Check className="size-2.5" strokeWidth={3} /> : null}
            </div>

            {itemInteractive ? (
              <div className="flex min-h-6 min-w-0 flex-1 items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!disabled) onSelect(item.key);
                  }}
                  disabled={!!disabled}
                  className={cn(
                    '-my-[10px] inline-flex min-h-[44px] min-w-0 flex-1 items-center py-2 text-left',
                    labelClass
                  )}
                  aria-label={`View ${item.label}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {item.label}
                </button>
                <span className="flex shrink-0 items-center gap-1.5">
                  {approvalHint ? (
                    <span className="text-muted-foreground/70 text-[10px] font-medium uppercase tracking-wide">
                      {approvalHint}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'text-xs font-semibold leading-4',
                      item.completed ? 'text-primary' : 'text-amber-600'
                    )}
                  >
                    {item.completed ? 'Complete' : 'Incomplete'}
                  </span>
                </span>
              </div>
            ) : (
              <div
                className={cn(
                  'flex min-h-6 flex-1 items-center text-xs leading-4',
                  item.completed ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
