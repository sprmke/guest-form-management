
import {
  CheckboxOption,
  Field,
  Input,
  Row2,
  Row3,
} from '@/features/dashboard/bookings/components/booking-detail/edit/BookingEditFields';
import type { BookingEditFormValues } from '@/features/dashboard/bookings/components/BookingEditForm';
import { bookingEditDatePickerClass } from '@/features/dashboard/bookings/components/BookingEditForm';

import { DatePicker } from '@/components/ui/date-picker';
import { dateToString, stringToDate, DATE_PICKER_DISPLAY_FORMAT } from '@/utils/format/dates';

import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';

type Props = {
  register: UseFormRegister<BookingEditFormValues>;
  setValue: UseFormSetValue<BookingEditFormValues>;
  watchPets: boolean;
  petVaccinationDate: string;
};

export function PetsTab({ register, setValue, watchPets, petVaccinationDate }: Props) {
  return (
    <>
      <CheckboxOption
        label="Has pets"
        checked={watchPets}
        onCheckedChange={(value) =>
          setValue('has_pets', value, { shouldDirty: true, shouldValidate: true })
        }
      />
      {watchPets && (
        <>
          <Row2>
            <Field label="Pet Name">
              <Input {...register('pet_name')} />
            </Field>
            <Field label="Pet Type">
              <Input {...register('pet_type')} placeholder="Dog / Cat" />
            </Field>
          </Row2>
          <Row3>
            <Field label="Breed">
              <Input {...register('pet_breed')} />
            </Field>
            <Field label="Age">
              <Input {...register('pet_age')} placeholder="2 years" />
            </Field>
            <Field label="Vaccination Date">
              <DatePicker
                date={petVaccinationDate ? stringToDate(petVaccinationDate) : undefined}
                onSelect={(date) => {
                  setValue('pet_vaccination_date', date ? dateToString(date) : '', {
                    shouldDirty: true,
                  });
                }}
                placeholder={DATE_PICKER_DISPLAY_FORMAT}
                className={bookingEditDatePickerClass}
              />
            </Field>
          </Row3>
        </>
      )}
    </>
  );
}
