import { useState, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';

import type {
  GuestForm,
  FormStep,
  FormFieldConditional,
} from '@/features/guest/marketing/forms/lib/guest-forms/types';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { FormFieldRenderer } from './FormFieldRenderer';

interface PublicFormRendererProps {
  form: GuestForm;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

// Evaluate conditional visibility
function evaluateConditions(
  conditional: FormFieldConditional | undefined,
  values: Record<string, unknown>
): boolean {
  if (!conditional) return true;

  const results = conditional.conditions.map((cond) => {
    const fieldValue = values[cond.fieldId];

    switch (cond.operator) {
      case 'equals':
        return fieldValue === cond.value;
      case 'not_equals':
        return fieldValue !== cond.value;
      case 'contains':
        return String(fieldValue ?? '').includes(String(cond.value));
      case 'not_contains':
        return !String(fieldValue ?? '').includes(String(cond.value));
      case 'is_empty':
        return !fieldValue || fieldValue === '' || fieldValue === false;
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '' && fieldValue !== false;
      case 'greater_than':
        return Number(fieldValue) > Number(cond.value);
      case 'less_than':
        return Number(fieldValue) < Number(cond.value);
      default:
        return true;
    }
  });

  if (conditional.logic === 'OR') {
    return results.some(Boolean);
  }
  return results.every(Boolean);
}

// Generate default values for a form
function generateDefaults(steps: FormStep[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const step of steps) {
    for (const field of step.fields) {
      if (['HEADING', 'PARAGRAPH', 'DIVIDER'].includes(field.type)) continue;
      if (field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue;
      } else if (field.type === 'CHECKBOX') {
        defaults[field.id] = false;
      } else if (field.type === 'MULTI_SELECT') {
        defaults[field.id] = [];
      } else if (field.type === 'NUMBER') {
        defaults[field.id] = '';
      } else {
        defaults[field.id] = '';
      }
    }
  }
  return defaults;
}

export function PublicFormRenderer({ form, onSubmit }: PublicFormRendererProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const { steps, styling, settings } = form;
  const totalSteps = steps.length;
  const isMultiStep = totalSteps > 1;
  const isFinalStep = currentStep === totalSteps - 1;
  const currentStepData = steps[currentStep];

  const defaultValues = useMemo(() => generateDefaults(steps), [steps]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    defaultValues,
    mode: settings.validateOnBlur ? 'onBlur' : 'onSubmit',
  });

  const watchedValues = watch();

  // Get visible fields for current step
  const visibleFields = useMemo(() => {
    if (!currentStepData) return [];
    return currentStepData.fields
      .sort((a, b) => a.order - b.order)
      .filter((field) => {
        if (!field.conditional) return true;
        return evaluateConditions(field.conditional, watchedValues);
      });
  }, [currentStepData, watchedValues]);

  // Validate current step and go next
  const handleNext = async () => {
    if (!currentStepData) return;
    const fieldIds = currentStepData.fields
      .filter(
        (f) =>
          !['HEADING', 'PARAGRAPH', 'DIVIDER'].includes(f.type) &&
          (!f.conditional || evaluateConditions(f.conditional, watchedValues))
      )
      .map((f) => f.id);

    const isValid = await trigger(fieldIds);
    if (isValid) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Step Indicators */}
      {isMultiStep && (
        <div className="mb-8">
          {styling.stepIndicator.style === 'minimal' ? (
            <MinimalStepIndicator
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              styling={styling}
              onStepClick={(index) => {
                if (completedSteps.has(index) || index < currentStep) {
                  setCurrentStep(index);
                }
              }}
            />
          ) : (
            <CircleStepIndicator
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              styling={styling}
              showNumbers={settings.showStepNumbers}
              onStepClick={(index) => {
                if (completedSteps.has(index) || index < currentStep) {
                  setCurrentStep(index);
                }
              }}
            />
          )}
        </div>
      )}

      {/* Step Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`header-${currentStep}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          {currentStepData && (
            <>
              <h3 className="text-foreground text-xl font-semibold">{currentStepData.name}</h3>
              {currentStepData.description && (
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {currentStepData.description}
                </p>
              )}
              {currentStepData.isOptional && (
                <span className="bg-muted text-muted-foreground mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium">
                  Optional step
                </span>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Form Fields */}
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`fields-${currentStep}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {visibleFields.map((field, index) => {
                const width = field.styling?.width || 'full';
                return (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      width === 'full' && 'sm:col-span-2',
                      width === 'third' && 'sm:col-span-1'
                    )}
                  >
                    <FormFieldRenderer
                      field={field}
                      register={register as UseFormRegister<Record<string, unknown>>}
                      control={control}
                      errors={errors}
                      primaryColor={styling.primaryColor}
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {/* Previous */}
          <div>
            {isMultiStep && currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                className="gap-2 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
                {settings.prevButtonText}
              </Button>
            )}
          </div>

          {/* Next / Submit */}
          <div className="flex gap-3">
            {isMultiStep && currentStepData?.isOptional && !isFinalStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCompletedSteps((prev) => new Set([...prev, currentStep]));
                  setCurrentStep((prev) => prev + 1);
                }}
                className="text-muted-foreground"
              >
                Skip this step
              </Button>
            )}

            {isFinalStep ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2 rounded-xl px-8"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {settings.submitButtonText}
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="gap-2 rounded-xl px-8"
                size="lg"
              >
                {settings.nextButtonText}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// Import UseFormRegister type for the cast
type UseFormRegister<T extends Record<string, unknown>> = ReturnType<typeof useForm<T>>['register'];

// ============================
// Step Indicator Components
// ============================

function CircleStepIndicator({
  steps,
  currentStep,
  completedSteps,
  styling: _styling,
  showNumbers: _showNumbers,
  onStepClick,
}: {
  steps: FormStep[];
  currentStep: number;
  completedSteps: Set<number>;
  styling: GuestForm['styling'];
  showNumbers: boolean;
  onStepClick: (index: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circles + connectors row */}
      <div className="flex items-center justify-center">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.has(index);
          const isClickable = isCompleted || index < currentStep;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300',
                  isActive
                    ? 'bg-primary shadow-primary/30 h-10 w-10 text-white shadow-lg'
                    : isCompleted
                      ? 'h-8 w-8 bg-green-500 text-white'
                      : 'border-muted-foreground/30 bg-background text-muted-foreground h-8 w-8 border-2',
                  isClickable && 'cursor-pointer hover:scale-110'
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}

                {isActive && (
                  <motion.div
                    className="bg-primary absolute inset-0 rounded-full"
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="bg-border relative mx-1 h-0.5 w-6 sm:mx-1.5 sm:w-8">
                  <motion.div
                    className="bg-primary absolute inset-y-0 left-0"
                    initial={{ width: 0 }}
                    animate={{
                      width: isCompleted || index < currentStep ? '100%' : '0%',
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current step label */}
      <p className="text-muted-foreground text-xs">
        Step {currentStep + 1} of {steps.length}
      </p>
    </div>
  );
}

function MinimalStepIndicator({
  steps,
  currentStep,
  completedSteps,
  styling: _styling,
  onStepClick,
}: {
  steps: FormStep[];
  currentStep: number;
  completedSteps: Set<number>;
  styling: GuestForm['styling'];
  onStepClick: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = completedSteps.has(index) || index < currentStep;
        const isClickable = isCompleted;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              isActive
                ? 'bg-primary w-8'
                : isCompleted
                  ? 'w-4 bg-green-500'
                  : 'bg-muted-foreground/30 w-4',
              isClickable && 'cursor-pointer hover:opacity-80'
            )}
            aria-label={step.name}
          />
        );
      })}
      <span className="text-muted-foreground ml-2 text-xs">
        {currentStep + 1} of {steps.length}
      </span>
    </div>
  );
}
