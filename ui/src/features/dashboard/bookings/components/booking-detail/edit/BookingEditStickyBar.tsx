import { Save, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Cancel/Save action bar for the edit form. Relocated from `EditStickyBar`
 * (`BookingEditLayout.tsx`) with one behavior change: it's now
 * viewport-sticky rather than only sticky to the bottom of the edit card, so
 * Save stays reachable regardless of which tab is active.
 *
 * - Mobile (<sm): `fixed bottom-0` full-width bar, safe-area-inset-bottom
 *   padded (matches the fixed-bottom pattern used elsewhere, e.g.
 *   `dialog.tsx`, `MainLayout.tsx` footer).
 * - Desktop (sm+): `sticky bottom-0` within the edit panel's scroll context.
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
  return (
    <div
      className={cn(
        'border-border/70 bg-background/95 border-t px-3 py-3 backdrop-blur-sm sm:px-5',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'fixed inset-x-0 bottom-0 z-30 sm:sticky sm:z-0'
      )}
    >
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
    </div>
  );
}
