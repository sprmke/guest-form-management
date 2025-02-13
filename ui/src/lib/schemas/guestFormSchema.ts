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
  numberOfAdults: z.number().min(1, "At least 1 adult is required").default(1),
  numberOfChildren: z.number().min(0).default(0),
  numberOfNights: z.number().min(1, "Number of nights must be at least 1"),
  
  // Optional fields
  guest2Name: z.string().optional(),
  guest3Name: z.string().optional(),
  guest4Name: z.string().optional(),
  guest5Name: z.string().optional(),
  guestSpecialRequests: z.string().optional(),
  findUsDetails: z.string().optional(),
  
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
  
  // Payment receipt fields
  paymentReceipt: z.instanceof(File).optional(),
  paymentReceiptUrl: z.string().optional(),
  paymentReceiptFileName: z.string().optional(),
  
  // Unit and owner information with defaults
  unitOwner: z.string().default("Arianna Perez"),
  towerAndUnitNumber: z.string().default("Monaco 2604"),
  ownerOnsiteContactPerson: z.string().default("Arianna Perez"),
  ownerContactNumber: z.string().default("0962 541 2941"),
})

export type GuestFormData = z.infer<typeof guestFormSchema> 
