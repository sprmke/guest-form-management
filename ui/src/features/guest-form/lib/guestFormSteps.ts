import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Car,
  FileText,
  PawPrint,
  User,
} from 'lucide-react';

import type { GuestFormData } from '@/features/guest-form/schemas/guestFormSchema';
import {
  guestFormSchema,
  createGuestFormSchema,
} from '@/features/guest-form/schemas/guestFormSchema';

export type GuestFormStepId = number;

export type GuestFormStepConfig = {
  id: GuestFormStepId;
  short: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

const ALL_GUEST_FORM_STEPS: GuestFormStepConfig[] = [
  {
    id: 1,
    short: 'Guest',
    label: 'Primary Guest Info',
    hint: 'How we can reach you & valid ID',
    icon: User,
  },
  {
    id: 2,
    short: 'Stay',
    label: 'Booking details',
    hint: 'Dates, guests & requests',
    icon: CalendarDays,
  },
  {
    id: 3,
    short: 'Parking',
    label: 'Parking',
    hint: 'Optional paid parking inside Azure',
    icon: Car,
  },
  {
    id: 4,
    short: 'Pets',
    label: 'Pet information',
    hint: 'Only if you are bringing pets',
    icon: PawPrint,
  },
  {
    id: 5,
    short: 'Payment',
    label: 'Payment',
    hint: 'Downpayment receipt',
    icon: FileText,
  },
];

/** Default (Facebook) steps — all 5. */
export const GUEST_FORM_STEPS = ALL_GUEST_FORM_STEPS;
export const GUEST_FORM_STEP_COUNT = ALL_GUEST_FORM_STEPS.length;

/** Airbnb skips the Payment step (step 5). */
const AIRBNB_GUEST_FORM_STEPS = ALL_GUEST_FORM_STEPS.slice(0, 4);

export function getGuestFormSteps(isAirbnb: boolean): GuestFormStepConfig[] {
  return isAirbnb ? AIRBNB_GUEST_FORM_STEPS : ALL_GUEST_FORM_STEPS;
}

export function getGuestFormStepCount(isAirbnb: boolean): number {
  return isAirbnb ? AIRBNB_GUEST_FORM_STEPS.length : ALL_GUEST_FORM_STEPS.length;
}

function stayNightCount(values: GuestFormData): number {
  return Math.max(
    0,
    Math.ceil(
      (new Date(values.checkOutDate).getTime() -
        new Date(values.checkInDate).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
}

/** Fields to validate when leaving a step (includes conditional paths from guestFormSchema). */
export function getFieldsForGuestFormStep(
  step: GuestFormStepId,
  values: GuestFormData,
): (keyof GuestFormData)[] {
  switch (step) {
    case 1:
      return [
        'guestFacebookName',
        'guestEmail',
        'guestPhoneNumber',
        'guestAddress',
        'validId',
      ];
    case 2: {
      const fields: (keyof GuestFormData)[] = [
        'checkInDate',
        'checkOutDate',
        'checkInTime',
        'checkOutTime',
        'nationality',
        'numberOfAdults',
        'numberOfChildren',
        'primaryGuestName',
        'findUs',
      ];
      const totalGuests = values.numberOfAdults + values.numberOfChildren;
      if (totalGuests >= 2) fields.push('guest2Name');
      if (totalGuests >= 3) fields.push('guest3Name');
      if (totalGuests >= 4) fields.push('guest4Name');
      if (values.findUs === 'Friend' || values.findUs === 'Others') {
        fields.push('findUsDetails');
      }
      return fields;
    }
    case 3: {
      if (!values.needParking) return ['needParking'];
      const fields: (keyof GuestFormData)[] = [
        'needParking',
        'carPlateNumber',
        'carBrandModel',
        'carColor',
      ];
      const nights = stayNightCount(values);
      const useStayDates =
        nights <= 1 || values.parkingSameAsBookingDuration !== false;
      if (!useStayDates) {
        fields.push('parkingCheckInDate', 'parkingCheckOutDate');
      }
      return fields;
    }
    case 4: {
      if (!values.hasPets) return ['hasPets'];
      return [
        'hasPets',
        'petName',
        'petType',
        'petBreed',
        'petAge',
        'petVaccinationDate',
        'petVaccination',
        'petImage',
      ];
    }
    case 5:
      return ['paymentReceipt'];
    default:
      return [];
  }
}

export function clampGuestFormStep(step: number, isAirbnb = false): GuestFormStepId {
  const max = getGuestFormStepCount(isAirbnb);
  return Math.min(max, Math.max(1, step)) as GuestFormStepId;
}

/** True when every required field for this step passes the schema (ignores other steps). */
export function isGuestFormStepComplete(
  step: GuestFormStepId,
  values: GuestFormData,
  isAirbnb = false,
): boolean {
  const stepFields = new Set(getFieldsForGuestFormStep(step, values));
  const schema = createGuestFormSchema(isAirbnb);
  const result = schema.safeParse(values);
  if (result.success) return true;

  return !result.error.issues.some((issue) => {
    const key = issue.path[0];
    return typeof key === 'string' && stepFields.has(key as keyof GuestFormData);
  });
}
