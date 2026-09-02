import type { ReactNode } from 'react';

type Props = {
  /** Calendar / Design / Video mode switcher — left side of the builder top bar. */
  tabs?: ReactNode;
  status?: ReactNode;
  actions: ReactNode;
};

export function MarketingBuilderHeader({ tabs, status, actions }: Props) {
  return (
    <div className="border-border bg-card flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2 sm:px-4 sm:py-3">
      {tabs ? <div className="min-w-0 shrink-0">{tabs}</div> : null}
      {/* On mobile the editor routes its Download/Publish into the bottom dock, so this
          row is usually just autosave status — don't reserve a full 44px row for it. */}
      <div className="ml-auto flex w-auto flex-wrap items-center justify-end gap-2 empty:hidden sm:min-h-[44px]">
        {status}
        {actions}
      </div>
    </div>
  );
}
