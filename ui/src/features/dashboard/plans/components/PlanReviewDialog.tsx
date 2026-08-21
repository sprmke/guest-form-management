import { ArrowRight, Check, Loader2, Minus } from 'lucide-react';

import { PlanTierIconWell } from '@/features/dashboard/plans/components/PlanTierIconWell';
import {
  planFeatureGains,
  planFeatureLosses,
  planDisplayName,
  planPrice,
  type PlanFeatureChange,
} from '@/features/dashboard/plans/lib/planPresentation';
import type { PropertyPlanDto } from '@/features/dashboard/plans/lib/propertyPlanApi';

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

type PlanReviewDialogProps = {
  open: boolean;
  plan: PropertyPlanDto | null;
  currentPlan: PropertyPlanDto | null;
  onOpenChange: (open: boolean) => void;
  onConfirmFree: (planId: string) => Promise<void>;
  onCheckoutPaid: (planId: string) => Promise<void>;
  isSubmitting: boolean;
};

function PlanStub({ plan, muted }: { plan: PropertyPlanDto; muted?: boolean }) {
  const price = planPrice(plan);
  const title = planDisplayName(plan);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PlanTierIconWell planCode={plan.code} size="sm" muted={muted} />
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-sm font-semibold',
            muted ? 'text-muted-foreground' : 'text-foreground'
          )}
        >
          {title}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
          {price.amount}
          {price.suffix}
        </p>
      </div>
    </div>
  );
}

function ChangeList({
  title,
  items,
  tone,
}: {
  title: string;
  items: PlanFeatureChange[];
  tone: 'gain' | 'loss';
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2.5 text-sm leading-relaxed">
            {tone === 'gain' ? (
              <Check
                className="text-primary mt-0.5 size-4 shrink-0"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : (
              <Minus className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <span className={tone === 'loss' ? 'text-muted-foreground' : undefined}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlanReviewDialog({
  open,
  plan,
  currentPlan,
  onOpenChange,
  onConfirmFree,
  onCheckoutPaid,
  isSubmitting,
}: PlanReviewDialogProps) {
  if (!plan) return null;

  const isFree = plan.isDefault;
  const gains = planFeatureGains(currentPlan?.features ?? null, plan.features);
  const losses = currentPlan ? planFeatureLosses(currentPlan.features, plan.features) : [];
  const isDownscale = losses.length > 0 && gains.length === 0;

  const planTitle = planDisplayName(plan);
  const title = currentPlan
    ? isDownscale
      ? `Move to ${planTitle}`
      : `Upgrade to ${planTitle}`
    : `Choose ${planTitle}`;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        sheetLayout="split"
        className={cn(
          'flex max-h-[min(90dvh,36rem)] w-[min(calc(100vw-1.5rem),28rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
          'sm:max-w-[28rem] sm:p-0'
        )}
        aria-describedby="plan-review-description"
      >
        <ResponsiveModalHeader className="border-border shrink-0 space-y-1 border-b px-5 pb-3.5 pr-14 pt-5 text-left sm:px-6">
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription id="plan-review-description">
            {isFree
              ? 'This listing keeps running on the free tier.'
              : 'Review what changes before you continue.'}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch] sm:px-6">
          <div className="space-y-5">
            {currentPlan ? (
              <div className="border-border bg-muted/30 flex items-center gap-3 rounded-xl border p-3">
                <PlanStub plan={currentPlan} muted />
                <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <PlanStub plan={plan} />
              </div>
            ) : (
              <div className="border-border bg-muted/30 rounded-xl border p-3">
                <PlanStub plan={plan} />
              </div>
            )}

            {gains.length === 0 && losses.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No feature changes — only the price differs.
              </p>
            ) : (
              <div className="space-y-5">
                <ChangeList title="Unlocks" items={gains} tone="gain" />
                <ChangeList title="Removes" items={losses} tone="loss" />
              </div>
            )}
          </div>
        </div>

        <ResponsiveModalFooter className="border-border bg-background shrink-0 gap-2 border-t px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-[44px]"
            disabled={isSubmitting}
            onClick={async () => {
              if (isFree) {
                await onConfirmFree(plan.id);
                onOpenChange(false);
                return;
              }
              await onCheckoutPaid(plan.id);
              onOpenChange(false);
            }}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {isFree ? 'Confirm plan' : 'Continue to payment'}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
