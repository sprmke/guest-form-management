import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { GuestFormStepId } from '@/features/guest-form/lib/guestFormSteps';

type GuestFormStepNavigationProps = {
  currentStep: GuestFormStepId;
  stepCount: number;
  isSubmitting: boolean;
  canProceed: boolean;
  /** False briefly after landing on the last step so a Continue click cannot hit Submit. */
  submitReady: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
};

export function GuestFormStepNavigation({
  currentStep,
  stepCount,
  isSubmitting,
  canProceed,
  submitReady,
  onBack,
  onNext,
  onSubmit,
}: GuestFormStepNavigationProps) {
  const isFirst = currentStep === 1;
  const isLast = currentStep === stepCount;

  return (
    <div
      className={
        isFirst
          ? 'flex justify-end border-t border-separator pt-5'
          : 'flex flex-col-reverse gap-2 border-t border-separator pt-5 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      {!isFirst ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full sm:w-auto"
          disabled={isSubmitting}
          onClick={onBack}
        >
          <ChevronLeft className="mr-1 size-4 shrink-0" aria-hidden />
          Back
        </Button>
      ) : null}

      {isLast ? (
        <Button
          type="button"
          variant="success"
          disabled={isSubmitting || !canProceed || !submitReady}
          onClick={onSubmit}
          className="min-h-[44px] w-full shadow-md shadow-primary/15 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            'Submit guest form'
          )}
        </Button>
      ) : (
        <Button
          type="button"
          className={
            isFirst
              ? 'min-h-[44px] w-auto min-w-[8.5rem] shadow-md shadow-primary/15'
              : 'min-h-[44px] w-full shadow-md shadow-primary/15 sm:ml-auto sm:w-auto'
          }
          disabled={isSubmitting || !canProceed}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onNext}
        >
          Continue
          <ChevronRight className="ml-1 size-4 shrink-0" aria-hidden />
        </Button>
      )}
    </div>
  );
}
