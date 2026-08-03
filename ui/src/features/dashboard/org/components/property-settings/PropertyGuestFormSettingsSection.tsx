import { ClipboardList } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import type { PropertyProfileDraft } from '@/features/dashboard/org/lib/propertySettingsForm';

import { cn } from '@/lib/utils';

function GuestFormToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-border/40 bg-muted/15 flex min-h-[44px] items-start justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor={id} className="text-foreground text-sm font-medium leading-snug">
          {label}
        </label>
        <p className="text-muted-foreground text-xs leading-snug">{description}</p>
      </div>
      <div className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center">
        <button
          type="button"
          id={id}
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            checked ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'bg-background pointer-events-none block size-5 rounded-full shadow-sm transition-transform',
              checked ? 'translate-x-[18px]' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>
    </div>
  );
}

export function PropertyGuestFormSettingsSection({
  draft,
  disabled = false,
  onChange,
}: {
  draft: PropertyProfileDraft;
  disabled?: boolean;
  onChange: <K extends keyof PropertyProfileDraft>(key: K, value: PropertyProfileDraft[K]) => void;
}) {
  return (
    <AdminSection
      id="guest-form"
      title="Guest Form"
      icon={ClipboardList}
      description="Pets, parking, and decor on the booking form."
    >
      <div className="space-y-2">
        <GuestFormToggleRow
          id="guest-form-allow-pets"
          label="Allow Pets"
          description="Pet approval on the booking form."
          checked={draft.allowPets}
          disabled={disabled}
          onCheckedChange={(value) => onChange('allowPets', value)}
        />
        <GuestFormToggleRow
          id="guest-form-allow-parking"
          label="Allow Parking"
          description="Parking requests on the booking form."
          checked={draft.allowParking}
          disabled={disabled}
          onCheckedChange={(value) => onChange('allowParking', value)}
        />
        <GuestFormToggleRow
          id="guest-form-allow-surprise-decor"
          label="Allow Surprise Decor"
          description="Surprise decor requests on the booking form."
          checked={draft.allowSurpriseDecor}
          disabled={disabled}
          onCheckedChange={(value) => onChange('allowSurpriseDecor', value)}
        />
      </div>
    </AdminSection>
  );
}
