/**
 * Real-tabs shell for the booking edit form — replaces `BookingEditShell`
 * (banner + ring container) and the old scroll-anchor `EditSectionJumpNav`.
 *
 * Owns local tab state (not a URL param — edit mode itself is transient) and
 * renders one tab's content at a time inside `BookingDetailCard tone="edit"`,
 * the same primitive view-mode panels use, so edit and view read as one
 * visual system. The single `useForm` instance stays in `BookingEditForm.tsx`
 * — RHF keeps every field's value even while its tab isn't mounted.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  Car,
  CalendarRange,
  FileText,
  ListChecks,
  PawPrint,
  PencilLine,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';

import { BookingDetailCard } from '@/features/dashboard/bookings/components/booking-detail/primitives/BookingDetailCard';
import type { BookingEditFormValues } from '@/features/dashboard/bookings/components/BookingEditForm';
import { ReadyForCheckinSensitiveFieldsNotice } from '@/features/dashboard/bookings/components/ReadyForCheckinSensitiveFieldsNotice';
import type { BookingRow } from '@/features/dashboard/bookings/lib/types';

import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/sliding-tabs';
import { cn } from '@/lib/utils';
import { formatBookingDate } from '@/utils/format/bookingDisplay';

import type { FieldErrors } from 'react-hook-form';

export type BookingEditTabId = 'guest' | 'stay' | 'parking' | 'pets' | 'docs' | 'workflow';

const TAB_ORDER: BookingEditTabId[] = ['guest', 'stay', 'parking', 'pets', 'docs', 'workflow'];

const TAB_META: Record<BookingEditTabId, { label: string; icon: LucideIcon }> = {
  guest: { label: 'Guest', icon: UserRound },
  stay: { label: 'Stay', icon: CalendarRange },
  parking: { label: 'Parking', icon: Car },
  pets: { label: 'Pets', icon: PawPrint },
  docs: { label: 'Docs', icon: FileText },
  workflow: { label: 'Workflow', icon: ListChecks },
};

/** Maps every RHF-registered top-level field to the tab that owns it, for error-dot badges and cross-tab error jump. */
const FIELD_TO_TAB: Partial<Record<keyof BookingEditFormValues, BookingEditTabId>> = {
  booking_source: 'guest',
  guest_facebook_name: 'guest',
  primary_guest_name: 'guest',
  guest_email: 'guest',
  guest_phone_number: 'guest',
  guest_address: 'guest',
  nationality: 'guest',
  primary_guest_age: 'guest',
  guest2_name: 'guest',
  guest2_age: 'guest',
  guest3_name: 'guest',
  guest3_age: 'guest',
  guest4_name: 'guest',
  guest4_age: 'guest',
  guest5_name: 'guest',
  guest5_age: 'guest',
  find_us: 'guest',
  find_us_details: 'guest',
  guest_special_requests: 'guest',
  guest_requests_surprise_decor: 'guest',
  check_in_date: 'stay',
  check_out_date: 'stay',
  check_in_time: 'stay',
  check_out_time: 'stay',
  number_of_adults: 'stay',
  number_of_children: 'stay',
  number_of_nights: 'stay',
  need_parking: 'parking',
  car_plate_number: 'parking',
  car_brand_model: 'parking',
  car_color: 'parking',
  has_pets: 'pets',
  pet_name: 'pets',
  pet_type: 'pets',
  pet_breed: 'pets',
  pet_age: 'pets',
  pet_vaccination_date: 'pets',
};

function scrollToFirstInvalidField(errors: FieldErrors<BookingEditFormValues>) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  const byDataField = document.querySelector(`[data-field="${firstKey}"]`);
  const byInvalid = document.querySelector('[aria-invalid="true"]');
  (byDataField ?? byInvalid)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function tabsWithErrorsFrom(errors: FieldErrors<BookingEditFormValues>): Set<BookingEditTabId> {
  const set = new Set<BookingEditTabId>();
  (Object.keys(errors) as (keyof BookingEditFormValues)[]).forEach((key) => {
    const tab = FIELD_TO_TAB[key];
    if (tab) set.add(tab);
  });
  return set;
}

export type BookingEditTabsHandle = {
  /** Called from the form's `onInvalid` handler — switches to the first errored tab and scrolls to the field. */
  focusFirstError: (errors: FieldErrors<BookingEditFormValues>) => void;
};

type Props = {
  booking: BookingRow;
  onDiscard: () => void;
  discardDisabled?: boolean;
  errors: FieldErrors<BookingEditFormValues>;
  showDocsTab: boolean;
  sensitiveNoticeVisible: boolean;
  /** Content for each tab, built by `BookingEditForm.tsx` from the shared `useForm` instance. */
  tabs: Partial<Record<BookingEditTabId, ReactNode>>;
  footer: ReactNode;
  /** Open on a specific tab (e.g. Add parking → parking). */
  initialTab?: BookingEditTabId;
};

export const BookingEditTabs = forwardRef<BookingEditTabsHandle, Props>(function BookingEditTabs(
  {
    booking,
    onDiscard,
    discardDisabled,
    errors,
    showDocsTab,
    sensitiveNoticeVisible,
    tabs,
    footer,
    initialTab = 'guest',
  },
  ref
) {
  const orderedTabs = useMemo(
    () => TAB_ORDER.filter((id) => id !== 'docs' || showDocsTab),
    [showDocsTab]
  );
  const [activeTab, setActiveTab] = useState<BookingEditTabId>(() =>
    orderedTabs.includes(initialTab) ? initialTab : 'guest'
  );
  const pendingScrollErrorsRef = useRef<FieldErrors<BookingEditFormValues> | null>(null);

  // Docs tab can appear/disappear as the admin edits booking source / pets — keep the active tab valid.
  useEffect(() => {
    if (!orderedTabs.includes(activeTab)) {
      setActiveTab(orderedTabs[0] ?? 'guest');
    }
  }, [orderedTabs, activeTab]);

  useImperativeHandle(
    ref,
    () => ({
      focusFirstError(fieldErrors) {
        const errorTabs = tabsWithErrorsFrom(fieldErrors);
        const targetTab = orderedTabs.find((id) => errorTabs.has(id));
        if (targetTab && targetTab !== activeTab) {
          pendingScrollErrorsRef.current = fieldErrors;
          setActiveTab(targetTab);
        } else {
          requestAnimationFrame(() => scrollToFirstInvalidField(fieldErrors));
        }
      },
    }),
    [orderedTabs, activeTab]
  );

  // Runs after the target tab (set by focusFirstError above) has mounted its fields.
  useEffect(() => {
    const pending = pendingScrollErrorsRef.current;
    if (!pending) return;
    pendingScrollErrorsRef.current = null;
    const raf = requestAnimationFrame(() => scrollToFirstInvalidField(pending));
    return () => cancelAnimationFrame(raf);
  }, [activeTab]);

  const tabsWithErrors = useMemo(() => tabsWithErrorsFrom(errors), [errors]);

  const options: SegmentedControlOption<BookingEditTabId>[] = orderedTabs.map((id) => ({
    value: id,
    label: TAB_META[id].label,
    className: cn(
      'relative',
      tabsWithErrors.has(id) &&
        "after:bg-destructive after:absolute after:right-1 after:top-1 after:size-1.5 after:rounded-full after:content-['']"
    ),
  }));

  const guestLabel =
    booking.guest_facebook_name?.trim() || booking.primary_guest_name?.trim() || 'Booking';

  return (
    <div
      className="ring-primary/40 bg-muted/30 ring-offset-background overflow-hidden rounded-2xl ring-2 ring-offset-2"
      data-mode="edit"
    >
      <div className="bg-primary/12 border-primary/25 flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <span className="bg-primary/20 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <PencilLine className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-primary text-sm font-bold">Editing booking</p>
            <p className="text-muted-foreground truncate text-xs font-medium">
              {guestLabel} · {formatBookingDate(booking.check_in_date)} →{' '}
              {formatBookingDate(booking.check_out_date)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDiscard}
          disabled={discardDisabled}
          className="border-border/80 bg-background/90 text-muted-foreground hover:bg-background inline-flex min-h-[44px] shrink-0 items-center gap-1.5 self-end rounded-lg border px-3 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 sm:self-auto"
        >
          <X className="size-3.5" aria-hidden />
          Discard
        </button>
      </div>

      <div className="bg-background/60 space-y-4 px-3 py-4 sm:px-5 sm:py-5">
        <ReadyForCheckinSensitiveFieldsNotice visible={sensitiveNoticeVisible} />

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={options}
          aria-label="Edit booking sections"
        />

        <BookingDetailCard
          title={TAB_META[activeTab].label}
          icon={TAB_META[activeTab].icon}
          tone="edit"
          bodyClassName="space-y-4 pb-5 pt-4 sm:space-y-5 sm:pb-6 sm:pt-5"
        >
          {tabs[activeTab]}
        </BookingDetailCard>
      </div>

      {footer}
    </div>
  );
});
