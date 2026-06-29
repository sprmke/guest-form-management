import type { ReactNode } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const workflowAssetRemoveButtonClass =
  'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-rose-500/35 hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-400';

type Props = {
  preview: ReactNode;
  readOnly?: boolean;
  removing?: boolean;
  uploading?: boolean;
  removeAriaLabel: string;
  onRemove: () => void;
  className?: string;
};

export function WorkflowAssetPreviewWithRemove({
  preview,
  readOnly = false,
  removing = false,
  uploading = false,
  removeAriaLabel,
  onRemove,
  className,
}: Props) {
  return (
    <div className={cn('flex items-stretch gap-2', className)}>
      <div className="min-w-0 flex-1">{preview}</div>
      {!readOnly ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing || uploading}
          aria-label={removeAriaLabel}
          title="Remove"
          className={workflowAssetRemoveButtonClass}
        >
          {removing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-4" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
