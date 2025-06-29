import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect, useRef } from 'react';
import { toCapitalCase, transformFieldValues } from '@/utils/formatters';
import { generateRandomData, setDummyFile } from '@/utils/mockData';
import {
  guestFormSchema,
  type GuestFormData,
} from '@/features/guest-form/schemas/guestFormSchema';
import { defaultFormValues } from '@/features/guest-form/constants/guestFormData';
import {
  handleNameInputChange,
  validateImageFile,
  fetchImageAsFile,
  handleFileUpload,
} from '@/utils/helpers';
import { getTodayDate, handleCheckInDateChange } from '@/utils/dates';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Upload, Loader2 } from 'lucide-react';

const isProduction = import.meta.env.VITE_NODE_ENV === 'production';
const apiUrl = import.meta.env.VITE_API_URL;

export function GuestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [invalidBookingId, setInvalidBookingId] = useState(false);
  const [validIdPreview, setValidIdPreview] = useState<string | null>(null);
  const [paymentReceiptPreview, setPaymentReceiptPreview] = useState<
    string | null
  >(null);
  const [petVaccinationPreview, setPetVaccinationPreview] = useState<
    string | null
  >(null);
  const [petImagePreview, setPetImagePreview] = useState<string | null>(null);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validIdInputRef = useRef<HTMLInputElement>(null);
  const petVaccinationInputRef = useRef<HTMLInputElement>(null);
  const petImageInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const navigate = useNavigate();

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: defaultFormValues,
    mode: 'all',
  });

  const today = getTodayDate();

  // Generate a new booking ID for new submissions
  useEffect(() => {
    if (!bookingId) {
      const newBookingId = crypto.randomUUID();
      setCurrentBookingId(newBookingId);
    } else {
      setCurrentBookingId(bookingId);
    }
  }, [bookingId]);

  const fetchFormData = async () => {
    if (!bookingId) return;

    setIsLoading(true);
    setSubmitError(null);
    setInvalidBookingId(false);

    try {
      const response = await fetch(`${apiUrl}/get-form/${bookingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch form data');
      }

      // If the form data is successfully fetched, set the form data
      if (result.success && result.data) {
        const formData = { ...result.data };

        // Set file input URLs if they exist
        if (formData.paymentReceiptUrl) {
          // Fetch the image and convert it to a File object
          const paymentReceiptFile = await fetchImageAsFile(
            formData.paymentReceiptUrl,
            formData.primaryGuestName
          );
          if (paymentReceiptFile) {
            formData.paymentReceipt = paymentReceiptFile;
            setPaymentReceiptPreview(formData.paymentReceiptUrl);
          }
        }

        if (formData.validIdUrl) {
          // Fetch the image and convert it to a File object
          const validIdFile = await fetchImageAsFile(
            formData.validIdUrl,
            formData.primaryGuestName
          );
          if (validIdFile) {
            formData.validId = validIdFile;
            setValidIdPreview(formData.validIdUrl);
          }
        }

        if (formData.petVaccinationUrl) {
          // Fetch the image and convert it to a File object
          const petVaccinationFile = await fetchImageAsFile(
            formData.petVaccinationUrl,
            formData.primaryGuestName
          );
          if (petVaccinationFile) {
            formData.petVaccination = petVaccinationFile;
            setPetVaccinationPreview(formData.petVaccinationUrl);
          }
        }

        if (formData.petImageUrl) {
          const petImageFile = await fetchImageAsFile(
            formData.petImageUrl,
            formData.primaryGuestName
          );
          if (petImageFile) {
            formData.petImage = petImageFile;
            setPetImagePreview(formData.petImageUrl);
          }
        }

        // Reset form with the modified data
        form.reset(formData);
      } else {
        setInvalidBookingId(true);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
      setInvalidBookingId(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch form data if bookingId is present
  useEffect(() => {
    fetchFormData();
  }, [bookingId]);

  // Generate new random data on page load only in non-production and when no bookingId
  useEffect(() => {
    if (!isProduction && !bookingId && !isLoading) {
      handleGenerateNewData();
    }
  }, [isLoading, bookingId]);

  // Update file input when generating new data
  const handleGenerateNewData = async () => {
    if (isProduction) return;

    const randomData = await generateRandomData();
    form.reset(randomData);

    // Set the dummy files in the file inputs
    if (randomData.paymentReceipt) {
      setDummyFile(fileInputRef, randomData.paymentReceipt);
    }
    if (randomData.validId) {
      setDummyFile(validIdInputRef, randomData.validId);
    }
    if (randomData.petVaccination) {
      setDummyFile(petVaccinationInputRef, randomData.petVaccination);
    }
    if (randomData.petImage) {
      setDummyFile(petImageInputRef, randomData.petImage);
    }
  };

  async function onSubmit(values: GuestFormData) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const transformedValues = transformFieldValues(values);
      const formData = new FormData();

      // Add the booking ID to form data
      formData.append('bookingId', currentBookingId || '');

      // Add all form values to FormData, excluding paymentReceipt, validId, petVaccination and petImage
      Object.entries(transformedValues).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          key !== 'paymentReceipt' &&
          key !== 'validId' &&
          key !== 'petVaccination' &&
          key !== 'petImage'
        ) {
          formData.append(key, value.toString());
        }
      });

      // Add additional fixed values
      formData.append('unitOwner', 'Arianna Perez');
      formData.append('towerAndUnitNumber', 'Monaco 2604');
      formData.append('ownerOnsiteContactPerson', 'Arianna Perez');
      formData.append('ownerContactNumber', '0962 541 2941');

      // Handle file uploads with standardized naming
      ['paymentReceipt', 'validId', 'petVaccination', 'petImage'].forEach(
        (prefix) => {
          handleFileUpload(
            formData,
            values[prefix as keyof GuestFormData] as File | null | undefined,
            prefix,
            values.primaryGuestName,
            values.checkInDate,
            values.checkOutDate,
            prefix === 'petVaccination' || prefix === 'petImage'
              ? values.hasPets
              : true
          );
        }
      );

      // Build URL with query parameters
      const queryParams = new URLSearchParams();
      [
        'generatePdf',
        'sendEmail',
        'updateGoogleCalendar',
        'updateGoogleSheets',
      ].forEach((param) => {
        let value = 'true'; // default value
        if (param === 'updateGoogleSheets') {
          // For updateGoogleSheets, check if it's explicitly set to true
          const explicitValue = searchParams.get(param);
          // In development, default to false unless explicitly set to true
          // In production, default to true (existing behavior)
          value = !isProduction
            ? 'false'
            : explicitValue === 'false'
            ? 'false'
            : 'true';
        } else {
          // For other parameters, use existing logic
          value = searchParams.get(param) === 'false' ? 'false' : 'true';
        }

        queryParams.append(param, value);
      });

      const queryParamsString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : '';
      const apiUrlWithParams = `${apiUrl}/submit-form${queryParamsString}`;

      const response = await fetch(apiUrlWithParams, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            errorData.message ||
            `HTTP error! status: ${response.status} - ${JSON.stringify(
              errorData
            )}`
        );
      }

      const result = await response.json();
      if (!result.success) {
        const errorMessage =
          result.error || result.details?.message || 'Failed to submit form';
        console.error('Form submission failed:', result);
        throw new Error(errorMessage);
      }

      // Reset form and redirect to success page
      if (isProduction) {
        form.reset(defaultFormValues);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSubmitError(null);

      // Redirect to success page with bookingId
      navigate(`/success?bookingId=${currentBookingId}`);
    } catch (error: unknown) {
      console.error('Error submitting form:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      const errorMessage =
        error instanceof Error
          ? `Error: ${error.message}`
          : 'An unexpected error occurred. Please try again.';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Calculate total number of additional guests needed, capped at 6
  const totalGuests =
    (form.watch('numberOfAdults') || 1) + (form.watch('numberOfChildren') || 0);
  const additionalGuestsNeeded = Math.min(3, Math.max(0, totalGuests - 1)); // Cap at 3 additional guests

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 space-y-2">
            <Loader2 className="w-10 h-10 text-green-500 animate-spin sm:w-12 sm:h-12" />
            <p className="text-base text-gray-400">Loading form data...</p>
          </div>
        ) : invalidBookingId ? (
          <div className="flex flex-col justify-center items-center py-20 space-y-4">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-red-600">
                Booking Not Found
              </h2>
              <p className="max-w-md text-gray-600">
                The booking ID you provided is invalid or no guest form data
                exists for this booking. Please check your booking ID and try
                again, or contact us if you need assistance.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInvalidBookingId(false);
                  navigate('/', { replace: true });
                }}
                className="mt-4"
              >
                Return to Guest Form
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setInvalidBookingId(false);
                  fetchFormData();
                }}
                className="mt-4"
              >
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <>
            {!isProduction && !bookingId && (
              <div className="flex justify-end mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateNewData}
                >
                  Generate New Data
                </Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="guestFacebookName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Guest Facebook Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your exact full name in Facebook"
                      {...field}
                      onChange={(e) =>
                        handleNameInputChange(e, field.onChange, toCapitalCase)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Guest Email <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Ex. juandelacruz@gmail.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestPhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Guest Phone Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Ex. 09876543210"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/[^\d]/g, '');
                        // Limit to 11 digits
                        const trimmed = value.slice(0, 11);
                        field.onChange(trimmed);

                        // Trigger validation on change
                        form.trigger('guestPhoneNumber');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Guest Address <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City, Province"
                      {...field}
                      onChange={(e) =>
                        field.onChange(toCapitalCase(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkInDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Check-in Date <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={today}
                        {...field}
                        onChange={(e) => handleCheckInDateChange(e, form)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Time</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="02:00 pm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('checkInTime') &&
              form.watch('checkInTime') < '14:00' && (
                <div
                  className="px-4 py-3 text-blue-700 bg-blue-50 rounded border border-blue-200"
                  role="alert"
                >
                  <p className="text-sm">
                    Our standard check-in time is 2:00 PM. Early check-in
                    requests are subject to approval and may incur additional
                    fees. Please contact us on Facebook to arrange early
                    check-in.
                  </p>
                </div>
              )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkOutDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Check-out Date <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={
                          form.watch('checkInDate')
                            ? form.watch('checkInDate')
                            : today
                        }
                        {...field}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          form.trigger('checkOutTime');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Time</FormLabel>
                    <FormControl>
                      <Input type="time" placeholder="11:00 am" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch('checkOutTime') &&
              form.watch('checkOutTime') > '11:00' && (
                <div
                  className="px-4 py-3 text-blue-700 bg-blue-50 rounded border border-blue-200"
                  role="alert"
                >
                  <p className="text-sm">
                    Our standard check-out time is 11:00 AM. Late check-out
                    requests are subject to approval and may incur additional
                    fees. Please contact us on Facebook to arrange late
                    check-out.
                  </p>
                </div>
              )}

            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nationality</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex. Filipino"
                      onChange={(e) =>
                        field.onChange(toCapitalCase(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numberOfAdults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Adults</FormLabel>
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="px-3 rounded-r-none"
                        disabled={field.value <= 1} // Always require at least 1 adult
                        onClick={() => {
                          const newValue = Math.max(1, (field.value || 1) - 1);
                          field.onChange(newValue);
                        }}
                      >
                        -
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="1"
                          max="4"
                          readOnly
                          tabIndex={-1}
                          className="text-center rounded-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pointer-events-none"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className="px-3 rounded-l-none"
                        disabled={field.value >= 4 || totalGuests >= 6} // Max 4 adults or total 6 guests
                        onClick={() => {
                          const currentChildren =
                            form.getValues('numberOfChildren') || 0;
                          const newValue = Math.min(4, (field.value || 1) + 1);
                          if (newValue + currentChildren <= 6) {
                            field.onChange(newValue);
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberOfChildren"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Children</FormLabel>
                    <div className="flex items-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="px-3 rounded-r-none"
                        disabled={field.value <= 0}
                        onClick={() => {
                          const newValue = Math.max(0, (field.value || 0) - 1);
                          field.onChange(newValue);
                        }}
                      >
                        -
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min="0"
                          max="5"
                          readOnly
                          tabIndex={-1}
                          className="text-center rounded-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pointer-events-none"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        color="green"
                        variant="outline"
                        className="px-3 rounded-l-none"
                        disabled={totalGuests >= 6 || field.value >= 5} // Max total 6 guests or 5 children
                        onClick={() => {
                          const currentAdults =
                            form.getValues('numberOfAdults') || 1;
                          const newValue = (field.value || 0) + 1;
                          if (newValue + currentAdults <= 6) {
                            field.onChange(newValue);
                          }
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {totalGuests >= 4 && (
              <div
                className="px-4 py-3 text-blue-700 bg-blue-50 rounded border border-blue-200"
                role="alert"
              >
                <p className="text-sm">
                  Please note that Azure North only allows a maximum of 4 pax on
                  the guest form. However, our unit can accommodate up to 4
                  adults and 2 children. But if you're more than 4 adults,
                  please inform us directly on our Facebook page so that we can
                  accommodate you.
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="primaryGuestName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    1. Primary Guest - Name{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Complete name of Primary Guest"
                      {...field}
                      onChange={(e) =>
                        handleNameInputChange(e, field.onChange, toCapitalCase)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic Additional Guests Fields */}
            {additionalGuestsNeeded > 0 && (
              <div className="space-y-4">
                {Array.from({ length: additionalGuestsNeeded }).map(
                  (_, index) => (
                    <FormField
                      key={index}
                      control={form.control}
                      name={`guest${index + 2}Name` as keyof GuestFormData}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {index + 2}.{' '}
                            {index + 2 === 2
                              ? 'Second'
                              : index + 2 === 3
                              ? 'Third'
                              : 'Fourth'}{' '}
                            Guest - Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={`Complete name of ${
                                index + 2 === 2
                                  ? 'Second Guest'
                                  : index + 2 === 3
                                  ? 'Third Guest'
                                  : 'Fourth Guest'
                              }`}
                              {...field}
                              value={field.value?.toString() ?? ''}
                              onChange={(e) =>
                                handleNameInputChange(
                                  e,
                                  field.onChange,
                                  toCapitalCase
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="guestSpecialRequests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special requests / Notes to owner</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex. Late check-in, cash only for balance payment, celebrating special occasion, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="findUs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How did you find us?</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || 'Facebook'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select how you found us" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Airbnb">Airbnb</SelectItem>
                      <SelectItem value="Tiktok">Tiktok</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(form.watch('findUs') === 'Friend' ||
              form.watch('findUs') === 'Others') && (
              <FormField
                control={form.control}
                name="findUsDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch('findUs') === 'Friend'
                        ? "Friend's Name"
                        : 'Please specify where you found us'}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          form.watch('findUs') === 'Friend'
                            ? "Enter your friend's name"
                            : 'Please specify how you found us'
                        }
                        {...field}
                        onChange={(e) =>
                          field.onChange(toCapitalCase(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="needParking"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Need Pay Parking?</FormLabel>
                  </FormItem>
                )}
              />

              {form.watch('needParking') && (
                <div className="pl-6 space-y-4">
                  <div
                    className="px-4 py-3 text-blue-700 bg-blue-50 rounded border border-blue-200"
                    role="alert"
                  >
                    <div className="flex flex-col gap-y-4 text-sm">
                      <p className="font-bold">
                        🚙 Azure North Parking Reminder
                      </p>
                      <p>
                        Please note that vehicles without a designated parking
                        slot are allowed to enter for{' '}
                        <span className="font-semibold">drop-off only</span> in
                        front of the Tower entrance.
                      </p>
                      <p>
                        <span className="font-semibold">
                          FREE parking is available outside Azure North
                        </span>{' '}
                        in front of the gate entrance and Home Depot, just 3-5
                        minutes walk to Azure North Monaco Tower.
                      </p>
                      <p>
                        If you want to reserve a parking slot inside Azure
                        North, please fill up your car details below and pay{' '}
                        <span className="font-semibold text-red-600">
                          ₱400 per night
                        </span>
                        . We understand it's a bit pricey, but we secure parking
                        spaces from other owners and do not profit from it.
                      </p>
                      <p>
                        To ensure hassle-free entry to your staycation, we
                        highly recommend booking in advance since parking slots
                        are limited particularly during weekends.
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="carPlateNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Car Plate Number{' '}
                          {form.watch('needParking') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex. ABC123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="carBrandModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Car Brand & Model{' '}
                          {form.watch('needParking') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex. Honda Civic"
                            {...field}
                            onChange={(e) =>
                              field.onChange(toCapitalCase(e.target.value))
                            }
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
                      <FormItem>
                        <FormLabel>
                          Car Color{' '}
                          {form.watch('needParking') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex. Red"
                            {...field}
                            onChange={(e) =>
                              field.onChange(toCapitalCase(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="hasPets"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Bringing Pets?</FormLabel>
                  </FormItem>
                )}
              />

              {form.watch('hasPets') && (
                <div className="pl-6 space-y-4">
                  <div
                    className="px-4 py-3 text-blue-700 bg-blue-50 rounded border border-blue-200"
                    role="alert"
                  >
                    <div className="flex flex-col gap-y-4 text-sm">
                      <p className="font-bold">
                        🐶 Azure North Pet Policy Reminder
                      </p>
                      <p>
                        Azure North requires the following pet information for
                        approval by the PMO.
                      </p>
                      <p>
                        <span className="font-semibold">
                          Only one (1) toy/small dog is allowed
                        </span>{' '}
                        in the unit and a{' '}
                        <span className="font-semibold text-red-600">
                          ₱300 pet fee
                        </span>{' '}
                        is required.
                      </p>
                      <p>
                        Pets must be transported using the service elevator only
                        and must be secured in a zipped-up, hand-carried
                        case/bag and on a leash each time they are brought out
                        of the unit.
                      </p>
                      <p>
                        <span className="font-semibold">
                          No pets allowed in the following areas:
                        </span>{' '}
                        Main Lobby, Viewing Deck, Common/Amenity Areas, Roof
                        Deck
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="petName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Pet Name{' '}
                          {form.watch('hasPets') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex. Max"
                            {...field}
                            onChange={(e) =>
                              field.onChange(toCapitalCase(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="petBreed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Pet Breed{' '}
                          {form.watch('hasPets') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex. Labrador"
                            {...field}
                            onChange={(e) =>
                              field.onChange(toCapitalCase(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="petAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Pet Age{' '}
                          {form.watch('hasPets') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex. 2 years old" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="petVaccinationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Last Vaccination Date{' '}
                          {form.watch('hasPets') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="petImage"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>
                          Pet Image{' '}
                          {form.watch('hasPets') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <div className="relative aspect-[3/2] max-h-[250px] md:max-h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 group">
                            {petImagePreview || value ? (
                              <>
                                <img
                                  src={
                                    petImagePreview ||
                                    (value && URL.createObjectURL(value))
                                  }
                                  alt="Pet Image Preview"
                                  className="object-cover w-full h-full"
                                />
                                <div className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity bg-black/50 group-hover:opacity-100">
                                  <label className="flex gap-2 items-center px-4 py-2 text-sm text-white bg-green-500 rounded transition-colors cursor-pointer hover:bg-green-600">
                                    <Upload className="w-4 h-4" />
                                    Replace Image
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/heic"
                                      className="hidden"
                                      {...field}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const validation =
                                            validateImageFile(file);
                                          if (!validation.valid) {
                                            alert(validation.message);
                                            return;
                                          }
                                          onChange(file);
                                          setPetImagePreview(
                                            URL.createObjectURL(file)
                                          );
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </>
                            ) : (
                              <div className="flex absolute inset-0 justify-center items-center">
                                <label className="flex gap-2 items-center px-4 py-2 text-sm text-green-500 rounded border border-green-500 border-solid transition-colors cursor-pointer hover:text-green-600 hover:border-green-600">
                                  <Upload className="w-4 h-4" />
                                  Upload Image
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/heic"
                                    className="hidden"
                                    {...field}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const validation =
                                          validateImageFile(file);
                                        if (!validation.valid) {
                                          alert(validation.message);
                                          return;
                                        }
                                        onChange(file);
                                        setPetImagePreview(
                                          URL.createObjectURL(file)
                                        );
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="petVaccination"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>
                          Pet Vaccination Record{' '}
                          {form.watch('hasPets') && (
                            <span className="text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <div className="relative aspect-[3/2] max-h-[250px] md:max-h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 group">
                            {petVaccinationPreview || value ? (
                              <>
                                <img
                                  src={
                                    petVaccinationPreview ||
                                    (value && URL.createObjectURL(value))
                                  }
                                  alt="Pet Vaccination Record Preview"
                                  className="object-cover w-full h-full"
                                />
                                <div className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity bg-black/50 group-hover:opacity-100">
                                  <label className="flex gap-2 items-center px-4 py-2 text-sm text-white bg-green-500 rounded transition-colors cursor-pointer hover:bg-green-600">
                                    <Upload className="w-4 h-4" />
                                    Replace Image
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/heic"
                                      className="hidden"
                                      {...field}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const validation =
                                            validateImageFile(file);
                                          if (!validation.valid) {
                                            alert(validation.message);
                                            return;
                                          }
                                          onChange(file);
                                          setPetVaccinationPreview(
                                            URL.createObjectURL(file)
                                          );
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </>
                            ) : (
                              <div className="flex absolute inset-0 justify-center items-center">
                                <label className="flex gap-2 items-center px-4 py-2 text-sm text-green-500 rounded border border-green-500 border-solid transition-colors cursor-pointer hover:text-green-600 hover:border-green-600">
                                  <Upload className="w-4 h-4" />
                                  Upload Image
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/heic"
                                    className="hidden"
                                    {...field}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const validation =
                                          validateImageFile(file);
                                        if (!validation.valid) {
                                          alert(validation.message);
                                          return;
                                        }
                                        onChange(file);
                                        setPetVaccinationPreview(
                                          URL.createObjectURL(file)
                                        );
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="validId"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      Valid ID <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative aspect-[3/2] max-h-[250px] md:max-h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 group">
                        {validIdPreview || value ? (
                          <>
                            <img
                              src={
                                validIdPreview ||
                                (value && URL.createObjectURL(value))
                              }
                              alt="Valid ID Preview"
                              className="object-cover w-full h-full"
                            />
                            <div className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity bg-black/50 group-hover:opacity-100">
                              <label className="flex gap-2 items-center px-4 py-2 text-sm text-white bg-green-500 rounded transition-colors cursor-pointer hover:bg-green-600">
                                <Upload className="w-4 h-4" />
                                Replace Image
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/heic"
                                  className="hidden"
                                  {...field}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const validation =
                                        validateImageFile(file);
                                      if (!validation.valid) {
                                        alert(validation.message);
                                        return;
                                      }
                                      onChange(file);
                                      setValidIdPreview(
                                        URL.createObjectURL(file)
                                      );
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </>
                        ) : (
                          <div className="flex absolute inset-0 justify-center items-center">
                            <label className="flex gap-2 items-center px-4 py-2 text-sm text-green-500 rounded border border-green-500 border-solid transition-colors cursor-pointer hover:text-green-600 hover:border-green-600">
                              <Upload className="w-4 h-4" />
                              Upload Image
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/heic"
                                className="hidden"
                                {...field}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const validation = validateImageFile(file);
                                    if (!validation.valid) {
                                      alert(validation.message);
                                      return;
                                    }
                                    onChange(file);
                                    setValidIdPreview(
                                      URL.createObjectURL(file)
                                    );
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentReceipt"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      Payment Receipt <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative aspect-[3/2] max-h-[250px] md:max-h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 group">
                        {paymentReceiptPreview || value ? (
                          <>
                            <img
                              src={
                                paymentReceiptPreview ||
                                (value && URL.createObjectURL(value))
                              }
                              alt="Payment Receipt Preview"
                              className="object-cover w-full h-full"
                            />
                            <div className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity bg-black/50 group-hover:opacity-100">
                              <label className="flex gap-2 items-center px-4 py-2 text-sm text-white bg-green-500 rounded transition-colors cursor-pointer hover:bg-green-600">
                                <Upload className="w-4 h-4" />
                                Replace Image
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png,image/heic"
                                  className="hidden"
                                  {...field}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const validation =
                                        validateImageFile(file);
                                      if (!validation.valid) {
                                        alert(validation.message);
                                        return;
                                      }
                                      onChange(file);
                                      setPaymentReceiptPreview(
                                        URL.createObjectURL(file)
                                      );
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </>
                        ) : (
                          <div className="flex absolute inset-0 justify-center items-center">
                            <label className="flex gap-2 items-center px-4 py-2 text-sm text-green-500 rounded border border-green-500 border-solid transition-colors cursor-pointer hover:text-green-600 hover:border-green-600">
                              <Upload className="w-4 h-4" />
                              Upload Image
                              <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/heic"
                                className="hidden"
                                {...field}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const validation = validateImageFile(file);
                                    if (!validation.valid) {
                                      alert(validation.message);
                                      return;
                                    }
                                    onChange(file);
                                    setPaymentReceiptPreview(
                                      URL.createObjectURL(file)
                                    );
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {submitError && (
              <div
                className="relative px-4 py-3 mb-4 text-red-700 bg-red-50 rounded border border-red-200"
                role="alert"
              >
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{submitError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className={`bg-green-500 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="mr-3 -ml-1 w-5 h-5 text-white animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Guest Form'
              )}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}
