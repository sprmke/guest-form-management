import { useEffect, useMemo } from 'react';

import { ClipboardList } from 'lucide-react';

import { AdminSection } from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { SettingsField } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { useParkings } from '@/features/dashboard/org/hooks/useParkings';
import type { PropertyProfileDraft } from '@/features/dashboard/org/lib/propertySettingsForm';

import { FieldLabel } from '@/components/forms/FieldLabel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CLEANING_BUFFER_OPTIONS } from '@/lib/cleaningBuffer';
import { cn } from '@/lib/utils';

function GuestFormToggleRow({
  id,
  label,
  help,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-border/40 bg-muted/15 flex min-h-[44px] items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <FieldLabel htmlFor={id} label={label} help={help} className="min-w-0 flex-1" />
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
  setField,
  resolveFieldError,
}: {
  draft: PropertyProfileDraft;
  disabled?: boolean;
  onChange: <K extends keyof PropertyProfileDraft>(key: K, value: PropertyProfileDraft[K]) => void;
  setField: <K extends keyof PropertyProfileDraft>(
    key: K,
    value: PropertyProfileDraft[K],
    fieldId: string
  ) => void;
  resolveFieldError: (fieldId: string) => string | null;
}) {
  const fieldError = resolveFieldError;
  const orgCtx = useOptionalOrgContext();
  const orgSlug = orgCtx?.orgSlug;
  const parkingsQuery = useParkings(orgSlug);
  const activeParkings = useMemo(
    () => (parkingsQuery.data?.parkings ?? []).filter((p) => p.status === 'ACTIVE'),
    [parkingsQuery.data?.parkings]
  );
  const firstActiveParkingId = useMemo(() => {
    if (activeParkings.length === 0) return null;
    const sorted = [...activeParkings].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return sorted[0]?.id ?? null;
  }, [activeParkings]);

  // Heal stale preferred (deleted/inactive listing). Empty/"None" is allowed —
  // create-parking backfills preferred when a listing is added.
  useEffect(() => {
    if (disabled || !firstActiveParkingId) return;
    const current = draft.preferredOwnerParkingId.trim();
    if (!current) return;
    if (activeParkings.some((p) => p.id === current)) return;
    setField('preferredOwnerParkingId', firstActiveParkingId, 'guest-form-preferred-owner-parking');
  }, [activeParkings, disabled, draft.preferredOwnerParkingId, firstActiveParkingId, setField]);

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
          help="Pet approval on the booking form."
          checked={draft.allowPets}
          disabled={disabled}
          onCheckedChange={(value) => onChange('allowPets', value)}
        />
        <GuestFormToggleRow
          id="guest-form-allow-parking"
          label="Allow Parking"
          help="Parking requests on the booking form."
          checked={draft.allowParking}
          disabled={disabled}
          onCheckedChange={(value) => onChange('allowParking', value)}
        />
        <GuestFormToggleRow
          id="guest-form-allow-surprise-decor"
          label="Allow Surprise Decor"
          help="Surprise decor requests on the booking form."
          checked={draft.allowSurpriseDecor}
          disabled={disabled}
          onCheckedChange={(value) => onChange('allowSurpriseDecor', value)}
        />
        <GuestFormToggleRow
          id="guest-form-complimentary-owner-parking"
          label="Complimentary own parking"
          help="Skip payment when guests book your org’s parking for this stay."
          checked={draft.complimentaryOwnerParking}
          disabled={disabled || !draft.allowParking}
          onCheckedChange={(value) => onChange('complimentaryOwnerParking', value)}
        />
      </div>

      {activeParkings.length > 0 ? (
        <SettingsField
          id="guest-form-preferred-owner-parking"
          label="Preferred parking"
          error={fieldError('guest-form-preferred-owner-parking')}
          className="mt-4"
        >
          <Select
            value={draft.preferredOwnerParkingId || '__none__'}
            onValueChange={(value) =>
              setField(
                'preferredOwnerParkingId',
                value === '__none__' ? '' : value,
                'guest-form-preferred-owner-parking'
              )
            }
            disabled={disabled || !draft.allowParking}
          >
            <SelectTrigger id="guest-form-preferred-owner-parking">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {activeParkings.map((parking) => (
                <SelectItem key={parking.id} value={parking.id}>
                  {parking.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
      ) : null}

      <SettingsField
        id="guest-form-cleaning-buffer"
        label="Cleaning Time"
        required
        error={fieldError('guest-form-cleaning-buffer')}
        help="Time needed to clean between a checkout and the next check-in on the same day."
        className="mt-4"
      >
        <Select
          value={String(draft.cleaningBufferMinutes)}
          onValueChange={(value) =>
            setField('cleaningBufferMinutes', Number(value), 'guest-form-cleaning-buffer')
          }
          disabled={disabled}
        >
          <SelectTrigger
            id="guest-form-cleaning-buffer"
            aria-invalid={Boolean(fieldError('guest-form-cleaning-buffer'))}
            className={cn(fieldError('guest-form-cleaning-buffer') && 'border-destructive')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLEANING_BUFFER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsField>
    </AdminSection>
  );
}
