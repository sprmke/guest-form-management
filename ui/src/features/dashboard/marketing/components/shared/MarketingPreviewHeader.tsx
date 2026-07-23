import type { ReactNode } from 'react';

type Props = {
  leading?: ReactNode;
  actions?: ReactNode;
};

export function MarketingPreviewHeader({ leading, actions }: Props) {
  if (!leading && !actions) {
    return <div className="border-border bg-background/50 min-h-[44px] border-b" aria-hidden />;
  }

  return (
    <div className="border-border bg-background/50 flex min-h-[44px] items-center justify-between gap-2 border-b px-3 py-2 sm:px-4">
      {leading ? (
        <div className="flex min-w-0 items-center gap-2">{leading}</div>
      ) : (
        <span aria-hidden />
      )}
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
