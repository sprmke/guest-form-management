import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { GuestFormStepNavigation } from '@/features/guest/form/components/GuestFormStepNavigation';
import { GuestFormStepper } from '@/features/guest/form/components/GuestFormStepper';
import {
  parkingRegistrationSchema,
  type ParkingRegistrationValues,
} from '@/features/guest/marketing/parkings/lib/parkingRegistrationSchema';
import {
  clampParkingStep,
  getFieldsForParkingStep,
  isParkingStepComplete,
  PARKING_REGISTRATION_STEP_COUNT,
  PARKING_REGISTRATION_STEPS,
} from '@/features/guest/marketing/parkings/lib/parkingRegistrationSteps';

import { DatePicker } from '@/components/ui/date-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FORM_PLACEHOLDERS } from '@/lib/constants/formPlaceholders';
import {
  DATE_PICKER_DISPLAY_FORMAT,
  dateToString,
  getNextDay,
  stringToDate,
} from '@/utils/format/dates';
import { toCapitalCase } from '@/utils/text/formatters';

interface ParkingRegistrationFormProps {
  defaultValues?: Partial<ParkingRegistrationValues>;
  /** Read-only tower/building label shown beside Unit Number, when known for this slot. */
  towerLabel?: string | null;
  onSubmit: (data: ParkingRegistrationValues) => Promise<void>;
}

export function ParkingRegistrationForm({
  defaultValues,
  towerLabel,
  onSubmit,
}: ParkingRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ParkingRegistrationValues>({
    resolver: zodResolver(parkingRegistrationSchema),
    defaultValues: {
      guestName: '',
      email: '',
      phone: '',
      unitNumber: '',
      checkInDate: '',
      checkOutDate: '',
      vehicleType: undefined,
      carPlateNumber: '',
      carBrandModel: '',
      carColor: '',
      notes: '',
      ...defaultValues,
    },
    mode: 'all',
  });

  const activeStepConfig = PARKING_REGISTRATION_STEPS.find((step) => step.id === currentStep);
  const canProceed = isParkingStepComplete(currentStep, form.getValues());

  const handleNextStep = async () => {
    if (!canProceed) {
      await form.trigger(getFieldsForParkingStep(currentStep));
      toast.error('Please complete all required fields before continuing.');
      return;
    }
    setCurrentStep((step) => clampParkingStep(step + 1) as 1 | 2 | 3);
  };

  const handleBackStep = () => {
    setCurrentStep((step) => clampParkingStep(step - 1) as 1 | 2 | 3);
  };

  const handleFinalSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6" noValidate>
        <GuestFormStepper activeStep={currentStep} steps={PARKING_REGISTRATION_STEPS} />

        <div className="border-border/80 bg-card space-y-5 rounded-xl border px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <header className="border-separator flex items-center gap-3 border-b pb-4">
            <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              {activeStepConfig && <activeStepConfig.icon className="size-5" aria-hidden />}
            </div>
            <div>
              <h2 className="text-foreground text-base font-semibold sm:text-lg">
                {activeStepConfig?.title}
              </h2>
              <p className="text-muted-foreground text-sm">{activeStepConfig?.hint}</p>
            </div>
          </header>

          {currentStep === 1 && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="guestName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Guest Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={FORM_PLACEHOLDERS.fullName} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={FORM_PLACEHOLDERS.email} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Phone Number <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder={FORM_PLACEHOLDERS.phone}
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '');
                            field.onChange(value.slice(0, 11));
                            form.trigger('phone');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div
                className={
                  towerLabel
                    ? 'grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0'
                    : undefined
                }
              >
                {towerLabel && (
                  <FormItem className="min-w-0">
                    <FormLabel>Tower</FormLabel>
                    <FormControl>
                      <Input value={towerLabel} readOnly disabled />
                    </FormControl>
                  </FormItem>
                )}

                <FormField
                  control={form.control}
                  name="unitNumber"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Unit Number <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={FORM_PLACEHOLDERS.unitNumber} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Check-in Date <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value ? stringToDate(field.value) : undefined}
                          rangeEnd={
                            form.watch('checkOutDate')
                              ? stringToDate(form.watch('checkOutDate'))
                              : undefined
                          }
                          onSelect={(date) => {
                            if (!date) return;
                            const dateStr = dateToString(date);
                            field.onChange(dateStr);
                            form.setValue('checkOutDate', getNextDay(dateStr));
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          minDate={new Date()}
                          placeholder={DATE_PICKER_DISPLAY_FORMAT}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Check-out Date <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value ? stringToDate(field.value) : undefined}
                          rangeEnd={
                            form.watch('checkInDate')
                              ? stringToDate(form.watch('checkInDate'))
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) field.onChange(dateToString(date));
                          }}
                          disabled={(date) => {
                            const checkInDate = form.watch('checkInDate');
                            if (checkInDate) {
                              return date <= stringToDate(checkInDate);
                            }
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          minDate={
                            form.watch('checkInDate')
                              ? stringToDate(getNextDay(form.watch('checkInDate')))
                              : new Date()
                          }
                          placeholder={DATE_PICKER_DISPLAY_FORMAT}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Vehicle Type <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="motorcycle">Motorcycle</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carPlateNumber"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Plate Number <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex. ABC 1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="carBrandModel"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Brand/Model <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex. Toyota Fortuner"
                          {...field}
                          onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carColor"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>
                        Color <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex. White"
                          {...field}
                          onChange={(e) => field.onChange(toCapitalCase(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special parking requests or notes?"
                        rows={4}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <GuestFormStepNavigation
          bare
          currentStep={currentStep}
          stepCount={PARKING_REGISTRATION_STEP_COUNT}
          isSubmitting={isSubmitting}
          canProceed={canProceed}
          submitReady
          submitLabel="Submit Parking Request"
          onBack={handleBackStep}
          onNext={handleNextStep}
          onSubmit={() => void handleFinalSubmit()}
        />
      </form>
    </Form>
  );
}
