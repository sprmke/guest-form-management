import { useMemo } from 'react';

import { ArrowRight, Check } from 'lucide-react';

import { PlanTierIconWell } from '@/features/dashboard/plans/components/PlanTierIconWell';
import type { OrgBundlePlanDto } from '@/features/dashboard/plans/lib/orgPlanApi';
import {
  isPlanDowngrade,
  planDisplayName,
  resolveUpgradeCelebrationGains,
} from '@/features/dashboard/plans/lib/planPresentation';

import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

const CONFETTI = [
  { left: '8%', delay: '0ms', color: 'bg-primary/70' },
  { left: '18%', delay: '120ms', color: 'bg-violet-500/60' },
  { left: '32%', delay: '240ms', color: 'bg-emerald-500/60' },
  { left: '48%', delay: '80ms', color: 'bg-amber-500/60' },
  { left: '62%', delay: '200ms', color: 'bg-blue-500/60' },
  { left: '76%', delay: '40ms', color: 'bg-primary/50' },
  { left: '88%', delay: '160ms', color: 'bg-violet-500/50' },
] as const;

type PlanUpgradeSuccessModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previousPlan: OrgBundlePlanDto | null;
  targetPlan: OrgBundlePlanDto | null;
  onViewCompare?: () => void;
};

export function PlanUpgradeSuccessModal({
  open,
  onOpenChange,
  previousPlan,
  targetPlan,
  onViewCompare,
}: PlanUpgradeSuccessModalProps) {
  const gains = useMemo(
    () => (targetPlan ? resolveUpgradeCelebrationGains(previousPlan, targetPlan) : []),
    [previousPlan, targetPlan]
  );

  if (!targetPlan) return null;

  const isUpgrade =
    previousPlan != null &&
    previousPlan.id !== targetPlan.id &&
    !isPlanDowngrade(previousPlan, targetPlan);
  const title = isUpgrade
    ? `You're on ${planDisplayName(targetPlan)}`
    : `${planDisplayName(targetPlan)} is active`;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        className="border-border/80 overflow-hidden p-0 sm:max-w-md"
        sheetLayout="split"
        sheetBodyClassName="px-0"
      >
        <div className="from-primary/8 via-background to-background relative overflow-hidden bg-gradient-to-b px-6 pb-2 pt-8 sm:px-8 sm:pt-10">
          <div className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden>
            {CONFETTI.map((piece) => (
              <span
                key={piece.left}
                className={cn(
                  'plan-upgrade-confetti absolute top-0 size-1.5 rounded-full',
                  piece.color
                )}
                style={{ left: piece.left, animationDelay: piece.delay }}
              />
            ))}
          </div>

          <div className="relative flex flex-col items-center text-center">
            <div className="relative">
              <span className="bg-success/15 ring-success/30 absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full ring-2">
                <Check className="text-success size-4" strokeWidth={2.5} aria-hidden />
              </span>
              <PlanTierIconWell planCode={targetPlan.code} size="lg" />
            </div>

            <ResponsiveModalHeader className="mt-5 space-y-2 p-0 text-center sm:text-center">
              <ResponsiveModalTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                {title}
              </ResponsiveModalTitle>
            </ResponsiveModalHeader>
          </div>
        </div>

        <div className="max-h-[min(42vh,320px)] overflow-y-auto px-6 py-4 sm:px-8">
          {gains.length > 0 ? (
            <ul className="space-y-2.5">
              {gains.map((gain, index) => (
                <li
                  key={gain.key}
                  className="animate-fade-in-up flex items-start gap-3 text-left"
                  style={{
                    animationDelay: `${Math.min(index * 60, 360)}ms`,
                    opacity: 0,
                  }}
                >
                  <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="text-foreground text-sm leading-snug">{gain.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <ResponsiveModalFooter className="border-border/60 flex-col gap-2 border-t px-6 py-4 sm:flex-row sm:px-8">
          {onViewCompare ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              onClick={() => {
                onOpenChange(false);
                onViewCompare();
              }}
            >
              Compare plans
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-[44px] w-full sm:ml-auto sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Start exploring
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
