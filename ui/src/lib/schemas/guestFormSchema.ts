import * as z from "zod"
import { validateName } from "@/utils/helpers";
import { getDefaultDates, formatDateToYYYYMMDD } from "@/utils/dates"

const { today, tomorrow } = getDefaultDates();

export const guestFormSchema = z.object({
  // Required fields
  guestFacebookName: z.string()
    .min(1, "Your Facebook name is required")
    .refine(
      (val) => validateName(val),
      "Please enter the exact name of your Facebook account"
    ),
  primaryGuestName: z.string()
    .min(1, "Primary guest name is required")
    .refine(
      (val) => validateName(val),
      "Please enter the complete name of the primary guest"
    ),
  guestEmail: z.string().email("Please enter a valid email address"),
  guestPhoneNumber: z.string()
    .min(11, "Phone number must be 11 digits (ex. 09876543210)")
    .max(11, "Phone number must be 11 digits (ex. 09876543210)")
    .transform(val => val.replace(/\s+/g, '')) // Remove all whitespace
    .refine(
      (val) => /^09\d{9}$/.test(val),
      "Please enter a valid 11-digit phone number starting with '09' (ex. 09876543210)"
    ),
  guestAddress: z.string()
    .min(1, "Please enter your City and Province")
    .transform(val => val.trim())
    .refine(
      (val) => {
        const [city, province] = val.split(',').map(part => part.trim());
        return city && province && !val.includes(',,') && city.length >= 2 && province.length >= 2;
      },
      "Please follow this address format: City, Province (ex. San Fernando, Pampanga)"
    ),
  checkInDate: z.string().min(1, "Please select your check-in date").default(formatDateToYYYYMMDD(today)),
  checkOutDate: z.string().min(1, "Please select your check-out date").default(formatDateToYYYYMMDD(tomorrow)),
  findUs: z.string().min(1, "Please tell us how you found us"),
  
  // Required fields with defaults
  checkInTime: z.string().min(1, "Please select your preferred check-in time").default("14:00"),
  checkOutTime: z.string().min(1, "Please select your preferred check-out time").default("11:00"),
  nationality: z.string().min(1, "Please select your nationality").default("Filipino"),
  numberOfAdults: z.number().min(1, "At least 1 adult guest is required").max(4, "Maximum of 4 adult guests only"),
  numberOfChildren: z.number().min(0).max(4, "Maximum of 4 children only"),
  
  // Optional fields
  guest2Name: z.string()
    .optional()
    .refine(
      (val) => !val || validateName(val),
      "Please enter the complete name of the second guest"
    ),
  guest3Name: z.string()
    .optional()
    .refine(
      (val) => !val || validateName(val),
      "Please enter the complete name of the third guest"
    ),
  guest4Name: z.string()
    .optional()
    .refine(
      (val) => !val || validateName(val),
      "Please enter the complete name of the fourth guest"
    ),
  guest5Name: z.string()
    .optional()
    .refine(
      (val) => !val || validateName(val),
      "Please enter the complete name of the fifth guest"
    ),
  guestSpecialRequests: z.string().optional(),
  findUsDetails: z.string().optional(),
  numberOfNights: z.number().optional(),
  
  // Parking related fields
  needParking: z.boolean().default(false),
  carPlateNumber: z.string().optional(),
  carBrandModel: z.string().optional(),
  carColor: z.string().optional(),
  
  // Pet related fields
  hasPets: z.boolean().default(false),
  petName: z.string().optional(),
  petBreed: z.string().optional(),
  petAge: z.string().optional(),
  petVaccinationDate: z.string().optional(),
  
  // File upload fields
  paymentReceipt: z.instanceof(File, { message: "Please upload a copy of your payment receipt" }),
  validId: z.instanceof(File, { message: "Please upload a copy of your valid ID" }),
  
  // Unit and owner information with defaults
  unitOwner: z.string().default("Arianna Perez"),
  towerAndUnitNumber: z.string().default("Monaco 2604"),
  ownerOnsiteContactPerson: z.string().default("Arianna Perez"),
  ownerContactNumber: z.string().default("0962 541 2941"),
}).superRefine((data, ctx) => {
  const totalGuests = data.numberOfAdults + data.numberOfChildren;
  
  // Validate guest names based on total guests
  if (totalGuests >= 2 && !data.guest2Name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter the complete name of the second guest", path: ["guest2Name"] });
  }
  if (totalGuests >= 3 && !data.guest3Name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter the complete name of the third guest", path: ["guest3Name"] });
  }
  if (totalGuests >= 4 && !data.guest4Name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter the complete name of the fourth guest", path: ["guest4Name"] });
  }

  // Validate parking fields when parking is needed
  if (data.needParking) {
    if (!data.carPlateNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Car plate number is required when parking is needed",
        path: ["carPlateNumber"]
      });
    }
    if (!data.carBrandModel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Car brand and model is required when parking is needed",
        path: ["carBrandModel"]
      });
    }
    if (!data.carColor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Car color is required when parking is needed",
        path: ["carColor"]
      });
    }
  }

  // Validate pet fields when bringing pets
  if (data.hasPets) {
    if (!data.petName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pet name is required when bringing pets",
        path: ["petName"]
      });
    }
    if (!data.petBreed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pet breed is required when bringing pets",
        path: ["petBreed"]
      });
    }
    if (!data.petAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pet age is required when bringing pets",
        path: ["petAge"]
      });
    }
    if (!data.petVaccinationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pet vaccination date is required when bringing pets",
        path: ["petVaccinationDate"]
      });
    }
  }

  // Validate check-in and check-out times when dates are the same
  if (data.checkInDate === data.checkOutDate) {
    const checkInTime = data.checkInTime ? new Date(`1970-01-01T${data.checkInTime}`) : null;
    const checkOutTime = data.checkOutTime ? new Date(`1970-01-01T${data.checkOutTime}`) : null;

    if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check-out time must be later than check-in time when checking out on the same day",
        path: ["checkOutTime"]
      });
    }
  }
});

export type GuestFormData = z.infer<typeof guestFormSchema> 
