import dayjs from 'https://esm.sh/dayjs@1.11.10'

// UI Form Data Interface (camelCase)
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
  
  // Parking related fields
  needParking: boolean;
  carPlateNumber?: string;
  carBrandModel?: string;
  carColor?: string;
  
  // Pet related fields
  hasPets: boolean;
  petName?: string;
  petBreed?: string;
  petAge?: string;
  petVaccinationDate?: string;
  
  // Payment receipt fields
  paymentReceipt: File;
  paymentReceiptUrl: string;
  paymentReceiptFileName: string;
  
  // Unit and owner information
  unitOwner: string;
  towerAndUnitNumber: string;
  ownerOnsiteContactPerson: string;
  ownerContactNumber: string;
}

// Database Schema Interface (snake_case)
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
  need_parking?: boolean;
  car_plate_number?: string;
  car_brand_model?: string;
  car_color?: string;
  has_pets?: boolean;
  pet_name?: string;
  pet_breed?: string;
  pet_age?: string;
  pet_vaccination_date?: string;
  payment_receipt_url: string;
  valid_id_url: string;
  unit_owner: string;
  tower_and_unit_number: string;
  owner_onsite_contact_person: string;
  owner_contact_number: string;
}

// Helper function to convert string to boolean
const toBoolean = (value: string | boolean | undefined): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

// Helper function to convert string to number
const toNumber = (value: string | number | undefined): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

// Helper function to format date to MM-DD-YYYY
const formatDate = (dateStr: string): string => {
  return dayjs(dateStr).format('MM-DD-YYYY');
};

// Helper function to validate guest name
const validateGuestName = (name: string | undefined): string | undefined => {
  if (!name) return undefined;
  const trimmedName = name.trim();
  return trimmedName.length >= 2 ? trimmedName : undefined;
};

// Transform function to convert form data to database schema
export const transformFormToSubmission = (formData: GuestFormData, paymentReceiptUrl: string, validIdUrl: string): GuestSubmission => {
  return {
    guest_facebook_name: formData.guestFacebookName,
    primary_guest_name: formData.primaryGuestName,
    guest_email: formData.guestEmail,
    guest_phone_number: formData.guestPhoneNumber,
    guest_address: formData.guestAddress,
    check_in_date: formatDate(formData.checkInDate),
    check_out_date: formatDate(formData.checkOutDate),
    check_in_time: formData.checkInTime,
    check_out_time: formData.checkOutTime,
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
    need_parking: toBoolean(formData.needParking),
    car_plate_number: formData.carPlateNumber,
    car_brand_model: formData.carBrandModel,
    car_color: formData.carColor,
    has_pets: toBoolean(formData.hasPets),
    pet_name: formData.petName,
    pet_breed: formData.petBreed,
    pet_age: formData.petAge,
    pet_vaccination_date: formData.petVaccinationDate ? formatDate(formData.petVaccinationDate) : undefined,
    payment_receipt_url: paymentReceiptUrl,
    valid_id_url: validIdUrl,
    unit_owner: formData.unitOwner || 'Arianna Perez',
    tower_and_unit_number: formData.towerAndUnitNumber || 'Monaco 2604',
    owner_onsite_contact_person: formData.ownerOnsiteContactPerson || 'Arianna Perez',
    owner_contact_number: formData.ownerContactNumber || '0962 541 2941'
  };
};
