import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  GUEST_FORM_STEPS,
  type GuestFormStepId,
} from '@/features/guest-form/lib/guestFormSteps';

function StepDot({
  stepNum,
  short,
  label,
  activeStep,
}: {
  stepNum: GuestFormStepId;
  short: string;
  label: string;
  activeStep: GuestFormStepId;
}) {
  const done = activeStep > stepNum;
  const current = activeStep === stepNum;

  return (
    <li className="flex min-w-[3.25rem] shrink-0 flex-col items-center gap-1 text-center sm:min-w-0 sm:flex-1">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold shadow-sm transition-colors sm:size-9 sm:text-sm',
          done &&
            'border-primary bg-primary text-primary-foreground shadow-primary/20',
          current &&
            !done &&
            'border-primary bg-primary/15 text-primary ring-2 ring-primary/25',
          !current &&
            !done &&
            'border-muted-foreground/25 bg-muted/40 text-muted-foreground',
        )}
        aria-current={current ? 'step' : undefined}
      >
        {done ? (
          <Check className="size-4 sm:size-5" strokeWidth={2.5} aria-hidden />
        ) : (
          stepNum
        )}
      </span>
      <p
        className={cn(
          'max-w-[4.5rem] text-[9px] font-bold uppercase leading-tight tracking-wide sm:max-w-none sm:text-[10px]',
          current || done ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{label.split(' ')[0]}</span>
      </p>
    </li>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return (
    <li
      className="flex shrink-0 items-center self-start pt-3.5 sm:pt-4"
      aria-hidden
    >
      <div
        className={cn(
          'h-0.5 w-3 rounded-full sm:w-6 md:w-10',
          done ? 'bg-primary' : 'bg-border',
        )}
      />
    </li>
  );
}

export function GuestFormStepper({ activeStep }: { activeStep: GuestFormStepId }) {
  const progressPct = Math.round(
    ((activeStep - 1) / (GUEST_FORM_STEPS.length - 1)) * 100,
  );
  const current = GUEST_FORM_STEPS[activeStep - 1];

  return (
    <nav
      aria-label="Form steps"
      className="space-y-3 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card px-3 py-4 sm:px-5"
    >
      <div className="space-y-1.5 sm:hidden">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-foreground">
            Step {activeStep} of {GUEST_FORM_STEPS.length}
          </span>
          <span className="text-muted-foreground">{current.label}</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-border/80"
          role="progressbar"
          aria-valuenow={activeStep}
          aria-valuemin={1}
          aria-valuemax={GUEST_FORM_STEPS.length}
          aria-label={`Step ${activeStep} of ${GUEST_FORM_STEPS.length}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ol className="hidden w-full items-start justify-between gap-0 sm:flex">
        {GUEST_FORM_STEPS.map((step, index) => (
          <li key={step.id} className="contents">
            <StepDot
              stepNum={step.id}
              short={step.short}
              label={step.label}
              activeStep={activeStep}
            />
            {index < GUEST_FORM_STEPS.length - 1 ? (
              <StepConnector done={activeStep > step.id} />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
