/**
 * Guests edit tab — mirrors view `GuestsPanel` card split:
 * Primary Guest (identity + valid ID) · Guest list · Notes / referral / source.
 */

import { Info, Plus, UserRound, Users } from 'lucide-react';

import { BOOKING_SOURCE_OPTIONS } from '@/features/guest/form/lib/bookingSourceFromSearchParams';
import {
  FIFTH_PARTY_GUEST_MAX_AGE,
  MAX_GUESTS,
  PRIMARY_GUEST_MIN_AGE,
  guestPartyPositionLabel,
  isPartyFifthGuest,
} from '@/features/guest/form/lib/guestCounts';

import { AdminAdditionalGuestSlot } from '@/features/dashboard/bookings/components/AdminAdditionalGuestSlot';
import {
  CheckboxOption,
  Field,
  fieldAriaProps,
  fieldControlClass,
  fieldErrorMessage,
  Input,
  Row2,
} from '@/features/dashboard/bookings/components/booking-detail/edit/BookingEditFields';
import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import type {
  AdditionalGuestSlotConfig,
  BookingEditFormValues,
} from '@/features/dashboard/bookings/components/BookingEditForm';
import { BookingGuestDocReplacer } from '@/features/dashboard/bookings/components/BookingGuestDocReplacer';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';

import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

type Props = {
  booking: BookingRow;
  register: UseFormRegister<BookingEditFormValues>;
  errors: FieldErrors<BookingEditFormValues>;
  setValue: UseFormSetValue<BookingEditFormValues>;
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
  formSnapshot: BookingEditFormValues;
  adminPartySize: number;
  visibleAdditionalGuestCount: number;
  visibleAdditionalGuestSlots: AdditionalGuestSlotConfig[];
  onAddAdditionalGuest: () => void;
  onRemoveAdditionalGuest: (slot: AdditionalGuestSlotConfig) => void;
  surpriseDecorChangedFromSaved: boolean;
};

export function GuestIdentityTab({
  booking,
  register,
  errors,
  setValue,
  onPreview,
  formSnapshot,
  adminPartySize,
  visibleAdditionalGuestCount,
  visibleAdditionalGuestSlots,
  onAddAdditionalGuest,
  onRemoveAdditionalGuest,
  surpriseDecorChangedFromSaved,
}: Props) {
  return (
    <div className="space-y-4">
      <BookingDetailCard title="Primary Guest" icon={UserRound} tone="edit">
        <div className="space-y-3.5 sm:space-y-4">
          <Row2>
            <Field
              label="Primary guest name"
              required
              htmlFor="primary_guest_name"
              fieldKey="primary_guest_name"
              error={
                fieldErrorMessage(errors.primary_guest_name) ??
                (errors.primary_guest_name ? 'Required' : undefined)
              }
            >
              <Input
                {...register('primary_guest_name', { required: 'Required' })}
                autoComplete="name"
                {...fieldAriaProps(
                  'primary_guest_name',
                  fieldErrorMessage(errors.primary_guest_name) ??
                    (errors.primary_guest_name ? 'Required' : undefined)
                )}
              />
            </Field>
            <Field
              label="Primary guest age"
              required
              htmlFor="primary_guest_age"
              fieldKey="primary_guest_age"
              error={fieldErrorMessage(errors.primary_guest_age)}
            >
              <Input
                type="number"
                min={PRIMARY_GUEST_MIN_AGE}
                max={120}
                inputMode="numeric"
                placeholder="Ex. 25"
                {...register('primary_guest_age', {
                  required: 'Required',
                  valueAsNumber: true,
                  validate: (value) => {
                    const age = typeof value === 'number' ? value : Number(value);
                    return !Number.isNaN(age) && age >= PRIMARY_GUEST_MIN_AGE
                      ? true
                      : 'Primary guest must be 18 years or older';
                  },
                })}
                {...fieldAriaProps(
                  'primary_guest_age',
                  fieldErrorMessage(errors.primary_guest_age)
                )}
              />
            </Field>
          </Row2>
          <Row2>
            <Field
              label="Email"
              required
              htmlFor="guest_email"
              fieldKey="guest_email"
              error={
                fieldErrorMessage(errors.guest_email) ??
                (errors.guest_email ? 'Required' : undefined)
              }
            >
              <Input
                type="email"
                autoComplete="email"
                {...register('guest_email', { required: 'Required' })}
                {...fieldAriaProps(
                  'guest_email',
                  fieldErrorMessage(errors.guest_email) ??
                    (errors.guest_email ? 'Required' : undefined)
                )}
              />
            </Field>
            <Field
              label="Phone"
              required
              htmlFor="guest_phone_number"
              fieldKey="guest_phone_number"
              error={
                fieldErrorMessage(errors.guest_phone_number) ??
                (errors.guest_phone_number ? 'Required' : undefined)
              }
            >
              <Input
                type="tel"
                autoComplete="tel"
                {...register('guest_phone_number', { required: 'Required' })}
                {...fieldAriaProps(
                  'guest_phone_number',
                  fieldErrorMessage(errors.guest_phone_number) ??
                    (errors.guest_phone_number ? 'Required' : undefined)
                )}
              />
            </Field>
          </Row2>
          <Row2>
            <Field
              label="Display name"
              required
              htmlFor="guest_facebook_name"
              fieldKey="guest_facebook_name"
              error={
                fieldErrorMessage(errors.guest_facebook_name) ??
                (errors.guest_facebook_name ? 'Required' : undefined)
              }
            >
              <Input
                {...register('guest_facebook_name', { required: 'Required' })}
                {...fieldAriaProps(
                  'guest_facebook_name',
                  fieldErrorMessage(errors.guest_facebook_name) ??
                    (errors.guest_facebook_name ? 'Required' : undefined)
                )}
              />
            </Field>
            <Field label="Nationality" htmlFor="nationality">
              <Input id="nationality" autoComplete="country-name" {...register('nationality')} />
            </Field>
          </Row2>
          <Field label="Address" htmlFor="guest_address">
            <Input
              id="guest_address"
              autoComplete="street-address"
              {...register('guest_address')}
            />
          </Field>
          <BookingGuestDocReplacer
            bookingId={booking.id}
            assetType="valid_id"
            label="Valid ID"
            currentUrl={booking.valid_id_url}
            accept="image/*,.pdf"
            onPreview={onPreview}
          />
        </div>
      </BookingDetailCard>

      <BookingDetailCard title="Guest list" icon={Users} tone="edit">
        {visibleAdditionalGuestSlots.length > 0 ? (
          <div className="mb-3 space-y-3">
            {visibleAdditionalGuestSlots.map((slot, index) => {
              const ageValue = formSnapshot[slot.ageField];
              const isLastVisible = index === visibleAdditionalGuestSlots.length - 1;
              const isFifthPartyGuest = isPartyFifthGuest(slot.partyPosition, adminPartySize);

              return (
                <AdminAdditionalGuestSlot
                  key={slot.partyPosition}
                  slotLabel={guestPartyPositionLabel(slot.partyPosition)}
                  nameField={slot.nameField}
                  ageField={slot.ageField}
                  bookingId={booking.id}
                  register={register}
                  guestAge={ageValue === '' ? undefined : ageValue}
                  validIdUrl={booking[slot.validIdUrlKey]}
                  assetType={slot.assetType}
                  maxAge={isFifthPartyGuest ? FIFTH_PARTY_GUEST_MAX_AGE : undefined}
                  agePlaceholder={isFifthPartyGuest ? '3' : 'Ex. 25'}
                  onPreview={onPreview}
                  onRemove={isLastVisible ? () => onRemoveAdditionalGuest(slot) : undefined}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground mb-3 text-sm">No additional guests.</p>
        )}
        {visibleAdditionalGuestCount < MAX_GUESTS - 1 ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full cursor-pointer"
            onClick={onAddAdditionalGuest}
          >
            <Plus className="size-4" aria-hidden />
            Add guest
          </Button>
        ) : null}
      </BookingDetailCard>

      <BookingDetailCard title="Notes & source" tone="edit">
        <div className="space-y-3.5 sm:space-y-4">
          <CheckboxOption
            label="Guest requested a surprise decor / room setup"
            checked={!!formSnapshot?.guest_requests_surprise_decor}
            onCheckedChange={(value) =>
              setValue('guest_requests_surprise_decor', value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          {surpriseDecorChangedFromSaved ? (
            <div
              role="status"
              className="border-primary/25 bg-primary/5 text-foreground dark:border-primary/30 dark:bg-primary/10 flex gap-2 rounded-lg border px-3 py-2.5 text-[12px] leading-snug sm:text-[13px]"
            >
              <Info className="text-primary mt-0.5 size-4 shrink-0 sm:size-[18px]" aria-hidden />
              <p className="min-w-0 [overflow-wrap:anywhere]">
                Update <strong>Additional fee</strong> under{' '}
                <strong>Workflow → Review Pricing</strong> if this changes.
              </p>
            </div>
          ) : null}

          <Row2>
            <Field label="Referral channel">
              <Input {...register('find_us')} placeholder="Facebook, Airbnb…" />
            </Field>
            <Field label="Details">
              <Input {...register('find_us_details')} placeholder="Referred by…" />
            </Field>
          </Row2>

          <Field label="Requests / notes">
            <textarea
              {...register('guest_special_requests')}
              rows={3}
              placeholder="Any special requests from the guest…"
              className={cn(fieldControlClass, 'resize-y')}
            />
          </Field>

          <Field label="Platform" htmlFor="booking_source">
            <NativeSelect id="booking_source" {...register('booking_source', { required: true })}>
              {BOOKING_SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </BookingDetailCard>
    </div>
  );
}
