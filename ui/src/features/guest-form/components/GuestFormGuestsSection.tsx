import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Minus, Plus, UserRound } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { GuestFormData } from "@/features/guest-form/schemas/guestFormSchema";
import { GuestFormValidIdUpload } from "@/features/guest-form/components/GuestFormValidIdUpload";
import { AzureGuestLimitReminder } from "@/features/guest-form/components/AzureGuestLimitReminder";
import {
  computeAzureGuestCountsByAge,
  computeGuestCounts,
  shouldShowAzureAdultLimitMessage,
  FIFTH_PARTY_GUEST_MAX_AGE,
  formatGuestAgeInputValue,
  getActivePartySize,
  getDefaultAgeForGuestFormPartyGuest,
  guestPartyPositionLabel,
  getInitialVisibleGuestCount,
  isPartyFifthGuest,
  MAX_GUESTS,
  parseGuestAgeInputChange,
  requiresValidId,
} from "@/features/guest-form/lib/guestCounts";
import { handleNameInputChange } from "@/utils/helpers";
import { toCapitalCase } from "@/utils/formatters";

type GuestNameField =
  | "primaryGuestName"
  | "guest2Name"
  | "guest3Name"
  | "guest4Name"
  | "guest5Name";
type GuestAgeField =
  | "primaryGuestAge"
  | "guest2Age"
  | "guest3Age"
  | "guest4Age"
  | "guest5Age";
type GuestValidIdField =
  | "validId"
  | "guest2ValidId"
  | "guest3ValidId"
  | "guest4ValidId"
  | "guest5ValidId";

type GuestSlotConfig = {
  index: number;
  nameField: GuestNameField;
  ageField: GuestAgeField;
  validIdField: GuestValidIdField;
};

const GUEST_SLOTS: GuestSlotConfig[] = [
  {
    index: 1,
    nameField: "primaryGuestName",
    ageField: "primaryGuestAge",
    validIdField: "validId",
  },
  {
    index: 2,
    nameField: "guest2Name",
    ageField: "guest2Age",
    validIdField: "guest2ValidId",
  },
  {
    index: 3,
    nameField: "guest3Name",
    ageField: "guest3Age",
    validIdField: "guest3ValidId",
  },
  {
    index: 4,
    nameField: "guest4Name",
    ageField: "guest4Age",
    validIdField: "guest4ValidId",
  },
  {
    index: 5,
    nameField: "guest5Name",
    ageField: "guest5Age",
    validIdField: "guest5ValidId",
  },
];

type GuestFormGuestsSectionProps = {
  form: UseFormReturn<GuestFormData>;
  isAirbnb: boolean;
  sameAsFacebookName: boolean;
  onSameAsFacebookNameChange: (checked: boolean) => void;
  validIdPreviews: Record<string, string | null>;
  validIdImageErrors: Record<string, boolean>;
  onValidIdPreviewChange: (field: string, preview: string | null) => void;
  onValidIdImageErrorChange: (field: string, hasError: boolean) => void;
  /** Bumps when an existing booking is loaded so visible guest slots expand. */
  seedKey?: string | number;
};

function clearGuestSlot(
  form: UseFormReturn<GuestFormData>,
  slot: GuestSlotConfig,
  onValidIdPreviewChange: (field: string, preview: string | null) => void,
  onValidIdImageErrorChange: (field: string, hasError: boolean) => void,
) {
  const previewKey = String(slot.validIdField);
  form.setValue(slot.nameField, "");
  form.setValue(slot.ageField, null as unknown as number | undefined);
  form.setValue(slot.validIdField, undefined);
  onValidIdPreviewChange(previewKey, null);
  onValidIdImageErrorChange(previewKey, false);
}

export function GuestFormGuestsSection({
  form,
  isAirbnb,
  sameAsFacebookName,
  onSameAsFacebookNameChange,
  validIdPreviews,
  validIdImageErrors,
  onValidIdPreviewChange,
  onValidIdImageErrorChange,
  seedKey,
}: GuestFormGuestsSectionProps) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    const values = form.getValues();
    setVisibleCount(
      getInitialVisibleGuestCount([
        { name: values.primaryGuestName, age: values.primaryGuestAge },
        { name: values.guest2Name, age: values.guest2Age },
        { name: values.guest3Name, age: values.guest3Age },
        { name: values.guest4Name, age: values.guest4Age },
        { name: values.guest5Name, age: values.guest5Age },
      ]),
    );
  }, [seedKey, form]);

  const watchedGuests = form.watch([
    "primaryGuestName",
    "primaryGuestAge",
    "guest2Name",
    "guest2Age",
    "guest3Name",
    "guest3Age",
    "guest4Name",
    "guest4Age",
    "guest5Name",
    "guest5Age",
  ]);

  const partyGuests = [
    {
      name: watchedGuests[0] as string,
      age: watchedGuests[1] as number | undefined,
    },
    {
      name: watchedGuests[2] as string,
      age: watchedGuests[3] as number | undefined,
    },
    {
      name: watchedGuests[4] as string,
      age: watchedGuests[5] as number | undefined,
    },
    {
      name: watchedGuests[6] as string,
      age: watchedGuests[7] as number | undefined,
    },
    {
      name: watchedGuests[8] as string,
      age: watchedGuests[9] as number | undefined,
    },
  ];
  const partySize = Math.max(getActivePartySize(partyGuests), visibleCount);

  const visiblePartyGuests = partyGuests.slice(0, visibleCount);
  const visibleAgeCounts = computeGuestCounts(visiblePartyGuests);

  const azureAgeCounts = computeAzureGuestCountsByAge(
    visiblePartyGuests.map(({ name, age }) => ({
      age: name?.trim() || age != null ? age : undefined,
    })),
  );

  const hasAnyAge =
    watchedGuests[1] != null ||
    watchedGuests[3] != null ||
    watchedGuests[5] != null ||
    watchedGuests[7] != null ||
    watchedGuests[9] != null;

  const showAzureAdultLimitInfo = shouldShowAzureAdultLimitMessage(
    azureAgeCounts.adults,
    partySize,
  );

  const visibleSlots = GUEST_SLOTS.slice(0, visibleCount);

  const handleRemoveLastGuest = () => {
    if (visibleCount <= 1) return;
    const slot = GUEST_SLOTS[visibleCount - 1];
    clearGuestSlot(
      form,
      slot,
      onValidIdPreviewChange,
      onValidIdImageErrorChange,
    );
    setVisibleCount((count) => count - 1);
  };

  return (
    <div className="space-y-4">
      {hasAnyAge && (
        <p className="text-sm font-medium text-muted-foreground">
          {visibleAgeCounts.adults}{" "}
          {visibleAgeCounts.adults === 1 ? "Adult" : "Adults"}
          {visibleAgeCounts.children > 0 &&
            ` · ${visibleAgeCounts.children} ${
              visibleAgeCounts.children === 1 ? "Child" : "Children"
            }`}
        </p>
      )}

      <div className="space-y-3">
        {visibleSlots.map((slot) => {
          const isPrimary = slot.index === 1;
          const partyPosition = slot.index;
          const isFifthPartyGuest = isPartyFifthGuest(partyPosition, partySize);
          const age = form.watch(slot.ageField) as number | undefined;
          const previewKey = slot.validIdField;
          const nameValue = form.watch(slot.nameField);
          const guestName =
            typeof nameValue === "string" ? nameValue.trim() : "";
          const showValidId =
            age != null && !Number.isNaN(age) && requiresValidId(age);
          const ageRequired = isPrimary || guestName.length > 0;
          const isLastVisible = slot.index === visibleCount;
          const partyLabel = guestPartyPositionLabel(partyPosition);

          return (
            <section
              key={slot.index}
              className="space-y-4 rounded-xl border border-border/80 bg-background/60 p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3 border-b border-separator pb-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserRound className="size-4" aria-hidden />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {partyLabel}
                    {isPrimary && <span className="text-destructive"> *</span>}
                  </h3>
                </div>
                {!isPrimary && isLastVisible && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-[44px] shrink-0 text-muted-foreground"
                    onClick={handleRemoveLastGuest}
                    aria-label={`Remove ${partyLabel.toLowerCase()}`}
                  >
                    <Minus className="size-4" aria-hidden />
                  </Button>
                )}
              </div>

              {isPrimary && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sameAsFacebookName"
                    checked={sameAsFacebookName}
                    onChange={(event) => {
                      const isChecked = event.target.checked;
                      onSameAsFacebookNameChange(isChecked);
                      if (isChecked) {
                        const facebookName =
                          form.getValues("guestFacebookName");
                        if (facebookName) {
                          form.setValue("primaryGuestName", facebookName);
                        }
                      }
                    }}
                    className="size-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <label
                    htmlFor="sameAsFacebookName"
                    className="cursor-pointer text-sm text-muted-foreground"
                  >
                    Same as {isAirbnb ? "Airbnb" : "Facebook"} Name
                  </label>
                </div>
              )}

              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
                <FormField
                  control={form.control}
                  name={slot.nameField}
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Name
                        {isPrimary && (
                          <span className="text-destructive"> *</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={`Complete name of ${partyLabel}`}
                          {...field}
                          value={field.value?.toString() ?? ""}
                          disabled={isPrimary && sameAsFacebookName}
                          onChange={(event) =>
                            handleNameInputChange(
                              event,
                              field.onChange,
                              toCapitalCase,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={slot.ageField}
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Age
                        {ageRequired && (
                          <span className="text-destructive"> *</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder={isFifthPartyGuest ? "3" : "Ex. 25"}
                          value={formatGuestAgeInputValue(field.value)}
                          onChange={(event) => {
                            let next = parseGuestAgeInputChange(
                              event.target.value,
                            );
                            if (
                              isFifthPartyGuest &&
                              next != null &&
                              next > FIFTH_PARTY_GUEST_MAX_AGE
                            ) {
                              next = FIFTH_PARTY_GUEST_MAX_AGE;
                            }
                            field.onChange(next);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showValidId && (
                <FormField
                  control={form.control}
                  name={slot.validIdField}
                  render={({ field: { onChange, value, ...field } }) => (
                    <GuestFormValidIdUpload
                      preview={validIdPreviews[previewKey] ?? null}
                      value={value as File | undefined}
                      imageLoadError={validIdImageErrors[previewKey] ?? false}
                      onChange={onChange}
                      onPreviewChange={(preview) =>
                        onValidIdPreviewChange(previewKey, preview)
                      }
                      onImageLoadErrorChange={(hasError) =>
                        onValidIdImageErrorChange(previewKey, hasError)
                      }
                      fieldProps={field}
                    />
                  )}
                />
              )}
            </section>
          );
        })}
      </div>

      {showAzureAdultLimitInfo && <AzureGuestLimitReminder />}

      {visibleCount < MAX_GUESTS && (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full"
          onClick={() => {
            setVisibleCount((count) => {
              const next = Math.min(MAX_GUESTS, count + 1);
              const slot = GUEST_SLOTS[next - 1];
              if (form.getValues(slot.ageField) == null) {
                form.setValue(
                  slot.ageField,
                  getDefaultAgeForGuestFormPartyGuest(slot.index, next),
                );
              }
              return next;
            });
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add more guest
        </Button>
      )}
    </div>
  );
}
