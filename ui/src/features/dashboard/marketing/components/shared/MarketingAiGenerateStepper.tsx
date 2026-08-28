import { SegmentedStepProgress } from '@/components/wizard/SegmentedStepProgress';
import { cn } from '@/lib/utils';

export const MARKETING_AI_GENERATE_STEP_LABELS = ['Content', 'Look', 'Settings'] as const;

export type MarketingAiGenerateStepIndex = 0 | 1 | 2;

type MarketingAiGenerateStepperProps = {
  activeStep: MarketingAiGenerateStepIndex;
  disabled?: boolean;
};

export function marketingAiGenerateStepCopy(
  stepIndex: MarketingAiGenerateStepIndex,
  contentType: 'calendar' | 'design' | 'video'
): { title: string; description: string } {
  if (stepIndex === 0) {
    if (contentType === 'calendar') {
      return {
        title: 'Content',
        description: 'Choose what to include from your property.',
      };
    }
    if (contentType === 'design') {
      return {
        title: 'Content',
        description: 'Set the category and message for your design.',
      };
    }
    return {
      title: 'Content',
      description: 'Set the category and message for your video.',
    };
  }
  if (stepIndex === 1) {
    return {
      title: 'Look',
      description: 'Pick a template or describe the visual style.',
    };
  }
  if (contentType === 'calendar') {
    return {
      title: 'Settings',
      description: 'Adjust layout, typography, background, and calendar elements.',
    };
  }
  if (contentType === 'design') {
    return {
      title: 'Settings',
      description: 'Adjust layout, typography, and background.',
    };
  }
  return {
    title: 'Settings',
    description: 'Set duration, typography, and motion style.',
  };
}

/**
 * Segmented progress for the Marketing AI generate modal — same pattern as Import with AI.
 */
export function MarketingAiGenerateStepper({
  activeStep,
  disabled,
}: MarketingAiGenerateStepperProps) {
  return (
    <nav aria-label="Generate steps" className={cn(disabled && 'pointer-events-none opacity-60')}>
      <SegmentedStepProgress
        labels={MARKETING_AI_GENERATE_STEP_LABELS}
        currentIndex={activeStep}
        disabled={disabled}
      />
    </nav>
  );
}
