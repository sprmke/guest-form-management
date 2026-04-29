import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  /** Pending documents pipeline or Ready for check-in (not SD stages / completed / review). */
  show: boolean;
  /**
   * When true, the current form (or unsaved intent) includes changes to
   * workflow-sensitive fields — saving will set status to Pending Review.
   */
  hasSensitiveEdits: boolean;
  className?: string;
};

const FIELD_LIST = (
  <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px] leading-relaxed text-inherit sm:text-xs">
    <li>Facebook / Airbnb name, primary guest name, email, phone</li>
    <li>Additional guest names</li>
    <li>Check-in / check-out dates and times</li>
    <li>Parking (need parking + car details)</li>
    <li>Pets (flags + name, type, breed, age, vaccination date)</li>
    <li>Payment receipt, valid ID, pet vaccination, or pet photo uploads</li>
  </ul>
);

/**
 * Educates admins: while a booking is in the documents pipeline or Ready for check-in,
 * edits to certain guest/stay fields (or replacing guest documents) revert status to
 * Pending Review.
 */
export function ReadyForCheckinSensitiveFieldsNotice({
  show,
  hasSensitiveEdits,
  className,
}: Props) {
  if (!show) return null;

  if (hasSensitiveEdits) {
    return (
      <div
        role="alert"
        className={cn(
          'flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4',
          className,
        )}
      >
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-amber-600 sm:mt-1"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            Saving will move this booking to Pending Review
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Your edits touch workflow-sensitive guest or stay fields. Saving now
            moves status to <span className="font-medium">Pending Review</span>{' '}
            so the pipeline can be re-run from the start of review. Edits that
            only change address, nationality, guest counts, special requests, or
            &quot;how you found us&quot; do not revert status.
          </p>
          {FIELD_LIST}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-sky-200 bg-sky-50/90 p-3 sm:p-4',
        className,
      )}
    >
      <Info
        className="mt-0.5 size-4 shrink-0 text-sky-600 sm:mt-1"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-sky-950">
          Documents pipeline — sensitive edits
        </p>
        <p className="mt-1 text-xs text-sky-900/90">
          While this booking is waiting on documents or is ready for check-in
          (not SD refund or completed), changing any of the following (or
          replacing payment / ID / pet documents via upload) returns status to{' '}
          <span className="font-medium">Pending Review</span> after save so you
          can re-process the workflow.
        </p>
        {FIELD_LIST}
      </div>
    </div>
  );
}
