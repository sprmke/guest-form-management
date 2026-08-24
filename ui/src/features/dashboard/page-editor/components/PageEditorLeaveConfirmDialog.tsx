import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndLeave: () => void;
  onDiscardAndLeave: () => void;
  isSaving: boolean;
};

/** Shown when leaving the page editor (Back button) with unsaved changes still pending. */
export function PageEditorLeaveConfirmDialog({
  open,
  onOpenChange,
  onSaveAndLeave,
  onDiscardAndLeave,
  isSaving,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={isSaving ? undefined : onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save changes before leaving?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes on this page. Save them now, or discard and leave without
            saving.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
          <Button type="button" variant="outline" onClick={onDiscardAndLeave} disabled={isSaving}>
            Discard changes
          </Button>
          <Button type="button" onClick={onSaveAndLeave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save & leave'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
