import { useMemo, useState } from 'react';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import { useSetupGuide } from '@/features/dashboard/setup-guide/components/SetupGuideProvider';
import {
  SetupGuideSaveProvider,
  SetupGuideStepBody,
  useSetupGuideSaveBridge,
} from '@/features/dashboard/setup-guide/components/SetupGuideStepBody';
import type {
  SetupGuideStep,
  SetupGuideStepProgress,
} from '@/features/dashboard/setup-guide/lib/setupGuideTypes';

import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

function groupLabel(step: SetupGuideStep): string {
  switch (step.group.type) {
    case 'org-start':
      return 'Organization';
    case 'org-finish':
      return 'Finish';
    case 'property':
      return step.group.propertyName;
    case 'parking':
      return step.group.parkingName;
    default:
      return 'Setup';
  }
}

function groupKey(step: SetupGuideStep): string {
  switch (step.group.type) {
    case 'property':
      return `property:${step.group.propertyId}`;
    case 'parking':
      return `parking:${step.group.parkingId}`;
    default:
      return step.group.type;
  }
}

type StepperGroup = {
  key: string;
  label: string;
  entries: SetupGuideStepProgress[];
};

function buildStepperGroups(entries: SetupGuideStepProgress[]): StepperGroup[] {
  const groups: StepperGroup[] = [];
  for (const entry of entries) {
    const key = groupKey(entry.step);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.entries.push(entry);
    } else {
      groups.push({ key, label: groupLabel(entry.step), entries: [entry] });
    }
  }
  return groups;
}

export function SetupGuideOverlay() {
  const {
    open,
    closeGuide,
    steps,
    progress,
    activeStepId,
    goToStep,
    goNext,
    goBack,
    skipCurrent,
    requiredRemaining,
  } = useSetupGuide();
  const { registerSave, runSave, hasSave } = useSetupGuideSaveBridge();
  const [saving, setSaving] = useState(false);

  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === activeStepId)
  );
  const activeStep = steps[activeIndex] ?? steps[0];
  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= steps.length - 1;

  const progressLine = useMemo(() => {
    const base = `${progress.requiredComplete}/${progress.requiredTotal} required`;
    return requiredRemaining > 0 ? `${base} · ${requiredRemaining} left` : base;
  }, [progress.requiredComplete, progress.requiredTotal, requiredRemaining]);

  const handlePrimary = async () => {
    if (isLast && !hasSave) {
      closeGuide();
      return;
    }
    setSaving(true);
    try {
      const ok = await runSave();
      if (ok && !isLast) goNext();
      if (ok && isLast) closeGuide();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => {
        if (!next) closeGuide({ dismiss: true });
      }}
    >
      <ResponsiveModalContent
        sheetLayout="split"
        showCloseButton
        className={cn(
          'flex max-h-[min(90dvh,820px)] w-[min(100vw-1rem,56rem)] flex-col gap-0 overflow-hidden p-0 sm:p-0',
          'sm:max-w-[min(100vw-1.5rem,56rem)] lg:max-w-[min(100vw-2rem,60rem)]'
        )}
      >
        {/* Mobile / tablet: compact chrome. Desktop title lives in the stepper. */}
        <ResponsiveModalHeader className="border-border shrink-0 space-y-0.5 border-b px-3 py-2.5 sm:px-4 lg:hidden">
          <ResponsiveModalTitle className="text-base leading-tight">
            Setup guide
          </ResponsiveModalTitle>
          <ResponsiveModalDescription className="sr-only">
            Guided setup for your organization and listings.
          </ResponsiveModalDescription>
          <p className="text-muted-foreground text-xs tabular-nums">{progressLine}</p>
        </ResponsiveModalHeader>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <SetupGuideStepper
            entries={progress.steps}
            activeStepId={activeStep?.id ?? null}
            onSelect={goToStep}
            progressLine={progressLine}
          />

          <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-3.5">
              <p className="text-muted-foreground mb-0.5 truncate text-[11px] font-medium uppercase tracking-wide">
                {activeStep ? groupLabel(activeStep) : null}
              </p>
              <h3 className="text-foreground text-base font-semibold tracking-tight sm:text-lg">
                {activeStep?.title ?? 'Setup'}
              </h3>
              <div className="mt-3">
                <SetupGuideSaveProvider registerSave={registerSave}>
                  <SetupGuideStepBody step={activeStep} />
                </SetupGuideSaveProvider>
              </div>
            </div>

            <ResponsiveModalFooter className="border-border bg-background shrink-0 gap-2 border-t px-3 py-2.5 sm:px-4">
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => closeGuide({ dismiss: true })}
              >
                Later
              </Button>
              <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={isFirst}
                  onClick={goBack}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Back
                </Button>
                {activeStep?.requirement !== 'required' ? (
                  <Button type="button" variant="ghost" className="min-h-11" onClick={skipCurrent}>
                    Skip
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => void handlePrimary()}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : isLast ? 'Finish' : hasSave ? 'Save & continue' : 'Next'}
                  {!saving && !isLast ? <ChevronRight className="size-4" aria-hidden /> : null}
                </Button>
              </div>
            </ResponsiveModalFooter>
          </div>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

function SetupGuideStepper({
  entries,
  activeStepId,
  onSelect,
  progressLine,
}: {
  entries: SetupGuideStepProgress[];
  activeStepId: string | null;
  onSelect: (stepId: string) => void;
  progressLine: string;
}) {
  const groups = useMemo(() => buildStepperGroups(entries), [entries]);

  return (
    <nav
      aria-label="Setup steps"
      className={cn(
        'border-border bg-muted/35 shrink-0 border-b',
        'max-h-36 overflow-x-auto overflow-y-hidden px-2 py-2',
        'lg:max-h-none lg:w-[15.5rem] lg:shrink-0 lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:px-0 lg:py-0'
      )}
    >
      <div className="border-border hidden border-b px-3 py-2.5 lg:block">
        <p className="text-foreground text-sm font-semibold leading-tight">Setup guide</p>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{progressLine}</p>
      </div>

      <ol className="flex gap-1 lg:flex-col lg:gap-0 lg:px-2 lg:py-2">
        {groups.map((group, groupIndex) => {
          const doneCount = group.entries.filter((entry) => entry.status === 'complete').length;
          const allDone = doneCount === group.entries.length;

          return (
            <li key={group.key} className="contents">
              <div
                className={cn(
                  'hidden min-w-0 lg:block',
                  groupIndex > 0 && 'border-border mt-2 border-t pt-2'
                )}
              >
                <div className="flex items-center gap-1.5 px-2 pb-1">
                  <p
                    className="text-muted-foreground min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-wider"
                    title={group.label}
                  >
                    {group.label}
                  </p>
                  <span
                    className={cn(
                      'shrink-0 text-[10px] tabular-nums',
                      allDone ? 'text-primary' : 'text-muted-foreground/80'
                    )}
                    aria-label={`${doneCount} of ${group.entries.length} complete`}
                  >
                    {doneCount}/{group.entries.length}
                  </span>
                </div>
              </div>

              {group.entries.map((entry) => {
                const active = entry.step.id === activeStepId;
                const done = entry.status === 'complete';

                return (
                  <button
                    key={entry.step.id}
                    type="button"
                    onClick={() => onSelect(entry.step.id)}
                    className={cn(
                      'focus-visible:ring-ring relative flex min-h-10 min-w-[9rem] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                      'lg:w-full lg:min-w-0',
                      active
                        ? 'bg-background text-foreground ring-border/70 shadow-sm ring-1'
                        : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                    )}
                    aria-current={active ? 'step' : undefined}
                  >
                    {active ? (
                      <span
                        className="bg-primary absolute inset-y-1.5 left-0 hidden w-0.5 rounded-full lg:block"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn(
                        'flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border text-[9px]',
                        done
                          ? 'border-primary bg-primary text-primary-foreground'
                          : active
                            ? 'border-primary text-primary'
                            : 'border-border/80'
                      )}
                      aria-hidden
                    >
                      {done ? <Check className="size-2.5" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{entry.step.title}</span>
                  </button>
                );
              })}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
