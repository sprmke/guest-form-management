import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { MarketingAutoSaveStatus } from '@/features/dashboard/marketing/components/shared/MarketingAutoSaveStatus';
import { MarketingEditorHistoryControls } from '@/features/dashboard/marketing/components/shared/MarketingEditorHistoryControls';
import type { MarketingAutoSaveStatus as AutoSaveStatus } from '@/features/dashboard/marketing/hooks/useMarketingAutoSave';

import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  backHref: string;
  autoSaveStatus: AutoSaveStatus;
  autoSaveError?: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export function PageEditorHeader({
  title,
  backHref,
  autoSaveStatus,
  autoSaveError,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props) {
  return (
    <header className="border-border bg-card flex min-h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="min-h-[44px] min-w-[44px]"
        asChild
      >
        <Link to={backHref} aria-label="Back to Public Pages">
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </Button>
      <h1 className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
        {title}
      </h1>
      <MarketingAutoSaveStatus status={autoSaveStatus} errorMessage={autoSaveError} />
      <MarketingEditorHistoryControls
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />
    </header>
  );
}
