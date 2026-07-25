import { AlertTriangle, UserMinus } from 'lucide-react';

import type { TeamMember } from '@/features/dashboard/team/types/propertyTeam';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  open: boolean;
  member: TeamMember | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  confirmPending?: boolean;
  scopeLabel?: string;
  confirmLabel?: string;
};

export function RemoveMemberDialog({
  open,
  member,
  onOpenChange,
  onConfirm,
  confirmPending = false,
  scopeLabel = 'this property',
  confirmLabel = 'Remove Member',
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5" aria-hidden />
            Remove Team Member
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Remove {member?.name} from {scopeLabel}? They will lose access immediately.
        </p>
        <DialogFooter className="gap-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={confirmPending}>
            <UserMinus className="mr-2 size-4" aria-hidden />
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
