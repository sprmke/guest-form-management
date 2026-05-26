import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  GUEST_FORM_STEP_COUNT,
  type GuestFormStepId,
} from '@/features/guest-form/lib/guestFormSteps';

type GuestFormStepNavigationProps = {
  currentStep: GuestFormStepId;
  isSubmitting: boolean;
  canProceed: boolean;
  onBack: () => void;
  onNext: () => void;
};

export function GuestFormStepNavigation({
  currentStep,
  isSubmitting,
  canProceed,
  onBack,
  onNext,
}: GuestFormStepNavigationProps) {
  const isFirst = currentStep === 1;
  const isLast = currentStep === GUEST_FORM_STEP_COUNT;

  return (
    <div
      className={
        isFirst
          ? 'border-t border-border/60 pt-5'
          : 'flex flex-col-reverse gap-2 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between'
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
          type="submit"
          variant="success"
          disabled={isSubmitting || !canProceed}
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
          className="min-h-[44px] w-full shadow-md shadow-primary/15 sm:ml-auto sm:w-auto"
          disabled={isSubmitting || !canProceed}
          onClick={onNext}
        >
          Continue
          <ChevronRight className="ml-1 size-4 shrink-0" aria-hidden />
        </Button>
      )}
    </div>
  );
}
