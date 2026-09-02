import { useState } from 'react';

import type {
  PricingBaseRateScope,
  PricingSaveOptions,
} from '@/features/dashboard/pricing/lib/pricingSave';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
  onConfirm: (options: PricingSaveOptions) => void;
};

export function PricingSaveDialog({ open, onOpenChange, saving = false, onConfirm }: Props) {
  const [overrideCustomRates, setOverrideCustomRates] = useState(false);
  const [baseRateScope, setBaseRateScope] = useState<PricingBaseRateScope>('all_future');

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Save pricing</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-foreground text-sm font-medium">Apply updated base rates for</p>
            <div className="grid gap-2">
              <ScopeOption
                active={baseRateScope === 'all_future'}
                title="All future dates"
                onClick={() => setBaseRateScope('all_future')}
              />
              <ScopeOption
                active={baseRateScope === 'current_month'}
                title="This month only"
                onClick={() => setBaseRateScope('current_month')}
              />
            </div>
          </div>

          <label className="border-border/60 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5">
            <Checkbox
              checked={overrideCustomRates}
              onCheckedChange={(checked) => setOverrideCustomRates(checked === true)}
              className="mt-0.5"
            />
            <span className="min-w-0 space-y-0.5">
              <span className="text-foreground block text-sm font-medium">
                Override custom rates
              </span>
            </span>
          </label>
        </div>

        <ResponsiveModalFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-[44px]"
            disabled={saving}
            onClick={() => onConfirm({ overrideCustomRates, baseRateScope })}
          >
            Save
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

function ScopeOption({
  active,
  title,
  onClick,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-[44px] rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-foreground ring-primary/30 ring-1'
          : 'border-border/60 text-foreground hover:bg-muted/50'
      )}
    >
      {title}
    </button>
  );
}
