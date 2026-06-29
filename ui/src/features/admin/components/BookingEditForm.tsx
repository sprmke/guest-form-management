/**
 * BookingEditForm — inline edit form for all guest booking fields.
 *
 * Shown in the left column of BookingDetailPage when the admin clicks "Edit".
 * While the booking is in **Pending documents** (parent or GAF / parking / pet)
 * or **Ready for check-in**, saving **workflow-sensitive** guest/stay fields
 * reverts status to PENDING_REVIEW (see `hasWorkflowSensitiveGuestFieldDiff`
 * + docs/TODOS.md). Other edits keep status unchanged.
 *
 * Uses React Hook Form (no Zod for now — lightweight admin-only form).
 */

import React, { useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { friendlyToastError } from "@/lib/toastMessages";
import { Info, Plus, Save, X } from "lucide-react";
import {
  CollapsibleGroup,
  Field,
  Input,
  Row2,
  Row3,
  Section,
  CheckboxOption,
  fieldControlClass,
} from "@/features/admin/components/bookingEditLayout";
import { BookingProgressFormsEdit } from "@/features/admin/components/BookingProgressFormsEdit";
import {
  progressFormPayloadFromState,
  type ProgressFormEditState,
} from "@/features/admin/lib/bookingProgressEditPayload";
import { cn } from "@/lib/utils";
import {
  useUpdateBooking,
  type UpdateBookingPayload,
} from "@/features/admin/hooks/useUpdateBooking";
import { hasWorkflowSensitiveGuestFieldDiff } from "@/features/admin/lib/workflowSensitiveGuestDiff";
import { shouldRevertGuestFieldEditsToPendingReview } from "@/features/admin/lib/bookingStatus";
import { ReadyForCheckinSensitiveFieldsNotice } from "@/features/admin/components/ReadyForCheckinSensitiveFieldsNotice";
import { AdminAdditionalGuestSlot } from "@/features/admin/components/AdminAdditionalGuestSlot";
import { BookingGuestDocReplacer } from "@/features/admin/components/BookingGuestDocReplacer";
import type { GuestDocAssetType } from "@/features/admin/hooks/useUploadBookingAsset";
import {
  computeGuestCounts,
  DEFAULT_GUEST_AGE,
  getInitialVisibleGuestCount,
  guestPartyPositionLabel,
  MAX_GUESTS,
  PRIMARY_GUEST_MIN_AGE,
} from "@/features/guest-form/lib/guestCounts";
import type { BookingRow } from "@/features/admin/lib/types";
import {
  BOOKING_SOURCE_OPTIONS,
  normalizeBookingSource,
} from "@/features/guest-form/lib/bookingSourceFromSearchParams";
import { NativeSelect } from "@/components/ui/native-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import {
  createDisabledCheckoutDateMatcher,
  createDisabledDateMatcher,
  dateToString,
  getNextDay,
  normalizeDateString,
  stringToDate,
  DATE_PICKER_DISPLAY_FORMAT,
  type BookedDateRange,
} from "@/utils/dates";

const bookingEditDatePickerClass =
  "h-11 border-border/50 bg-muted/40 font-medium hover:border-primary/25 focus-visible:ring-2 focus-visible:ring-ring/30";

type Props = {
  booking: BookingRow;
  onClose: () => void;
  onSaved: (updated: BookingRow) => void;
  /** Same handler as view-mode doc previews — opens in-page modal (resolved URL for private buckets). */
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
};

export type BookingEditFormValues = FormValues;

type FormValues = {
  booking_source: string;
  guest_facebook_name: string;
  primary_guest_name: string;
  guest_email: string;
  guest_phone_number: string;
  guest_address: string;
  nationality: string;
  primary_guest_age: number | "";
  guest2_name: string;
  guest2_age: number | "";
  guest3_name: string;
  guest3_age: number | "";
  guest4_name: string;
  guest4_age: number | "";
  guest5_name: string;
  guest5_age: number | "";
  check_in_date: string;
  check_out_date: string;
  check_in_time: string;
  check_out_time: string;
  number_of_adults: number;
  number_of_children: number;
  number_of_nights: number;
  need_parking: boolean;
  car_plate_number: string;
  car_brand_model: string;
  car_color: string;
  has_pets: boolean;
  pet_name: string;
  pet_type: string;
  pet_breed: string;
  pet_age: string;
  pet_vaccination_date: string;
  find_us: string;
  find_us_details: string;
  guest_special_requests: string;
  guest_requests_surprise_decor: boolean;
};

function toStr(v: string | null | undefined) {
  return v ?? "";
}

function toAge(v: number | null | undefined): number | "" {
  if (v != null && !Number.isNaN(v)) return v;
  return "";
}

function getInitialVisibleAdditionalGuestCount(booking: BookingRow): number {
  const partyCount = getInitialVisibleGuestCount([
    {
      name: booking.primary_guest_name ?? undefined,
      age: booking.primary_guest_age ?? undefined,
    },
    {
      name: booking.guest2_name ?? undefined,
      age: booking.guest2_age ?? undefined,
    },
    {
      name: booking.guest3_name ?? undefined,
      age: booking.guest3_age ?? undefined,
    },
    {
      name: booking.guest4_name ?? undefined,
      age: booking.guest4_age ?? undefined,
    },
    {
      name: booking.guest5_name ?? undefined,
      age: booking.guest5_age ?? undefined,
    },
  ]);
  return Math.max(0, partyCount - 1);
}

type AdditionalGuestSlotConfig = {
  partyPosition: number;
  nameField: "guest2_name" | "guest3_name" | "guest4_name" | "guest5_name";
  ageField: "guest2_age" | "guest3_age" | "guest4_age" | "guest5_age";
  validIdUrlKey:
    | "guest2_valid_id_url"
    | "guest3_valid_id_url"
    | "guest4_valid_id_url"
    | "guest5_valid_id_url";
  assetType: GuestDocAssetType;
};

const ADDITIONAL_GUEST_SLOTS: AdditionalGuestSlotConfig[] = [
  {
    partyPosition: 2,
    nameField: "guest2_name",
    ageField: "guest2_age",
    validIdUrlKey: "guest2_valid_id_url",
    assetType: "guest2_valid_id",
  },
  {
    partyPosition: 3,
    nameField: "guest3_name",
    ageField: "guest3_age",
    validIdUrlKey: "guest3_valid_id_url",
    assetType: "guest3_valid_id",
  },
  {
    partyPosition: 4,
    nameField: "guest4_name",
    ageField: "guest4_age",
    validIdUrlKey: "guest4_valid_id_url",
    assetType: "guest4_valid_id",
  },
  {
    partyPosition: 5,
    nameField: "guest5_name",
    ageField: "guest5_age",
    validIdUrlKey: "guest5_valid_id_url",
    assetType: "guest5_valid_id",
  },
];

function normalizeGuestAge(value: number | ""): number | null {
  if (value === "" || Number.isNaN(value)) return null;
  return value;
}

function bookingEditPayloadFromValues(
  values: FormValues,
): UpdateBookingPayload {
  return {
    booking_source: normalizeBookingSource(values.booking_source),
    guest_facebook_name: values.guest_facebook_name,
    primary_guest_name: values.primary_guest_name,
    guest_email: values.guest_email,
    guest_phone_number: values.guest_phone_number,
    guest_address: values.guest_address || null,
    nationality: values.nationality || null,
    primary_guest_age: normalizeGuestAge(values.primary_guest_age),
    guest2_name: values.guest2_name || null,
    guest2_age: values.guest2_name.trim()
      ? normalizeGuestAge(values.guest2_age)
      : null,
    guest3_name: values.guest3_name || null,
    guest3_age: values.guest3_name.trim()
      ? normalizeGuestAge(values.guest3_age)
      : null,
    guest4_name: values.guest4_name || null,
    guest4_age: values.guest4_name.trim()
      ? normalizeGuestAge(values.guest4_age)
      : null,
    guest5_name: values.guest5_name || null,
    guest5_age: values.guest5_name.trim()
      ? normalizeGuestAge(values.guest5_age)
      : null,
    check_in_date: values.check_in_date,
    check_out_date: values.check_out_date,
    check_in_time: values.check_in_time || null,
    check_out_time: values.check_out_time || null,
    number_of_adults: Number(values.number_of_adults),
    number_of_children: Number(values.number_of_children) || null,
    number_of_nights: Number(values.number_of_nights),
    need_parking: values.need_parking,
    car_plate_number: values.need_parking
      ? values.car_plate_number || null
      : null,
    car_brand_model: values.need_parking
      ? values.car_brand_model || null
      : null,
    car_color: values.need_parking ? values.car_color || null : null,
    has_pets: values.has_pets,
    pet_name: values.has_pets ? values.pet_name || null : null,
    pet_type: values.has_pets ? values.pet_type || null : null,
    pet_breed: values.has_pets ? values.pet_breed || null : null,
    pet_age: values.has_pets ? values.pet_age || null : null,
    pet_vaccination_date: values.has_pets
      ? values.pet_vaccination_date || null
      : null,
    find_us: values.find_us || null,
    find_us_details: values.find_us_details || null,
    guest_special_requests: values.guest_special_requests || null,
    guest_requests_surprise_decor: values.guest_requests_surprise_decor,
  };
}

function toTimeInputValue(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  // Already HTML time input compatible.
  if (/^\d{2}:\d{2}$/.test(raw)) return raw;

  // DB values may include seconds.
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);

  // Legacy 12-hour format like "2:00 PM".
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return "";
  const hour12 = Number(m[1]);
  const minute = m[2];
  const ampm = m[3].toUpperCase();
  let hour24 = hour12 % 12;
  if (ampm === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

function bookingToEditFormValues(booking: BookingRow): FormValues {
  return {
    booking_source: normalizeBookingSource(booking.booking_source),
    guest_facebook_name: toStr(booking.guest_facebook_name),
    primary_guest_name: toStr(booking.primary_guest_name),
    guest_email: toStr(booking.guest_email),
    guest_phone_number: toStr(booking.guest_phone_number),
    guest_address: toStr(booking.guest_address),
    nationality: toStr(booking.nationality),
    primary_guest_age: toAge(booking.primary_guest_age),
    guest2_name: toStr(booking.guest2_name),
    guest2_age: toAge(booking.guest2_age),
    guest3_name: toStr(booking.guest3_name),
    guest3_age: toAge(booking.guest3_age),
    guest4_name: toStr(booking.guest4_name),
    guest4_age: toAge(booking.guest4_age),
    guest5_name: toStr(booking.guest5_name),
    guest5_age: toAge(booking.guest5_age),
    check_in_date: normalizeDateString(toStr(booking.check_in_date)),
    check_out_date: normalizeDateString(toStr(booking.check_out_date)),
    check_in_time: toTimeInputValue(booking.check_in_time),
    check_out_time: toTimeInputValue(booking.check_out_time),
    number_of_adults: booking.number_of_adults ?? 1,
    number_of_children: booking.number_of_children ?? 0,
    number_of_nights: booking.number_of_nights ?? 1,
    need_parking: booking.need_parking ?? false,
    car_plate_number: toStr(booking.car_plate_number),
    car_brand_model: toStr(booking.car_brand_model),
    car_color: toStr(booking.car_color),
    has_pets: booking.has_pets ?? false,
    pet_name: toStr(booking.pet_name),
    pet_type: toStr(booking.pet_type),
    pet_breed: toStr(booking.pet_breed),
    pet_age: toStr(booking.pet_age),
    pet_vaccination_date: normalizeDateString(
      toStr(booking.pet_vaccination_date),
    ),
    find_us: toStr(booking.find_us),
    find_us_details: toStr(booking.find_us_details),
    guest_special_requests: toStr(booking.guest_special_requests),
    guest_requests_surprise_decor: !!booking.guest_requests_surprise_decor,
  };
}

export function BookingEditForm({
  booking,
  onClose,
  onSaved,
  onPreview,
}: Props) {
  const guestEditRevertPipeline = shouldRevertGuestFieldEditsToPendingReview(
    booking.status,
  );
  const updateMut = useUpdateBooking();
  const apiUrl = import.meta.env.VITE_API_URL;
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [progressFormState, setProgressFormState] =
    useState<ProgressFormEditState>({
      pricing: null,
      parking: null,
      guestBalance: null,
      sdSettlement: null,
      sdRefundGuest: null,
    });
  const [progressTouched, setProgressTouched] = useState(false);
  const [visibleAdditionalGuestCount, setVisibleAdditionalGuestCount] =
    useState(() => getInitialVisibleAdditionalGuestCount(booking));

  const savedSensitiveBaseline = React.useMemo(
    () => bookingEditPayloadFromValues(bookingToEditFormValues(booking)),
    [booking],
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: bookingToEditFormValues(booking),
  });

  /** `useWatch` subscribes reliably; bare `watch()` here did not always re-render on edits. */
  const formSnapshot = useWatch({ control }) as FormValues;
  const watchParking = !!formSnapshot?.need_parking;
  const watchPets = !!formSnapshot?.has_pets;
  const watchSurpriseDecor = !!formSnapshot?.guest_requests_surprise_decor;
  const surpriseDecorChangedFromSaved =
    watchSurpriseDecor !== !!booking.guest_requests_surprise_decor;
  const watchCheckInDate = formSnapshot?.check_in_date ?? "";
  const progressDirty = progressTouched;
  const showSensitiveRevertHint =
    guestEditRevertPipeline &&
    (isDirty || progressDirty) &&
    hasWorkflowSensitiveGuestFieldDiff(
      savedSensitiveBaseline,
      bookingEditPayloadFromValues(formSnapshot),
    );
  const canSave = isDirty || progressDirty;

  React.useEffect(() => {
    let mounted = true;
    const fetchBookedDates = async () => {
      try {
        const response = await fetch(`${apiUrl}/get-booked-dates`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });
        const result = await response.json();
        if (!mounted || !response.ok || !result?.success || !result?.data)
          return;
        const normalized = result.data.map((entry: BookedDateRange) => ({
          ...entry,
          checkInDate: normalizeDateString(entry.checkInDate),
          checkOutDate: normalizeDateString(entry.checkOutDate),
        }));
        setBookedDates(normalized);
      } catch (error) {
        console.error(
          "Failed to fetch booked dates for admin edit form:",
          error,
        );
      }
    };
    void fetchBookedDates();
    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  React.useEffect(() => {
    const counts = computeGuestCounts([
      {
        name: formSnapshot?.primary_guest_name,
        age:
          formSnapshot?.primary_guest_age === ""
            ? undefined
            : formSnapshot?.primary_guest_age,
      },
      {
        name: formSnapshot?.guest2_name,
        age:
          formSnapshot?.guest2_age === ""
            ? undefined
            : formSnapshot?.guest2_age,
      },
      {
        name: formSnapshot?.guest3_name,
        age:
          formSnapshot?.guest3_age === ""
            ? undefined
            : formSnapshot?.guest3_age,
      },
      {
        name: formSnapshot?.guest4_name,
        age:
          formSnapshot?.guest4_age === ""
            ? undefined
            : formSnapshot?.guest4_age,
      },
      {
        name: formSnapshot?.guest5_name,
        age:
          formSnapshot?.guest5_age === ""
            ? undefined
            : formSnapshot?.guest5_age,
      },
    ]);
    setValue("number_of_adults", counts.adults, { shouldDirty: false });
    setValue("number_of_children", counts.children, { shouldDirty: false });
  }, [
    formSnapshot?.primary_guest_name,
    formSnapshot?.primary_guest_age,
    formSnapshot?.guest2_name,
    formSnapshot?.guest2_age,
    formSnapshot?.guest3_name,
    formSnapshot?.guest3_age,
    formSnapshot?.guest4_name,
    formSnapshot?.guest4_age,
    formSnapshot?.guest5_name,
    formSnapshot?.guest5_age,
    setValue,
  ]);

  const visibleAdditionalGuestSlots = ADDITIONAL_GUEST_SLOTS.slice(
    0,
    visibleAdditionalGuestCount,
  );

  const clearAdditionalGuestSlot = (slot: AdditionalGuestSlotConfig) => {
    setValue(slot.nameField, "", { shouldDirty: true });
    setValue(slot.ageField, "", { shouldDirty: true });
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const payload = {
      ...bookingEditPayloadFromValues(values),
      ...(progressTouched
        ? progressFormPayloadFromState(booking, progressFormState)
        : {}),
    };

    const newSource = normalizeBookingSource(values.booking_source);
    const wasAirbnb =
      normalizeBookingSource(booking.booking_source) === "Airbnb";
    const isNowAirbnb = newSource === "Airbnb";
    if (isNowAirbnb) {
      payload.down_payment = 0;
      payload.security_deposit = 0;
      const rate =
        payload.booking_rate ??
        (booking.booking_rate != null ? Number(booking.booking_rate) : null);
      if (rate != null && !Number.isNaN(rate)) {
        payload.balance = Math.round(rate * 100) / 100;
      }
    }
    if (isNowAirbnb && !wasAirbnb) {
      payload.guest_balance_paid_amount = null;
      payload.guest_balance_payment_receipt_url = null;
      payload.balance_receipt_ai_verdict = null;
      payload.balance_receipt_ai_summary = null;
    }

    const revertToPendingReview =
      guestEditRevertPipeline &&
      hasWorkflowSensitiveGuestFieldDiff(savedSensitiveBaseline, payload);

    try {
      const updated = await updateMut.mutateAsync({
        bookingId: booking.id,
        currentStatus: booking.status,
        payload,
        revertToPendingReview,
      });

      if (revertToPendingReview) {
        toast.success("Booking updated — moved to Pending Review");
      } else {
        toast.success("Booking updated");
      }
      onSaved(updated);
    } catch (err: unknown) {
      toast.error(friendlyToastError(err, "Could not save booking"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <ReadyForCheckinSensitiveFieldsNotice visible={showSensitiveRevertHint} />

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md",
          "ring-1 ring-border/30 dark:ring-border/50",
        )}
      >
        <CollapsibleGroup
          id="booking-details"
          title="Guest Form Details"
          variant="nested"
          defaultOpen
        >
          {/* ── Guest Identity ─────────────────────────────────────────────────── */}
          <Section title="Guest Identity">
            <Row2>
              <Field label="Primary Guest Name" required>
                <Input
                  {...register("primary_guest_name", { required: true })}
                />
              </Field>
              <Field label="Primary Guest Age" required>
                <Input
                  type="number"
                  min={PRIMARY_GUEST_MIN_AGE}
                  max={120}
                  placeholder="Ex. 25"
                  {...register("primary_guest_age", {
                    required: true,
                    valueAsNumber: true,
                    validate: (value) => {
                      const age =
                        typeof value === "number" ? value : Number(value);
                      return !Number.isNaN(age) && age >= PRIMARY_GUEST_MIN_AGE
                        ? true
                        : "Primary guest must be 18 years or older";
                    },
                  })}
                />
              </Field>
            </Row2>
            <Row2>
              <Field label="Email" required>
                <Input
                  type="email"
                  {...register("guest_email", { required: true })}
                />
              </Field>
              <Field label="Phone Number" required>
                <Input
                  {...register("guest_phone_number", { required: true })}
                />
              </Field>
            </Row2>
            <Row2>
              <Field label="Facebook / Airbnb Name" required>
                <Input
                  {...register("guest_facebook_name", { required: true })}
                />
              </Field>
              <Field label="Nationality">
                <Input {...register("nationality")} />
              </Field>
            </Row2>
            <Row2>
              <Field label="Address">
                <Input {...register("guest_address")} />
              </Field>
              <div />
            </Row2>
            <BookingGuestDocReplacer
              bookingId={booking.id}
              assetType="valid_id"
              label="Valid ID"
              currentUrl={booking.valid_id_url}
              accept="image/*,.pdf"
              onPreview={onPreview}
            />
          </Section>

          {/* ── Additional Guests ─────────────────────────────────────────────── */}
          <Section title="Additional Guests">
            {visibleAdditionalGuestSlots.length > 0 && (
              <div className="mb-3 space-y-3">
                {visibleAdditionalGuestSlots.map((slot, index) => {
                  const ageValue = formSnapshot[slot.ageField];
                  const isLastVisible =
                    index === visibleAdditionalGuestSlots.length - 1;

                  return (
                    <AdminAdditionalGuestSlot
                      key={slot.partyPosition}
                      slotLabel={guestPartyPositionLabel(slot.partyPosition)}
                      nameField={slot.nameField}
                      ageField={slot.ageField}
                      bookingId={booking.id}
                      register={register}
                      guestAge={ageValue === "" ? undefined : ageValue}
                      validIdUrl={booking[slot.validIdUrlKey]}
                      assetType={slot.assetType}
                      agePlaceholder="Ex. 25"
                      onPreview={onPreview}
                      onRemove={
                        isLastVisible
                          ? () => {
                              clearAdditionalGuestSlot(slot);
                              setVisibleAdditionalGuestCount((count) =>
                                Math.max(0, count - 1),
                              );
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            )}
            {visibleAdditionalGuestCount < MAX_GUESTS - 1 && (
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] w-full"
                onClick={() => {
                  setVisibleAdditionalGuestCount((count) => {
                    const next = Math.min(MAX_GUESTS - 1, count + 1);
                    const slot = ADDITIONAL_GUEST_SLOTS[next - 1];
                    const currentAge = formSnapshot[slot.ageField];
                    if (currentAge === "" || currentAge == null) {
                      setValue(slot.ageField, DEFAULT_GUEST_AGE, {
                        shouldDirty: true,
                      });
                    }
                    return next;
                  });
                }}
              >
                <Plus className="size-4" aria-hidden />
                Add more guest
              </Button>
            )}
          </Section>

          {/* ── Stay Details ──────────────────────────────────────────────────── */}
          <Section title="Stay Details">
            <Row2>
              <Field label="Check-in Date (MM-DD-YYYY)" required>
                <DatePicker
                  date={
                    watchCheckInDate
                      ? stringToDate(watchCheckInDate)
                      : undefined
                  }
                  rangeEnd={
                    formSnapshot.check_out_date
                      ? stringToDate(formSnapshot.check_out_date)
                      : undefined
                  }
                  onSelect={(date) => {
                    if (!date) return;
                    const selected = dateToString(date);
                    setValue("check_in_date", selected, { shouldDirty: true });
                    setValue("check_out_date", getNextDay(selected), {
                      shouldDirty: true,
                    });
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) return true;
                    return createDisabledDateMatcher(
                      bookedDates,
                      booking.id,
                    )(date);
                  }}
                  minDate={new Date()}
                  placeholder={DATE_PICKER_DISPLAY_FORMAT}
                  className={bookingEditDatePickerClass}
                />
              </Field>
              <Field label="Check-out Date (MM-DD-YYYY)" required>
                <DatePicker
                  date={
                    formSnapshot.check_out_date
                      ? stringToDate(formSnapshot.check_out_date)
                      : undefined
                  }
                  rangeEnd={
                    watchCheckInDate
                      ? stringToDate(watchCheckInDate)
                      : undefined
                  }
                  onSelect={(date) => {
                    if (!date) return;
                    setValue("check_out_date", dateToString(date), {
                      shouldDirty: true,
                    });
                  }}
                  disabled={(date) => {
                    const isBooked = createDisabledCheckoutDateMatcher(
                      bookedDates,
                      booking.id,
                    )(date);
                    if (watchCheckInDate) {
                      const checkIn = stringToDate(watchCheckInDate);
                      if (date <= checkIn) return true;
                    }
                    return isBooked;
                  }}
                  minDate={
                    watchCheckInDate
                      ? stringToDate(getNextDay(watchCheckInDate))
                      : new Date()
                  }
                  placeholder={DATE_PICKER_DISPLAY_FORMAT}
                  className={bookingEditDatePickerClass}
                />
              </Field>
            </Row2>
            <Row2>
              <Field label="Check-in Time">
                <Input
                  type="time"
                  {...register("check_in_time")}
                  placeholder="14:00"
                />
              </Field>
              <Field label="Check-out Time">
                <Input
                  type="time"
                  {...register("check_out_time")}
                  placeholder="11:00"
                />
              </Field>
            </Row2>
            <Row3>
              <Field label="Adults" required>
                <Input
                  type="number"
                  min={1}
                  readOnly
                  tabIndex={-1}
                  className="pointer-events-none bg-muted/40"
                  {...register("number_of_adults", {
                    required: true,
                    valueAsNumber: true,
                  })}
                />
              </Field>
              <Field label="Children">
                <Input
                  type="number"
                  min={0}
                  readOnly
                  tabIndex={-1}
                  className="pointer-events-none bg-muted/40"
                  {...register("number_of_children", { valueAsNumber: true })}
                />
              </Field>
              <Field label="Nights" required>
                <Input
                  type="number"
                  min={1}
                  {...register("number_of_nights", {
                    required: true,
                    valueAsNumber: true,
                  })}
                />
              </Field>
            </Row3>
          </Section>

          {/* ── Parking ───────────────────────────────────────────────────────── */}
          <Section title="Parking">
            <CheckboxOption
              label="Needs parking"
              {...register("need_parking")}
            />
            {watchParking && (
              <Row3>
                <Field label="Plate Number">
                  <Input
                    {...register("car_plate_number")}
                    placeholder="ABC 123"
                  />
                </Field>
                <Field label="Brand / Model">
                  <Input
                    {...register("car_brand_model")}
                    placeholder="Toyota Vios"
                  />
                </Field>
                <Field label="Color">
                  <Input {...register("car_color")} placeholder="White" />
                </Field>
              </Row3>
            )}
          </Section>

          {/* ── Pet Information ───────────────────────────────────────────────── */}
          <Section title="Pet Information">
            <CheckboxOption label="Has pets" {...register("has_pets")} />
            {watchPets && (
              <>
                <Row2>
                  <Field label="Pet Name">
                    <Input {...register("pet_name")} />
                  </Field>
                  <Field label="Pet Type">
                    <Input {...register("pet_type")} placeholder="Dog / Cat" />
                  </Field>
                </Row2>
                <Row3>
                  <Field label="Breed">
                    <Input {...register("pet_breed")} />
                  </Field>
                  <Field label="Age">
                    <Input {...register("pet_age")} placeholder="2 years" />
                  </Field>
                  <Field label="Vaccination Date">
                    <DatePicker
                      date={
                        formSnapshot.pet_vaccination_date
                          ? stringToDate(formSnapshot.pet_vaccination_date)
                          : undefined
                      }
                      onSelect={(date) => {
                        setValue(
                          "pet_vaccination_date",
                          date ? dateToString(date) : "",
                          { shouldDirty: true },
                        );
                      }}
                      placeholder={DATE_PICKER_DISPLAY_FORMAT}
                      className={bookingEditDatePickerClass}
                    />
                  </Field>
                </Row3>
              </>
            )}
          </Section>

          {/* ── Surprise decor ───────────────────────────────────────────────── */}
          <Section title="Surprise decor">
            <CheckboxOption
              label="Guest requested a surprise decor / room setup"
              {...register("guest_requests_surprise_decor")}
            />
            {surpriseDecorChangedFromSaved && (
              <div
                role="status"
                className="mt-2 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[12px] leading-snug text-blue-950 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-100 sm:text-[13px]"
              >
                <Info
                  className="mt-0.5 size-4 shrink-0 text-blue-600 sm:size-[18px]"
                  aria-hidden
                />
                <p className="min-w-0">
                  Please update the <strong>Additional fee</strong> field under{" "}
                  <strong>Workflow Details → Review Pricing</strong> if you
                  change this checkbox.
                </p>
              </div>
            )}
          </Section>

          {/* ── Other ─────────────────────────────────────────────────────────── */}
          <Section title="How They Found Us">
            <Row2>
              <Field label="Referral channel">
                <Input
                  {...register("find_us")}
                  placeholder="Facebook, Airbnb…"
                />
              </Field>
              <Field label="Details">
                <Input
                  {...register("find_us_details")}
                  placeholder="Referred by…"
                />
              </Field>
            </Row2>
          </Section>

          <Section title="Special Requests">
            <Field label="Requests / Notes">
              <textarea
                {...register("guest_special_requests")}
                rows={3}
                placeholder="Any special requests from the guest…"
                className={fieldControlClass}
              />
            </Field>
          </Section>

          <Section title="Booking Source">
            <Row2>
              <Field label="Platform">
                <NativeSelect
                  {...register("booking_source", { required: true })}
                >
                  {BOOKING_SOURCE_OPTIONS.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </Row2>
          </Section>

          {/* ── Documents ─────────────────────────────────────────────────────── */}
          <DocumentsSection booking={booking} onPreview={onPreview} />
        </CollapsibleGroup>

        <CollapsibleGroup
          id="progress-forms"
          title="Workflow Details"
          variant="nested"
          defaultOpen={false}
        >
          <BookingProgressFormsEdit
            booking={booking}
            onStateChange={setProgressFormState}
            onTouchedChange={setProgressTouched}
          />
        </CollapsibleGroup>

        <div className="flex items-center justify-end gap-3 px-3 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={updateMut.isPending}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <X className="size-3.5" aria-hidden />
            Cancel
          </button>
          <Button
            type="submit"
            disabled={updateMut.isPending || !canSave}
            size="sm"
            className="min-h-[44px] rounded-lg px-5"
          >
            <Save className="size-3.5" />
            {updateMut.isPending
              ? "Saving…"
              : showSensitiveRevertHint
                ? "Save & Revert Status"
                : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Documents section ────────────────────────────────────────────────────────

type DocDef = {
  assetType: GuestDocAssetType;
  label: string;
  currentUrl: string | null | undefined;
  accept: string;
};

function DocumentsSection({
  booking,
  onPreview,
}: {
  booking: BookingRow;
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
}) {
  const isAirbnb = (booking.booking_source || "Facebook") === "Airbnb";
  const docs: DocDef[] = [
    ...(!isAirbnb
      ? ([
          {
            assetType: "payment_receipt",
            label: "Downpayment receipt",
            currentUrl: booking.payment_receipt_url,
            accept: "image/*,.pdf",
          },
        ] as DocDef[])
      : []),
    ...(booking.has_pets
      ? ([
          {
            assetType: "pet_vaccination",
            label: "Pet Vaccination Record",
            currentUrl: booking.pet_vaccination_url,
            accept: "image/*,.pdf",
          },
          {
            assetType: "pet_image",
            label: "Pet Photo",
            currentUrl: booking.pet_image_url,
            accept: "image/*",
          },
        ] as DocDef[])
      : []),
  ];

  if (docs.length === 0) return null;

  return (
    <Section title="Documents" className="space-y-4">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {docs.map((doc) => (
          <BookingGuestDocReplacer
            key={doc.assetType}
            bookingId={booking.id}
            onPreview={onPreview}
            {...doc}
          />
        ))}
      </div>
    </Section>
  );
}
