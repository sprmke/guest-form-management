import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
};

export function MarketingNameDialog({
  open,
  onOpenChange,
  title,
  label = 'Name',
  defaultValue = '',
  confirmLabel = 'Save',
  onConfirm,
}: Props) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(calc(100vw-1.5rem),24rem)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="marketing-name-input">{label}</Label>
          <Input
            id="marketing-name-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-10"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
