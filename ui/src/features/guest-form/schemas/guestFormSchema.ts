import * as z from "zod";
import { validateName } from "@/utils/helpers";
import { getDefaultDates, formatDateToYYYYMMDD } from "@/utils/dates";
import {
  additionalGuestOrdinal,
  AZURE_ADULT_LIMIT_MESSAGE,
  AZURE_MAX_ADULTS,
  computeAzureGuestCountsByAge,
  computeGuestCounts,
  FIFTH_PARTY_GUEST_MAX_AGE,
  MAX_GUESTS,
  getActivePartySize,
  preprocessGuestAgeInput,
  PRIMARY_GUEST_MIN_AGE,
  requiresValidId,
  VALID_ID_MIN_AGE,
} from "@/features/guest-form/lib/guestCounts";

const { today, tomorrow } = getDefaultDates();

const guestAgeNumberSchema = z
  .number({ invalid_type_error: "Please enter a valid age" })
  .int("Age must be a whole number")
  .min(0, "Age cannot be negative")
  .max(120, "Please enter a realistic age");

const primaryGuestAgeSchema = z.preprocess(
  preprocessGuestAgeInput,
  guestAgeNumberSchema.min(
    PRIMARY_GUEST_MIN_AGE,
    "Primary guest must be 18 years or older",
  ),
);

const optionalGuestAgeSchema = z.preprocess(
  preprocessGuestAgeInput,
  guestAgeNumberSchema.optional(),
);

const PARTY_AGE_FIELD_BY_POSITION = [
  "primaryGuestAge",
  "guest2Age",
  "guest3Age",
  "guest4Age",
  "guest5Age",
] as const;

function buildGuestFormSchema(isAirbnb: boolean) {
  return z
    .object({
      // Required fields
      guestFacebookName: z
        .string()
        .min(
          1,
          isAirbnb
            ? "Your Airbnb name is required"
            : "Your Facebook name is required",
        ),
      primaryGuestName: z
        .string()
        .min(1, "Primary guest name is required")
        .refine(
          (val) => validateName(val),
          "Please enter the complete name of the primary guest",
        ),
      primaryGuestAge: primaryGuestAgeSchema,
      guestEmail: z.string().email("Please enter a valid email address"),
      guestPhoneNumber: z
        .string()
        .min(11, "Phone number must be 11 digits (ex. 09876543210)")
        .max(11, "Phone number must be 11 digits (ex. 09876543210)")
        .transform((val) => val.replace(/\s+/g, ""))
        .refine(
          (val) => /^09\d{9}$/.test(val),
          "Please enter a valid 11-digit phone number starting with '09' (ex. 09876543210)",
        ),
      guestAddress: z
        .string()
        .min(1, "Please enter your City and Province")
        .transform((val) => val.trim())
        .refine((val) => {
          const [city, province] = val.split(",").map((part) => part.trim());
          return (
            city &&
            province &&
            !val.includes(",,") &&
            city.length >= 2 &&
            province.length >= 2
          );
        }, "Please follow this address format: City, Province (ex. San Fernando, Pampanga)"),
      checkInDate: z
        .string()
        .min(1, "Please select your check-in date")
        .default(formatDateToYYYYMMDD(today)),
      checkOutDate: z
        .string()
        .min(1, "Please select your check-out date")
        .default(formatDateToYYYYMMDD(tomorrow)),
      findUs: z.string().min(1, "Please tell us how you found us"),

      // Required fields with defaults
      checkInTime: z
        .string()
        .min(1, "Please select your preferred check-in time")
        .default("14:00"),
      checkOutTime: z
        .string()
        .min(1, "Please select your preferred check-out time")
        .default("11:00"),
      nationality: z
        .string()
        .min(1, "Please select your nationality")
        .default("Filipino"),
      numberOfAdults: z
        .number()
        .min(1, "At least 1 adult guest is required")
        .max(6, "Maximum of 6 adults for this unit"),
      numberOfChildren: z.number().min(0).max(5, "Maximum of 5 children only"),

      // Optional fields
      guest2Name: z
        .string()
        .optional()
        .refine(
          (val) => !val || validateName(val),
          "Please enter the complete name of the second guest",
        ),
      guest2Age: optionalGuestAgeSchema,
      guest3Name: z
        .string()
        .optional()
        .refine(
          (val) => !val || validateName(val),
          "Please enter the complete name of the third guest",
        ),
      guest3Age: optionalGuestAgeSchema,
      guest4Name: z
        .string()
        .optional()
        .refine(
          (val) => !val || validateName(val),
          "Please enter the complete name of the fourth guest",
        ),
      guest4Age: optionalGuestAgeSchema,
      guest5Name: z
        .string()
        .optional()
        .refine(
          (val) => !val || validateName(val),
          "Please enter the complete name of the fifth guest",
        ),
      guest5Age: optionalGuestAgeSchema,
      guestSpecialRequests: z.string().optional(),
      /** Guest intends a surprise decor / setup (theme and price agreed with host on Facebook or Airbnb). */
      guestRequestsSurpriseDecor: z.boolean().default(false),
      findUsDetails: z.string().optional(),
      numberOfNights: z.number().optional(),

      // Parking related fields
      needParking: z.boolean().default(false),
      parkingSameAsBookingDuration: z.boolean().default(true),
      parkingCheckInDate: z.string().optional(),
      parkingCheckOutDate: z.string().optional(),
      carPlateNumber: z.string().optional(),
      carBrandModel: z.string().optional(),
      carColor: z.string().optional(),

      // Pet related fields
      hasPets: z.boolean().default(false),
      petName: z.string().optional(),
      petType: z.string().optional(),
      petBreed: z.string().optional(),
      petAge: z.string().optional(),
      petVaccinationDate: z.string().optional(),
      petVaccination: z.instanceof(File).optional(),
      petImage: z.instanceof(File).optional(),

      // File upload fields — paymentReceipt is optional for Airbnb (no GCash payment step)
      paymentReceipt: isAirbnb
        ? z.instanceof(File).optional()
        : z.instanceof(File, {
            message: "Please upload a copy of your downpayment receipt",
          }),
      validId: z.instanceof(File).optional(),
      guest2ValidId: z.instanceof(File).optional(),
      guest3ValidId: z.instanceof(File).optional(),
      guest4ValidId: z.instanceof(File).optional(),
      guest5ValidId: z.instanceof(File).optional(),

      // Unit and owner information with defaults
      unitOwner: z.string().default("Arianna Perez"),
      towerAndUnitNumber: z.string().default("Monaco 2604"),
      ownerOnsiteContactPerson: z.string().default("Arianna Perez"),
      ownerContactNumber: z.string().default("0962 541 2941"),
    })
    .superRefine((data, ctx) => {
      const guestSlots = [
        {
          name: data.primaryGuestName,
          age: data.primaryGuestAge,
          validId: data.validId,
          prefix: "primary",
        },
        {
          name: data.guest2Name,
          age: data.guest2Age,
          validId: data.guest2ValidId,
          prefix: "guest2",
        },
        {
          name: data.guest3Name,
          age: data.guest3Age,
          validId: data.guest3ValidId,
          prefix: "guest3",
        },
        {
          name: data.guest4Name,
          age: data.guest4Age,
          validId: data.guest4ValidId,
          prefix: "guest4",
        },
        {
          name: data.guest5Name,
          age: data.guest5Age,
          validId: data.guest5ValidId,
          prefix: "guest5",
        },
      ] as const;

      const counts = computeGuestCounts(
        guestSlots.map(({ name, age }) => ({ name, age })),
      );

      const azureAgeCounts = computeAzureGuestCountsByAge(
        guestSlots.map(({ name, age }) => ({
          age: name?.trim() || age != null ? age : undefined,
        })),
      );

      if (counts.adults + counts.children > MAX_GUESTS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Up to ${MAX_GUESTS} guests per booking`,
          path: ["primaryGuestName"],
        });
      }

      if (azureAgeCounts.adults > AZURE_MAX_ADULTS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: AZURE_ADULT_LIMIT_MESSAGE,
          path: ["primaryGuestAge"],
        });
      }

      const partySize = getActivePartySize(
        guestSlots.map(({ name, age }) => ({ name, age })),
      );
      if (partySize === MAX_GUESTS) {
        const fifthPerson = guestSlots[MAX_GUESTS - 1];
        if (
          fifthPerson.age != null &&
          fifthPerson.age > FIFTH_PARTY_GUEST_MAX_AGE
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `The 5th guest must be ${FIFTH_PARTY_GUEST_MAX_AGE} years old or younger`,
            path: [PARTY_AGE_FIELD_BY_POSITION[MAX_GUESTS - 1]],
          });
        }
      }

      guestSlots.forEach((guest, index) => {
        const trimmedName = guest.name?.trim();
        const isPrimary = index === 0;

        if (!isPrimary) {
          const hasName = !!trimmedName;
          const hasAge = guest.age != null;

          if (hasName && !hasAge) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Please enter the age of the ${additionalGuestOrdinal(index)} guest`,
              path: [`guest${index + 1}Age`],
            });
          }

          if (!hasName && hasAge) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Please enter the complete name of the ${additionalGuestOrdinal(index)} guest`,
              path: [`guest${index + 1}Name`],
            });
          }

          if (!hasName && !hasAge) {
            return;
          }
        }

        const age = guest.age;
        if (age == null) return;

        if (requiresValidId(age) && !guest.validId) {
          const field =
            guest.prefix === "primary"
              ? "validId"
              : (`${guest.prefix}ValidId` as keyof typeof data);
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Valid ID is required for guests aged ${VALID_ID_MIN_AGE} and above`,
            path: [field],
          });
        }
      });

      if (
        (data.findUs === "Friend" || data.findUs === "Others") &&
        !data.findUsDetails
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            data.findUs === "Friend"
              ? "Please enter your friend's name"
              : "Please specify how you found us",
          path: ["findUsDetails"],
        });
      }

      if (data.needParking) {
        if (!data.carPlateNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Car plate number is required when parking is needed",
            path: ["carPlateNumber"],
          });
        }
        if (!data.carBrandModel) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Car brand and model is required when parking is needed",
            path: ["carBrandModel"],
          });
        }
        if (!data.carColor) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Car color is required when parking is needed",
            path: ["carColor"],
          });
        }

        const stayNights = Math.max(
          0,
          Math.ceil(
            (new Date(data.checkOutDate).getTime() -
              new Date(data.checkInDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        const useStayDates =
          stayNights <= 1 || data.parkingSameAsBookingDuration !== false;
        const parkIn = useStayDates
          ? data.checkInDate
          : data.parkingCheckInDate;
        const parkOut = useStayDates
          ? data.checkOutDate
          : data.parkingCheckOutDate;

        if (!parkIn?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please select parking check-in date",
            path: ["parkingCheckInDate"],
          });
        }
        if (!parkOut?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please select parking check-out date",
            path: ["parkingCheckOutDate"],
          });
        }
        if (parkIn && parkOut && parkOut <= parkIn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Parking check-out must be after check-in",
            path: ["parkingCheckOutDate"],
          });
        }
      }

      if (data.hasPets) {
        if (!data.petName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Pet name is required when bringing pets",
            path: ["petName"],
          });
        }
        if (!data.petType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Pet type is required when bringing pets",
            path: ["petType"],
          });
        }
        if (!data.petBreed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Pet breed is required when bringing pets",
            path: ["petBreed"],
          });
        }
        if (!data.petAge) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Pet age is required when bringing pets",
            path: ["petAge"],
          });
        }
        if (!data.petVaccinationDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Pet vaccination date is required when bringing pets",
            path: ["petVaccinationDate"],
          });
        }
        if (!data.petVaccination) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Pet vaccination record image is required when bringing pets",
            path: ["petVaccination"],
          });
        }
        if (!data.petImage) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Pet image is required when bringing pets",
            path: ["petImage"],
          });
        }
      }

      if (data.checkInDate === data.checkOutDate) {
        const checkInTime = data.checkInTime
          ? new Date(`1970-01-01T${data.checkInTime}`)
          : null;
        const checkOutTime = data.checkOutTime
          ? new Date(`1970-01-01T${data.checkOutTime}`)
          : null;

        if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Check-out time must be later than check-in time when checking out on the same day",
            path: ["checkOutTime"],
          });
        }
      }
    });
}

/** Default (Facebook) schema — used by admin helpers and non-Airbnb guest form. */
export const guestFormSchema = buildGuestFormSchema(false);

/** Airbnb schema — paymentReceipt is optional. */
const guestFormSchemaAirbnb = buildGuestFormSchema(true);

export function createGuestFormSchema(isAirbnb: boolean) {
  return isAirbnb ? guestFormSchemaAirbnb : guestFormSchema;
}

export type GuestFormData = z.infer<typeof guestFormSchema>;
