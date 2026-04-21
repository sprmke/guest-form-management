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

  guest_facebook_name: string;
  primary_guest_name: string;
  guest_email: string;
  guest_phone_number: string;

  check_in_date: string;   // MM-DD-YYYY
  check_out_date: string;  // MM-DD-YYYY
  check_in_time: string | null;
  check_out_time: string | null;
  number_of_adults: number;
  number_of_children: number | null;
  number_of_nights: number;

  need_parking: boolean | null;
  has_pets: boolean | null;

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
  settled_at?: string | null;
};

export type BookingsSort = 'created_at:desc' | 'created_at:asc';

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
  sort: 'created_at:desc',
  page: 1,
  limit: 25,
};
