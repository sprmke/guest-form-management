import type { ReactNode } from 'react';

type Props = {
  /** Calendar / Design / Video mode switcher — left side of the builder top bar. */
  tabs?: ReactNode;
  status?: ReactNode;
  actions: ReactNode;
};

export function MarketingBuilderHeader({ tabs, status, actions }: Props) {
  return (
    <div className="border-border bg-muted/30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
      {tabs ? <div className="min-w-0 shrink-0">{tabs}</div> : null}
      <div className="ml-auto flex min-h-[44px] w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
        {status}
        {actions}
      </div>
    </div>
  );
}
