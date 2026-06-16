import dayjs from "https://esm.sh/dayjs@1.11.10";
import {
  formatTime,
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "./utils.ts";

// ─── Booking status enum ──────────────────────────────────────────────────────
// Canonical values must match the CHECK constraint in Phase 2 migration and
// statusMachine.ts. Mirror kept in ui/src/features/admin/lib/workflow.ts.

export const BOOKING_STATUSES = [
  "PENDING_REVIEW",
  "PENDING_GAF",
  "PENDING_PARKING_REQUEST",
  "PENDING_PET_REQUEST",
  "READY_FOR_CHECKIN",
  "PENDING_SD_REFUND",
  "COMPLETED",
  "CANCELLED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// ─── UI Form Data Interface (camelCase) ──────────────────────────────────────
export interface GuestFormData {
  // Required fields
  guestFacebookName: string;
  primaryGuestName: string;
  guestEmail: string;
  guestPhoneNumber: string;
  guestAddress: string;
  checkInDate: string;
  checkOutDate: string;
  findUs: string;
  bookingSource?: string;

  // Required fields with defaults
  checkInTime: string;
  checkOutTime: string;
  nationality: string;
  numberOfAdults: number;
  numberOfChildren: number;

  // Optional fields
  guest2Name?: string;
  guest3Name?: string;
  guest4Name?: string;
  guest5Name?: string;
  guestSpecialRequests?: string;
  findUsDetails?: string;
  numberOfNights?: number;

  /** Guest wants a surprise decor / setup (discussed theme + price with host separately). */
  guestRequestsSurpriseDecor: boolean;

  // Parking related fields
  needParking: boolean;
  parkingSameAsBookingDuration?: boolean;
  parkingCheckInDate?: string;
  parkingCheckOutDate?: string;
  carPlateNumber?: string;
  carBrandModel?: string;
  carColor?: string;
  /** Assigned carpark slot (GAF PDF `carparkSlotNumber`); optional until parking is confirmed. */
  carparkSlotNumber?: string;

  // Pet related fields
  hasPets: boolean;
  petName?: string;
  petType?: string;
  petBreed?: string;
  petAge?: string;
  petVaccinationDate?: string;
  petVaccination?: File;
  petVaccinationUrl?: string;
  petVaccinationFileName?: string;
  petImage?: File;
  petImageUrl?: string;
  petImageFileName?: string;

  // Downpayment receipt (`payment_receipt_url`) fields
  paymentReceipt?: File;
  paymentReceiptUrl?: string;
  paymentReceiptFileName?: string;

  // Valid ID fields
  validId?: File;
  validIdUrl?: string;
  validIdFileName?: string;

  // Unit and owner information
  unitOwner: string;
  towerAndUnitNumber: string;
  ownerOnsiteContactPerson: string;
  ownerContactNumber: string;
}

// ─── Database Schema Interface (snake_case) ───────────────────────────────────
export interface GuestSubmission {
  id?: string;
  created_at?: string;
  updated_at?: string;

  guest_facebook_name: string;
  primary_guest_name: string;
  guest_email: string;
  guest_phone_number: string;
  guest_address: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time?: string;
  check_out_time?: string;
  nationality?: string;
  number_of_adults?: number;
  number_of_children?: number;
  number_of_nights?: number;
  guest2_name?: string;
  guest3_name?: string;
  guest4_name?: string;
  guest5_name?: string;
  guest_special_requests?: string;
  find_us: string;
  find_us_details?: string;
  booking_source?: string;
  guest_requests_surprise_decor?: boolean;
  surprise_decor_staff_acknowledged?: boolean;
  need_parking?: boolean;
  car_plate_number?: string;
  car_brand_model?: string;
  car_color?: string;
  has_pets?: boolean;
  pet_name?: string;
  pet_type?: string;
  pet_breed?: string;
  pet_age?: string;
  pet_vaccination_date?: string;
  pet_vaccination_url?: string;
  pet_image_url?: string;
  payment_receipt_url: string;
  valid_id_url: string;
  unit_owner: string;
  tower_and_unit_number: string;
  owner_onsite_contact_person: string;
  owner_contact_number: string;

  // ── Workflow status (Phase 2) ─────────────────────────────────────────────
  status?: BookingStatus | string; // TEXT + CHECK — canonical enum after Phase 2 migration
  status_updated_at?: string | null; // Timestamp of last transition (orchestrator-only write)

  // ── Pricing fields (Phase 0 additive, entered at PENDING_REVIEW) ──────────
  booking_rate?: number | null; // NUMERIC(12,2)
  down_payment?: number | null;
  balance?: number | null; // Auto-computed: booking_rate - down_payment
  security_deposit?: number | null; // Separate from balance; default ₱1500

  // ── Parking fields (shown at PENDING_PARKING_REQUEST) ────────────────────
  parking_rate_guest?: number | null; // UI label: "Guest Parking Rate"
  parking_rate_paid?: number | null; // UI label: "Owner Parking Rate"
  parking_check_in_date?: string | null; // MM-DD-YYYY — guest-paid parking window start
  parking_check_out_date?: string | null; // MM-DD-YYYY — guest-paid parking window end
  parking_endorsement_url?: string | null;
  parking_fee_included_in_downpayment?: boolean | null;
  parking_payment_receipt_url?: string | null;
  parking_owner_email?: string | null;
  parking_owner?: string | null;

  // ── Pet fee ───────────────────────────────────────────────────────────────
  pet_fee?: number | null;

  // ── Approved PDF URLs (written by Gmail listener) ─────────────────────────
  approved_gaf_pdf_url?: string | null;
  approved_pet_pdf_url?: string | null;

  // ── Request PDFs (orchestrator: PENDING_REVIEW → initial docs) ──────────────
  gaf_request_pdf_url?: string | null;
  pet_request_pdf_url?: string | null;

  // ── SD refund stage fields (PENDING_SD_REFUND) ────────────────────────────
  sd_additional_expenses?: number[] | null; // NUMERIC(12,2)[]
  sd_additional_profits?: number[] | null;
  sd_refund_amount?: number | null;
  sd_refund_receipt_url?: string | null;
  settled_at?: string | null; // Timestamp when moved to COMPLETED

  // ── AI receipt validation (Gemini Flash) ───────────────────────────────────
  dp_receipt_ai_verdict?: string | null;
  dp_receipt_ai_summary?: string | null;
  balance_receipt_ai_verdict?: string | null;
  balance_receipt_ai_summary?: string | null;
  parking_receipt_ai_verdict?: string | null;
  parking_receipt_ai_summary?: string | null;
}

// Helper function to convert string to boolean
const toBoolean = (
  value: string | boolean | undefined,
): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

// Helper function to convert string to number
const toNumber = (value: string | number | undefined): number | undefined => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

// Helper function to format date to MM-DD-YYYY
const formatDate = (dateStr: string): string => {
  return dayjs(dateStr).format("MM-DD-YYYY");
};

// Helper function to validate guest name
const validateGuestName = (name: string | undefined): string | undefined => {
  if (!name) return undefined;
  const trimmedName = name.trim();
  return trimmedName.length >= 2 ? trimmedName : undefined;
};

// Transform function to convert form data to database schema
export const transformFormToSubmission = (
  formData: GuestFormData,
  paymentReceiptUrl: string,
  validIdUrl: string,
  petVaccinationUrl?: string,
  petImageUrl?: string,
): GuestSubmission => {
  return {
    guest_facebook_name: formData.guestFacebookName,
    primary_guest_name: formData.primaryGuestName,
    guest_email: formData.guestEmail,
    guest_phone_number: formData.guestPhoneNumber,
    guest_address: formData.guestAddress,
    check_in_date: formatDate(formData.checkInDate),
    check_out_date: formatDate(formData.checkOutDate),
    check_in_time: formatTime(formData.checkInTime) || DEFAULT_CHECK_IN_TIME,
    check_out_time: formatTime(formData.checkOutTime) || DEFAULT_CHECK_OUT_TIME,
    nationality: formData.nationality,
    number_of_adults: toNumber(formData.numberOfAdults),
    number_of_children: toNumber(formData.numberOfChildren),
    number_of_nights: toNumber(formData.numberOfNights),
    guest2_name: validateGuestName(formData.guest2Name),
    guest3_name: validateGuestName(formData.guest3Name),
    guest4_name: validateGuestName(formData.guest4Name),
    guest5_name: validateGuestName(formData.guest5Name),
    guest_special_requests: formData.guestSpecialRequests,
    find_us: formData.findUs,
    find_us_details: formData.findUsDetails,
    booking_source: formData.bookingSource || "Facebook",
    guest_requests_surprise_decor:
      toBoolean(formData.guestRequestsSurpriseDecor) ?? false,
    need_parking: toBoolean(formData.needParking),
    car_plate_number: formData.carPlateNumber,
    car_brand_model: formData.carBrandModel,
    car_color: formData.carColor,
    parking_check_in_date: formData.needParking && formData.parkingCheckInDate
      ? formatDate(formData.parkingCheckInDate)
      : undefined,
    parking_check_out_date: formData.needParking && formData.parkingCheckOutDate
      ? formatDate(formData.parkingCheckOutDate)
      : undefined,
    has_pets: toBoolean(formData.hasPets),
    pet_name: formData.petName,
    pet_type: formData.petType,
    pet_breed: formData.petBreed,
    pet_age: formData.petAge,
    pet_vaccination_date: formData.petVaccinationDate
      ? formatDate(formData.petVaccinationDate)
      : undefined,
    pet_vaccination_url: petVaccinationUrl,
    pet_image_url: petImageUrl,
    payment_receipt_url: paymentReceiptUrl,
    valid_id_url: validIdUrl,
    unit_owner: formData.unitOwner,
    tower_and_unit_number: formData.towerAndUnitNumber,
    owner_onsite_contact_person: formData.ownerOnsiteContactPerson,
    owner_contact_number: formData.ownerContactNumber,
  };
};
