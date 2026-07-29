import {
  CheckboxOption,
  Field,
  Input,
  Row3,
} from '@/features/dashboard/bookings/components/booking-detail/edit/BookingEditFields';
import type { BookingEditFormValues } from '@/features/dashboard/bookings/components/BookingEditForm';

import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';


type Props = {
  register: UseFormRegister<BookingEditFormValues>;
  setValue: UseFormSetValue<BookingEditFormValues>;
  watchParking: boolean;
};

export function ParkingTab({ register, setValue, watchParking }: Props) {
  return (
    <>
      <CheckboxOption
        label="Needs parking"
        checked={watchParking}
        onCheckedChange={(value) =>
          setValue('need_parking', value, { shouldDirty: true, shouldValidate: true })
        }
      />
      {watchParking && (
        <Row3>
          <Field label="Plate Number">
            <Input {...register('car_plate_number')} placeholder="ABC 123" />
          </Field>
          <Field label="Brand / Model">
            <Input {...register('car_brand_model')} placeholder="Toyota Vios" />
          </Field>
          <Field label="Color">
            <Input {...register('car_color')} placeholder="White" />
          </Field>
        </Row3>
      )}
    </>
  );
}
