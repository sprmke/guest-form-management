import { Save, X } from 'lucide-react';

import { ContextualActionBar } from '@/components/mobile/ContextualActionBar';
import { Button } from '@/components/ui/button';
import { useIsBelowLg } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

function EditActions({
  onCancel,
  cancelDisabled,
  saveDisabled,
  savePending,
  saveLabel,
  formId,
}: {
  onCancel: () => void;
  cancelDisabled?: boolean;
  saveDisabled?: boolean;
  savePending?: boolean;
  saveLabel: string;
  formId?: string;
}) {
  return (
    <div className="mx-auto flex max-w-screen-2xl items-center justify-end gap-2 sm:gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelDisabled}
        className="border-border text-muted-foreground hover:bg-muted/50 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-50"
      >
        <X className="size-3.5" aria-hidden />
        Cancel
      </button>
      <Button
        type="submit"
        form={formId}
        disabled={saveDisabled}
        size="sm"
        className="min-h-[44px] rounded-lg px-5"
      >
        <Save className="size-3.5" aria-hidden />
        {savePending ? 'Saving…' : saveLabel}
      </Button>
    </div>
  );
}

/**
 * Cancel/Save action bar for the edit form.
 *
 * - Mobile / tablet (`<lg`): claims the shared bottom band via `ContextualActionBar`
 *   (replaces the admin tab bar while editing).
 * - Desktop (`lg+`): sticky within the edit panel scroll context.
 */
export function BookingEditStickyBar({
  onCancel,
  cancelDisabled,
  saveDisabled,
  savePending,
  saveLabel,
  formId,
}: {
  onCancel: () => void;
  cancelDisabled?: boolean;
  saveDisabled?: boolean;
  savePending?: boolean;
  saveLabel: string;
  /** Save button submits this form id — works whether or not the bar is a DOM child of the `<form>`. */
  formId?: string;
}) {
  const isBelowLg = useIsBelowLg();

  const actions = (
    <EditActions
      onCancel={onCancel}
      cancelDisabled={cancelDisabled}
      saveDisabled={saveDisabled}
      savePending={savePending}
      saveLabel={saveLabel}
      formId={formId}
    />
  );

  if (isBelowLg) {
    return <ContextualActionBar>{actions}</ContextualActionBar>;
  }

  return (
    <div
      className={cn(
        'border-border/70 bg-background/95 border-t px-3 py-3 backdrop-blur-sm sm:px-5',
        'sticky bottom-0 z-0'
      )}
    >
      {actions}
    </div>
  );
}
