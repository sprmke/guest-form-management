import { CalendarDays, Car, FileText, PawPrint, User } from 'lucide-react';

import { formatParkingStepHint } from '@/features/guest/form/lib/guestFormBranding';
import type { GuestFormData } from '@/features/guest/form/schemas/guestFormSchema';
import {
  createGuestFormSchema,
  type GuestFormSchemaOptions,
} from '@/features/guest/form/schemas/guestFormSchema';

import type { LucideIcon } from 'lucide-react';

export type GuestFormStepId = number;

export type GuestFormStepConfig = {
  id: GuestFormStepId;
  short: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

export type GuestFormVisibilityFlags = GuestFormSchemaOptions & {
  residenceName: string | null;
};

const ALL_GUEST_FORM_STEPS: GuestFormStepConfig[] = [
  {
    id: 1,
    short: 'Guest',
    label: 'Primary Guest Info',
    hint: 'How we can reach you',
    icon: User,
  },
  {
    id: 2,
    short: 'Stay',
    label: 'Booking details',
    hint: 'Dates, guest details & requests',
    icon: CalendarDays,
  },
  {
    id: 3,
    short: 'Parking',
    label: 'Parking',
    hint: 'Optional paid parking',
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

function buildVisibleSteps(flags: GuestFormVisibilityFlags): GuestFormStepConfig[] {
  return ALL_GUEST_FORM_STEPS.filter((step) => {
    if (step.id === 3) return flags.allowParking;
    if (step.id === 4) return flags.allowPets;
    if (step.id === 5) return !flags.isAirbnb;
    return true;
  });
}

export function getGuestFormSteps(flags: GuestFormVisibilityFlags): GuestFormStepConfig[] {
  return buildVisibleSteps(flags).map((step) =>
    step.id === 3 && flags.residenceName
      ? { ...step, hint: formatParkingStepHint(flags.residenceName) }
      : step
  );
}

export function getGuestFormStepCount(flags: GuestFormVisibilityFlags): number {
  return buildVisibleSteps(flags).length;
}

function stayNightCount(values: GuestFormData): number {
  return Math.max(
    0,
    Math.ceil(
      (new Date(values.checkOutDate).getTime() - new Date(values.checkInDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
}

/** Fields to validate when leaving a step (includes conditional paths from guestFormSchema). */
export function getFieldsForGuestFormStep(
  step: GuestFormStepId,
  values: GuestFormData
): (keyof GuestFormData)[] {
  switch (step) {
    case 1:
      return ['guestFacebookName', 'guestEmail', 'guestPhoneNumber', 'guestAddress'];
    case 2: {
      const fields: (keyof GuestFormData)[] = [
        'checkInDate',
        'checkOutDate',
        'checkInTime',
        'checkOutTime',
        'nationality',
        'primaryGuestName',
        'primaryGuestAge',
        'findUs',
      ];

      const guestPairs = [
        {
          name: values.guest2Name,
          age: values.guest2Age,
          nameKey: 'guest2Name' as const,
          ageKey: 'guest2Age' as const,
          validIdKey: 'guest2ValidId' as const,
        },
        {
          name: values.guest3Name,
          age: values.guest3Age,
          nameKey: 'guest3Name' as const,
          ageKey: 'guest3Age' as const,
          validIdKey: 'guest3ValidId' as const,
        },
        {
          name: values.guest4Name,
          age: values.guest4Age,
          nameKey: 'guest4Name' as const,
          ageKey: 'guest4Age' as const,
          validIdKey: 'guest4ValidId' as const,
        },
        {
          name: values.guest5Name,
          age: values.guest5Age,
          nameKey: 'guest5Name' as const,
          ageKey: 'guest5Age' as const,
          validIdKey: 'guest5ValidId' as const,
        },
      ];

      for (const guest of guestPairs) {
        if (guest.name?.trim() || guest.age != null) {
          fields.push(guest.nameKey, guest.ageKey);
        }
      }

      if (values.primaryGuestAge != null && values.primaryGuestAge >= 18) {
        fields.push('validId');
      }

      for (const guest of guestPairs) {
        if (guest.age != null && guest.age >= 18) {
          fields.push(guest.validIdKey);
        }
      }

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
      const useStayDates = nights <= 1 || values.parkingSameAsBookingDuration !== false;
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

export function clampGuestFormStep(step: number, flags: GuestFormVisibilityFlags): GuestFormStepId {
  const max = getGuestFormStepCount(flags);
  return Math.min(max, Math.max(1, step)) as GuestFormStepId;
}

/** True when every required field for this step passes the schema (ignores other steps). */
export function isGuestFormStepComplete(
  step: GuestFormStepId,
  values: GuestFormData,
  flags: GuestFormVisibilityFlags
): boolean {
  const stepFields = new Set(getFieldsForGuestFormStep(step, values));
  const schema = createGuestFormSchema(flags);
  const result = schema.safeParse(values);
  if (result.success) return true;

  return !result.error.issues.some((issue) => {
    const key = issue.path[0];
    return typeof key === 'string' && stepFields.has(key as keyof GuestFormData);
  });
}
