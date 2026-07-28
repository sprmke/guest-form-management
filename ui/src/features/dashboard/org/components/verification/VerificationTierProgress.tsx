import { Check } from 'lucide-react';

import type { VerificationTierDefinition } from '@/features/dashboard/org/lib/orgVerificationTiers';

import { cn } from '@/lib/utils';

type Props = {
  tiers: VerificationTierDefinition[];
};

export function VerificationTierProgress({ tiers }: Props) {
  return (
    <ol className="flex items-center gap-0" aria-label="Verification tiers">
      {tiers.map((tier, index) => {
        const approved = tier.status === 'approved';
        const pending = tier.status === 'pending';
        const rejected = tier.status === 'rejected';
        const connectorApproved = tiers[index]?.status === 'approved';

        return (
          <li key={tier.id} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  approved && 'bg-emerald-600 text-white shadow-sm',
                  pending && 'border-2 border-amber-500 bg-amber-50 text-amber-700',
                  rejected && 'border-destructive bg-destructive/5 text-destructive border-2',
                  !approved &&
                    !pending &&
                    !rejected &&
                    'border-border bg-background text-muted-foreground border-2'
                )}
                aria-hidden
              >
                {approved ? <Check className="size-3.5" strokeWidth={2.5} /> : tier.level}
              </div>
              <span className="text-foreground truncate text-xs font-medium">{tier.title}</span>
            </div>
            {index < tiers.length - 1 ? (
              <div
                className={cn(
                  'mx-2 mb-5 h-px min-w-6 flex-1',
                  connectorApproved ? 'bg-emerald-500/50' : 'bg-border'
                )}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
