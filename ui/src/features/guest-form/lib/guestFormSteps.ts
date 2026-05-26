import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  Car,
  FileText,
  PawPrint,
  User,
} from 'lucide-react';

import type { GuestFormData } from '@/features/guest-form/schemas/guestFormSchema';
import { guestFormSchema } from '@/features/guest-form/schemas/guestFormSchema';

export const GUEST_FORM_STEP_COUNT = 5;

export type GuestFormStepId = 1 | 2 | 3 | 4 | 5;

export type GuestFormStepConfig = {
  id: GuestFormStepId;
  short: string;
  label: string;
  icon: LucideIcon;
};

export const GUEST_FORM_STEPS: GuestFormStepConfig[] = [
  {
    id: 1,
    short: 'Guest',
    label: 'Primary Guest Info',
    icon: User,
  },
  {
    id: 2,
    short: 'Stay',
    label: 'Booking details',
    icon: CalendarDays,
  },
  {
    id: 3,
    short: 'Parking',
    label: 'Parking',
    icon: Car,
  },
  {
    id: 4,
    short: 'Pets',
    label: 'Pet information',
    icon: PawPrint,
  },
  {
    id: 5,
    short: 'Docs',
    label: 'Required documents',
    icon: FileText,
  },
];

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
      return ['paymentReceipt', 'validId'];
    default:
      return [];
  }
}

export function clampGuestFormStep(step: number): GuestFormStepId {
  return Math.min(
    GUEST_FORM_STEP_COUNT,
    Math.max(1, step),
  ) as GuestFormStepId;
}

/** True when every required field for this step passes guestFormSchema (ignores other steps). */
export function isGuestFormStepComplete(
  step: GuestFormStepId,
  values: GuestFormData,
): boolean {
  const stepFields = new Set(getFieldsForGuestFormStep(step, values));
  const result = guestFormSchema.safeParse(values);
  if (result.success) return true;

  return !result.error.issues.some((issue) => {
    const key = issue.path[0];
    return typeof key === 'string' && stepFields.has(key as keyof GuestFormData);
  });
}
