import type { UseFormRegister } from 'react-hook-form';
import { Minus } from 'lucide-react';
import { Field, Input } from '@/features/admin/components/bookingEditLayout';
import { BookingGuestDocReplacer } from '@/features/admin/components/BookingGuestDocReplacer';
import { Button } from '@/components/ui/button';
import { requiresValidId } from '@/features/guest-form/lib/guestCounts';
import type { GuestDocAssetType } from '@/features/admin/hooks/useUploadBookingAsset';
import type { BookingEditFormValues } from '@/features/admin/components/BookingEditForm';

type AdditionalGuestNameField =
  | 'guest2_name'
  | 'guest3_name'
  | 'guest4_name'
  | 'guest5_name';
type AdditionalGuestAgeField = 'guest2_age' | 'guest3_age' | 'guest4_age' | 'guest5_age';

type AdminAdditionalGuestSlotProps = {
  slotLabel: string;
  nameField: AdditionalGuestNameField;
  ageField: AdditionalGuestAgeField;
  bookingId: string;
  register: UseFormRegister<BookingEditFormValues>;
  guestAge?: number;
  validIdUrl?: string | null;
  assetType: GuestDocAssetType;
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
  /** When set, caps the age input max (e.g. fifth guest → 3). */
  maxAge?: number;
  agePlaceholder?: string;
  onRemove?: () => void;
};

export function AdminAdditionalGuestSlot({
  slotLabel,
  nameField,
  ageField,
  bookingId,
  register,
  guestAge,
  validIdUrl,
  assetType,
  onPreview,
  maxAge,
  agePlaceholder = 'Ex. 25',
  onRemove,
}: AdminAdditionalGuestSlotProps) {
  const showValidId =
    guestAge != null && !Number.isNaN(guestAge) && requiresValidId(guestAge);

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-foreground/80">
          {slotLabel}
        </p>
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[44px] shrink-0 text-muted-foreground"
            onClick={onRemove}
            aria-label={`Remove ${slotLabel.toLowerCase()}`}
          >
            <Minus className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input
            {...register(nameField)}
            placeholder="Full name (optional)"
          />
        </Field>
        <Field label="Age">
          <Input
            type="number"
            min={0}
            max={maxAge ?? 120}
            placeholder={agePlaceholder}
            {...register(ageField, { valueAsNumber: true })}
          />
        </Field>
      </div>
      {showValidId && (
        <BookingGuestDocReplacer
          bookingId={bookingId}
          assetType={assetType}
          label="Valid ID"
          currentUrl={validIdUrl}
          accept="image/*,.pdf"
          onPreview={onPreview}
        />
      )}
    </div>
  );
}
