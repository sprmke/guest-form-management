import * as z from "zod"

export const guestFormSchema = z.object({
  // Required fields
  guestFacebookName: z.string().min(2, "Facebook name must be at least 2 characters"),
  primaryGuestName: z.string().min(2, "Full name must be at least 2 characters"),
  guestEmail: z.string().email("Invalid email address"),
  guestPhoneNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  guestAddress: z.string().min(5, "Address must be at least 5 characters"),
  checkInDate: z.string().min(1, "Please select check-in date"),
  checkOutDate: z.string().min(1, "Please select check-out date"),
  findUs: z.string().min(1, "Please select how you found us"),
  
  // Required fields with defaults
  checkInTime: z.string().min(1, "Check-in time is required").default("14:00"),
  checkOutTime: z.string().min(1, "Check-out time is required").default("11:00"),
  nationality: z.string().min(1, "Nationality is required").default("Filipino"),
  numberOfAdults: z.number().min(1).max(4),
  numberOfChildren: z.number().min(0).max(4),
  
  // Optional fields
  guest2Name: z.string().optional().superRefine((val, ctx) => {
    const totalGuests = ctx.parent.numberOfAdults + ctx.parent.numberOfChildren;
    if (totalGuests >= 2 && !val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guest 2 name is required",
      });
    }
  }),
  guest3Name: z.string().optional().superRefine((val, ctx) => {
    const totalGuests = ctx.parent.numberOfAdults + ctx.parent.numberOfChildren;
    if (totalGuests >= 3 && !val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guest 3 name is required",
      });
    }
  }),
  guest4Name: z.string().optional().superRefine((val, ctx) => {
    const totalGuests = ctx.parent.numberOfAdults + ctx.parent.numberOfChildren;
    if (totalGuests >= 4 && !val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guest 4 name is required",
      });
    }
  }),
  guest5Name: z.string().optional().superRefine((val, ctx) => {
    const totalGuests = ctx.parent.numberOfAdults + ctx.parent.numberOfChildren;
    if (totalGuests >= 5 && !val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guest 5 name is required",
      });
    }
  }),
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
  paymentReceipt: z.instanceof(File, { message: "Please upload your payment receipt" }),
  validId: z.instanceof(File, { message: "Please upload your valid ID" }),
  
  // Unit and owner information with defaults
  unitOwner: z.string().default("Arianna Perez"),
  towerAndUnitNumber: z.string().default("Monaco 2604"),
  ownerOnsiteContactPerson: z.string().default("Arianna Perez"),
  ownerContactNumber: z.string().default("0962 541 2941"),
})

export type GuestFormData = z.infer<typeof guestFormSchema> 
