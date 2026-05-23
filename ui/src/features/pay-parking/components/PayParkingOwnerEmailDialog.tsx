import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ownerEmailSchema = z.string().email('Enter a valid email address');

type Props = {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string) => void;
  onGoBack: () => void;
};

export function PayParkingOwnerEmailDialog({
  open,
  pending,
  onOpenChange,
  onSubmit,
  onGoBack,
}: Props) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail('');
      setTouched(false);
    }
  }, [open]);

  const validation = ownerEmailSchema.safeParse(email.trim());
  const error =
    touched && !validation.success
      ? validation.error.issues[0]?.message
      : undefined;

  function handleSubmit() {
    setTouched(true);
    const parsed = ownerEmailSchema.safeParse(email.trim());
    if (!parsed.success) return;
    onSubmit(parsed.data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send to parking owner</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <Label htmlFor="pay-parking-owner-email" className="text-sm">
            Parking owner email
          </Label>
          <Input
            id="pay-parking-owner-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="owner@example.com"
            value={email}
            disabled={pending}
            aria-invalid={Boolean(error)}
            className="h-11"
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="min-h-[44px] w-full gap-2"
            disabled={pending || !email.trim()}
            onClick={handleSubmit}
          >
            {pending ? (
              <Loader2 className="animate-spin size-4 shrink-0" aria-hidden />
            ) : (
              <Mail className="size-4 shrink-0" aria-hidden />
            )}
            Update &amp; send email
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full gap-2"
            disabled={pending}
            onClick={onGoBack}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Go back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
