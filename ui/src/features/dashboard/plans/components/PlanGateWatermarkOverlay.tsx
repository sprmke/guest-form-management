import type { ReactNode } from 'react';

import { useFeatureGate } from '@/features/dashboard/plans/hooks/useFeatureGate';
import type { PlanFeatureKey } from '@/features/dashboard/plans/lib/planFeatures';
import { useUpgradeModal } from '@/features/dashboard/plans/components/UpgradeModalProvider';

import { cn } from '@/lib/utils';

type Props = {
  feature?: PlanFeatureKey;
  children: ReactNode;
  className?: string;
};

/** Non-configurable plan-tier watermark over Marketing Studio previews. */
export function PlanGateWatermarkOverlay({
  feature = 'marketingStudio',
  children,
  className,
}: Props) {
  const { allowed, isLoading } = useFeatureGate(feature);
  const { open } = useUpgradeModal();

  if (isLoading || allowed) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative', className)}>
      {children}
      <button
        type="button"
        className="bg-background/5 pointer-events-auto absolute inset-0 z-20 flex items-center justify-center"
        aria-label="Upgrade to remove preview watermark"
        onClick={() => open(feature)}
      >
        <span
          className="text-muted-foreground/35 pointer-events-none rotate-[-18deg] select-none text-3xl font-bold uppercase tracking-[0.35em] sm:text-4xl"
          aria-hidden
        >
          Preview
        </span>
      </button>
    </div>
  );
}
