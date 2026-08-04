/**
 * Booking import target field ids — client mirror of importTargetSchemas.ts.
 * Sync comment: keep in step with BOOKING_IMPORT_TARGET_FIELDS in
 * supabase/functions/_shared/importTargetSchemas.ts
 */

export type ImportTargetField = {
  id: string;
  type: 'string' | 'email' | 'phone' | 'date' | 'time' | 'integer' | 'decimal' | 'boolean';
  required: boolean;
  description: string;
};

/** Client mirror — must match server importTargetSchemas.ts BOOKING_IMPORT_TARGET_FIELDS */
export const BOOKING_IMPORT_TARGET_FIELDS: readonly ImportTargetField[] = [
  { id: 'guest_facebook_name', type: 'string', required: true, description: "Guest's Facebook or Airbnb display name" },
  { id: 'primary_guest_name', type: 'string', required: true, description: 'Primary guest full legal name' },
  { id: 'guest_email', type: 'email', required: true, description: 'Guest email address' },
  { id: 'guest_phone_number', type: 'phone', required: true, description: 'Guest mobile number' },
  { id: 'guest_address', type: 'string', required: true, description: 'Guest city and province' },
  { id: 'check_in_date', type: 'date', required: true, description: 'Check-in date' },
  { id: 'check_out_date', type: 'date', required: true, description: 'Check-out date' },
  { id: 'check_in_time', type: 'time', required: false, description: 'Preferred check-in time' },
  { id: 'check_out_time', type: 'time', required: false, description: 'Preferred check-out time' },
  { id: 'nationality', type: 'string', required: false, description: 'Guest nationality' },
  { id: 'number_of_adults', type: 'integer', required: false, description: 'Count of adult guests' },
  { id: 'number_of_children', type: 'integer', required: false, description: 'Count of child guests' },
  { id: 'number_of_nights', type: 'integer', required: false, description: 'Length of stay in nights' },
  { id: 'primary_guest_age', type: 'integer', required: false, description: 'Primary guest age' },
  { id: 'guest2_name', type: 'string', required: false, description: 'Second guest full name' },
  { id: 'guest2_age', type: 'integer', required: false, description: 'Second guest age' },
  { id: 'guest3_name', type: 'string', required: false, description: 'Third guest full name' },
  { id: 'guest3_age', type: 'integer', required: false, description: 'Third guest age' },
  { id: 'guest4_name', type: 'string', required: false, description: 'Fourth guest full name' },
  { id: 'guest4_age', type: 'integer', required: false, description: 'Fourth guest age' },
  { id: 'guest5_name', type: 'string', required: false, description: 'Fifth guest full name' },
  { id: 'guest5_age', type: 'integer', required: false, description: 'Fifth guest age' },
  { id: 'guest_special_requests', type: 'string', required: false, description: 'Special requests or notes' },
  { id: 'find_us', type: 'string', required: false, description: 'How the guest found the property' },
  { id: 'find_us_details', type: 'string', required: false, description: 'Extra detail for how guest found property' },
  { id: 'booking_source', type: 'string', required: false, description: 'Booking platform or channel' },
  { id: 'guest_requests_surprise_decor', type: 'boolean', required: false, description: 'Guest requested surprise decor' },
  { id: 'booking_rate', type: 'decimal', required: false, description: 'Total booking rate' },
  { id: 'down_payment', type: 'decimal', required: false, description: 'Down payment amount' },
  { id: 'balance', type: 'decimal', required: false, description: 'Remaining balance' },
  { id: 'security_deposit', type: 'decimal', required: false, description: 'Security deposit amount' },
  { id: 'pet_fee', type: 'decimal', required: false, description: 'Pet fee amount' },
  { id: 'guest_additional_fee', type: 'decimal', required: false, description: 'Additional guest fee' },
  { id: 'need_parking', type: 'boolean', required: false, description: 'Guest needs parking' },
  { id: 'parking_check_in_date', type: 'date', required: false, description: 'Parking start date' },
  { id: 'parking_check_out_date', type: 'date', required: false, description: 'Parking end date' },
  { id: 'car_plate_number', type: 'string', required: false, description: 'Vehicle plate number' },
  { id: 'car_brand_model', type: 'string', required: false, description: 'Vehicle brand and model' },
  { id: 'car_color', type: 'string', required: false, description: 'Vehicle color' },
  { id: 'parking_rate_guest', type: 'decimal', required: false, description: 'Guest-paid parking rate' },
  { id: 'parking_rate_paid', type: 'decimal', required: false, description: 'Owner-paid parking rate' },
  { id: 'has_pets', type: 'boolean', required: false, description: 'Guest has pets' },
  { id: 'pet_name', type: 'string', required: false, description: 'Pet name' },
  { id: 'pet_type', type: 'string', required: false, description: 'Pet type' },
  { id: 'pet_breed', type: 'string', required: false, description: 'Pet breed' },
  { id: 'pet_age', type: 'string', required: false, description: 'Pet age' },
  { id: 'pet_vaccination_date', type: 'date', required: false, description: 'Pet vaccination date' },
  { id: 'tower_and_unit_number', type: 'string', required: false, description: 'Unit label (informational)' },
  { id: 'unit_owner', type: 'string', required: false, description: 'Unit owner name' },
  { id: 'owner_onsite_contact_person', type: 'string', required: false, description: 'On-site contact person' },
  { id: 'owner_contact_number', type: 'phone', required: false, description: 'Owner contact phone' },
] as const;

export type BookingImportTargetFieldId = (typeof BOOKING_IMPORT_TARGET_FIELDS)[number]['id'];

export const REQUIRED_TARGET_FIELDS = BOOKING_IMPORT_TARGET_FIELDS.filter((f) => f.required);
export const OPTIONAL_TARGET_FIELDS = BOOKING_IMPORT_TARGET_FIELDS.filter((f) => !f.required);
