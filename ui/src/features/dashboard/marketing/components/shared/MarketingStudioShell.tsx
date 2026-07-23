import type { ReactNode } from 'react';

import { MarketingBuilderHeader } from '@/features/dashboard/marketing/components/shared/MarketingBuilderHeader';
import { MarketingStudioHeaderActionsSlot } from '@/features/dashboard/marketing/components/shared/marketingStudioHeaderActions';

type Props = {
  tabs: ReactNode;
  children: ReactNode;
};

/** Shared builder card chrome — keeps mode tabs mounted for sliding-pill animation. */
export function MarketingStudioShell({ tabs, children }: Props) {
  return (
    <div className="border-border bg-card flex h-[calc(100vh-120px)] min-h-[520px] flex-col overflow-hidden rounded-xl border">
      <MarketingBuilderHeader tabs={tabs} actions={<MarketingStudioHeaderActionsSlot />} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
