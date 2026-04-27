import type { AnyBookingStatus } from './bookingStatus';

/**
 * Snake-case row shape matching the Supabase `guest_submissions` table.
 * Admin UI speaks snake_case to stay aligned with the raw DB columns.
 * Fields added in Phase 0 migrations may be `null` on legacy rows.
 */
export type BookingRow = {
  id: string;
  created_at: string;
  updated_at: string | null;

  // ── Guest identity ────────────────────────────────────────────────────────
  guest_facebook_name: string;
  primary_guest_name: string;
  guest_email: string;
  guest_phone_number: string;
  guest_address: string | null;
  nationality: string | null;

  // ── Additional guests ─────────────────────────────────────────────────────
  guest2_name: string | null;
  guest3_name: string | null;
  guest4_name: string | null;
  guest5_name: string | null;

  // ── Stay details ──────────────────────────────────────────────────────────
  check_in_date: string;   // MM-DD-YYYY
  check_out_date: string;  // MM-DD-YYYY
  check_in_time: string | null;
  check_out_time: string | null;
  number_of_adults: number;
  number_of_children: number | null;
  number_of_nights: number;

  // ── Parking ───────────────────────────────────────────────────────────────
  need_parking: boolean | null;
  car_plate_number: string | null;
  car_brand_model: string | null;
  car_color: string | null;
  parking_owner_email: string | null;
  parking_endorsement_url: string | null;

  // ── Pets ──────────────────────────────────────────────────────────────────
  has_pets: boolean | null;
  pet_name: string | null;
  pet_type: string | null;
  pet_breed: string | null;
  pet_age: string | null;
  pet_vaccination_date: string | null;

  // ── How found / requests ──────────────────────────────────────────────────
  find_us: string | null;
  find_us_details: string | null;
  guest_special_requests: string | null;

  // ── Documents ─────────────────────────────────────────────────────────────
  valid_id_url: string | null;
  payment_receipt_url: string | null;
  pet_vaccination_url: string | null;
  pet_image_url: string | null;
  pdf_url: string | null;

  // ── Status & workflow ─────────────────────────────────────────────────────
  status: AnyBookingStatus | string; // defensive against unknown values in the wild
  status_updated_at?: string | null;

  // Phase 0 additive columns — may be absent on prod until migration applied.
  is_test_booking?: boolean | null;
  booking_rate?: number | string | null;
  down_payment?: number | string | null;
  balance?: number | string | null;
  security_deposit?: number | string | null;
  parking_rate_guest?: number | string | null;
  parking_rate_paid?: number | string | null;
  pet_fee?: number | string | null;
  approved_gaf_pdf_url?: string | null;
  approved_pet_pdf_url?: string | null;
  sd_additional_expenses?: number[] | null;
  sd_additional_profits?: number[] | null;
  sd_refund_amount?: number | string | null;
  sd_refund_receipt_url?: string | null;
  sd_refund_guest_feedback?: string | null;
  sd_refund_method?: 'same_phone' | 'other_bank' | 'cash' | null;
  sd_refund_phone_confirmed?: boolean | null;
  sd_refund_bank?: 'GCash' | 'Maribank' | 'BDO' | 'BPI' | null;
  sd_refund_account_name?: string | null;
  sd_refund_account_number?: string | null;
  sd_refund_cash_pickup_note?: string | null;
  sd_refund_form_submitted_at?: string | null;
  sd_refund_form_emailed_at?: string | null;
  settled_at?: string | null;
};

export type BookingsSort =
  | 'check_in_date:asc'
  | 'check_in_date:desc'
  | 'created_at:desc'
  | 'created_at:asc';

export type BookingsQuery = {
  /** Free-text search (ilike across guest name + email). */
  q: string;
  /** Selected statuses. Empty = "any". */
  status: ReadonlyArray<string>;
  /** Check-in date range, ISO (YYYY-MM-DD). Unused until Phase 3's list-bookings endpoint lands. */
  from: string | null;
  to: string | null;
  hasPets: boolean | null;
  needParking: boolean | null;
  /** Whether to include test rows. Default `false` = hide test data. */
  includeTests: boolean;
  sort: BookingsSort;
  page: number;  // 1-indexed
  limit: number;
};

export const DEFAULT_BOOKINGS_QUERY: BookingsQuery = {
  q: '',
  status: [],
  from: null,
  to: null,
  hasPets: null,
  needParking: null,
  includeTests: false,
  sort: 'check_in_date:asc',
  page: 1,
  limit: 25,
};
