import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import 'react-day-picker/dist/style.css';
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
import {
  getNextDay,
  createDisabledDateMatcher,
  createDisabledCheckoutDateMatcher,
  stringToDate,
  dateToString,
  type BookedDateRange,
} from '@/utils/dates';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  Loader2,
  User,
  CalendarDays,
  PawPrint,
  FileText,
  Car,
  Settings,
  Trash2,
  ClipboardPaste,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import {
  formatBookingInfoForClipboard,
  parseBookingInfoFromClipboard,
} from '@/utils/bookingFormatter';

const isProduction = import.meta.env.VITE_NODE_ENV === 'production';
const apiUrl = import.meta.env.VITE_API_URL;

export function GuestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
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
  const [bookedDates, setBookedDates] = useState<BookedDateRange[]>([]);
  const [sameAsFacebookName, setSameAsFacebookName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validIdInputRef = useRef<HTMLInputElement>(null);
  const petVaccinationInputRef = useRef<HTMLInputElement>(null);
  const petImageInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const navigate = useNavigate();

  // Check if testing & dev modes are enabled (via query parameter)
  const isTestingMode = searchParams.get('testing') === 'true';
  const isDevMode = searchParams.get('dev') === 'true';

  // Show dev controls in dev environment OR when testing=true in production
  const showDevControls = !isProduction || isTestingMode || isDevMode;

  // Dev/Testing API action controls (all unchecked by default in dev/testing mode)
  const [devApiControls, setDevApiControls] = useState({
    saveToDatabase: isProduction && isDevMode,
    saveImagesToStorage: isProduction && isDevMode,
    generatePdf: isProduction && isDevMode,
    sendEmail: isProduction && isDevMode,
    updateCalendar: isProduction && isDevMode,
    updateGoogleSheets: isProduction && isDevMode,
  });

  const form = useForm<GuestFormData>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: defaultFormValues,
    mode: 'all',
  });

  // Generate a new booking ID for new submissions
  useEffect(() => {
    if (!bookingId) {
      const newBookingId = crypto.randomUUID();
      setCurrentBookingId(newBookingId);
    } else {
      // Sanitize bookingId to remove any query parameters or extra characters
      // Extract only the UUID part (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      const cleanBookingId = bookingId.split('?')[0].split('&')[0].trim();
      setCurrentBookingId(cleanBookingId);
    }
  }, [bookingId]);

  // Fetch booked dates function (extracted so it can be reused)
  const fetchBookedDates = async () => {
    try {
      const response = await fetch(`${apiUrl}/get-booked-dates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.data) {
        setBookedDates(result.data);
        console.log('✅ Loaded booked dates:', result.data.length, 'bookings');
        console.log('📅 Booked date ranges:', result.data);
      } else {
        console.error('❌ Failed to fetch booked dates:', result);
      }
    } catch (error) {
      console.error('❌ Error fetching booked dates:', error);
    }
  };

  // Fetch booked dates on component mount
  useEffect(() => {
    fetchBookedDates();
  }, []);

  const fetchFormData = async () => {
    if (!bookingId) return;

    setIsLoading(true);
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

  // Generate new random data on page load only when dev controls are shown and no bookingId
  useEffect(() => {
    if (showDevControls && !bookingId && !isLoading) {
      handleGenerateNewData();
    }
  }, [isLoading, bookingId, showDevControls]);

  // Paste booking info from clipboard
  const handlePasteFromClipboard = async () => {
    if (!showDevControls) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      const parsedData = parseBookingInfoFromClipboard(clipboardText);

      if (!parsedData) {
        toast.error('Invalid Format', {
          description:
            'The clipboard does not contain valid booking information. Please copy the booking info from an error message first.',
          duration: 5000,
        });
        return;
      }

      // Populate the form with parsed data
      Object.entries(parsedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // @ts-ignore - Dynamic form field setting
          form.setValue(key as keyof GuestFormData, value);
        }
      });

      toast.success('Booking Info Loaded!', {
        description:
          'Form has been populated with the booking information from clipboard. Please review and update file attachments.',
        duration: 5000,
      });
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      toast.error('Paste Failed', {
        description:
          'Could not read from clipboard. Please ensure you have copied the booking information first.',
        duration: 5000,
      });
    }
  };

  // Update file input when generating new data
  const handleGenerateNewData = async () => {
    if (!showDevControls) return;

    try {
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
    } catch (error) {
      toast.error('Failed to generate test data', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleCleanupTestData = async () => {
    if (!showDevControls) return;

    // Confirmation dialog
    if (
      !window.confirm(
        '⚠️ Are you sure you want to delete ALL test data?\n\n' +
          'This will delete:\n' +
          '• Database records with TEST_ files\n' +
          '• Storage files starting with TEST_\n' +
          '• Calendar events starting with [TEST]\n' +
          '• Google Sheets rows starting with [TEST]\n\n' +
          'This action cannot be undone!'
      )
    ) {
      return;
    }

    setIsCleaningUp(true);

    try {
      const response = await fetch(`${apiUrl}/cleanup-test-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ confirm: true }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to cleanup test data');
      }

      const summary = result.summary?.totalDeleted || {};
      const grandTotal = result.summary?.grandTotal || 0;

      toast.success('Test data cleanup completed!', {
        description: `Deleted: ${grandTotal} items (DB: ${
          summary.database || 0
        }, Storage: ${summary.storage || 0}, Calendar: ${
          summary.calendar || 0
        }, Sheets: ${summary.sheets || 0})`,
        duration: 5000,
      });

      // Refresh booked dates after cleanup
      await fetchBookedDates();
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to cleanup test data', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  async function onSubmit(values: GuestFormData) {
    setIsSubmitting(true);

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

      if (showDevControls) {
        // In dev/testing mode, use the control checkboxes
        queryParams.append(
          'saveToDatabase',
          devApiControls.saveToDatabase ? 'true' : 'false'
        );
        queryParams.append(
          'saveImagesToStorage',
          devApiControls.saveImagesToStorage ? 'true' : 'false'
        );
        queryParams.append(
          'generatePdf',
          devApiControls.generatePdf ? 'true' : 'false'
        );
        queryParams.append(
          'sendEmail',
          devApiControls.sendEmail ? 'true' : 'false'
        );
        queryParams.append(
          'updateGoogleCalendar',
          devApiControls.updateCalendar ? 'true' : 'false'
        );
        queryParams.append(
          'updateGoogleSheets',
          devApiControls.updateGoogleSheets ? 'true' : 'false'
        );
        queryParams.append('testing', 'true');
      } else {
        // In normal production mode, all actions are enabled by default
        queryParams.append('saveToDatabase', 'true');
        queryParams.append('saveImagesToStorage', 'true');
        queryParams.append('generatePdf', 'true');
        queryParams.append('sendEmail', 'true');
        queryParams.append('updateGoogleCalendar', 'true');
        queryParams.append('updateGoogleSheets', 'true');
        queryParams.append('testing', isTestingMode ? 'true' : 'false');
      }

      const queryParamsString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : '';
      const apiUrlWithParams = `${apiUrl}/submit-form${queryParamsString}`;

      const response = await fetch(apiUrlWithParams, {
        method: 'POST',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
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
          result.error ||
          result.details?.message ||
          'Failed to submit the guest form';
        console.error('Failed to submit the guest form:', result);
        throw new Error(errorMessage);
      }

      // Check if submission was skipped due to no changes
      if (result.skipped) {
        console.log('ℹ️ No changes detected, redirecting to success page');

        // Prepare booking data to pass to success page
        const bookingData = {
          checkInDate: values.checkInDate,
          checkOutDate: values.checkOutDate,
          checkInTime: values.checkInTime,
          checkOutTime: values.checkOutTime,
          numberOfAdults: values.numberOfAdults,
          numberOfChildren: values.numberOfChildren,
          primaryGuestName: values.primaryGuestName,
          guest2Name: values.guest2Name,
          guest3Name: values.guest3Name,
          guest4Name: values.guest4Name,
          guest5Name: values.guest5Name,
          hasPets: values.hasPets,
          petName: values.petName,
          needParking: values.needParking,
          guestEmail: values.guestEmail,
          guestPhoneNumber: values.guestPhoneNumber,
        };

        // Redirect to success page with booking data
        navigate(`/success?bookingId=${currentBookingId}`, {
          state: { bookingData },
        });
        return;
      }

      // Reset form and redirect to success page
      // Only reset form in normal production mode (not dev or testing mode)
      if (!showDevControls) {
        form.reset(defaultFormValues);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      // Prepare booking summary data to pass to success page
      const bookingData = {
        checkInDate: values.checkInDate,
        checkOutDate: values.checkOutDate,
        checkInTime: values.checkInTime,
        checkOutTime: values.checkOutTime,
        numberOfAdults: values.numberOfAdults,
        numberOfChildren: values.numberOfChildren,
        primaryGuestName: values.primaryGuestName,
        guest2Name: values.guest2Name,
        guest3Name: values.guest3Name,
        guest4Name: values.guest4Name,
        guest5Name: values.guest5Name,
        hasPets: values.hasPets,
        petName: values.petName,
        needParking: values.needParking,
        guestEmail: values.guestEmail,
        guestPhoneNumber: values.guestPhoneNumber,
      };

      // Redirect to success page with bookingId and booking data
      navigate(`/success?bookingId=${currentBookingId}`, {
        state: { bookingData },
      });
    } catch (error: unknown) {
      console.error('Error submitting form:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again.';

      // Dismiss any existing error toasts first to prevent stacking
      toast.dismiss();

      // Helper function to copy booking info to clipboard
      const handleCopyBookingInfo = async () => {
        try {
          const formValues = form.getValues();
          const bookingInfo = formatBookingInfoForClipboard(
            formValues,
            currentBookingId
          );
          await navigator.clipboard.writeText(bookingInfo);

          // Dismiss all existing toasts (including the error toast) before showing success
          toast.dismiss();

          toast.success('Booking Info Copied!', {
            description:
              'You can now paste this information in our Facebook Messenger for assistance.',
            duration: 5000,
          });
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);

          // Dismiss all existing toasts before showing the new error
          toast.dismiss();

          toast.error('Failed to Copy', {
            description:
              'Could not copy to clipboard. Please try again or screenshot the form.',
            duration: 5000,
          });
        }
      };

      // Check if it's a booking overlap error
      if (
        errorMessage.includes('BOOKING_OVERLAP') ||
        errorMessage.includes('already booked')
      ) {
        // Show prominent warning toast for booking overlap
        toast.error('Dates Already Booked', {
          id: 'booking-error',
          description:
            'The selected dates are already reserved. Please select different dates or contact your host via Facebook for assistance.',
          duration: Infinity, // Never auto-hide
        });
      } else {
        // Show regular error toast for other errors
        const cleanedMessage = errorMessage
          .replace('Error: ', '')
          .replace('BOOKING_OVERLAP: ', '');

        toast.error('Failed to submit the guest form', {
          id: 'submission-error',
          description: (
            <div className="space-y-3">
              <p className="text-sm font-semibold leading-relaxed">
                {cleanedMessage}
              </p>
              <p className="text-sm leading-relaxed opacity-90">
                Click the button below to copy your form data and paste it on
                our Facebook Messenger so we don't need to manually fill up all
                information again. We really apologize for the inconvenience.
              </p>
              <button
                onClick={handleCopyBookingInfo}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
              >
                Copy Booking Information
              </button>
            </div>
          ),
          duration: Infinity, // Never auto-hide
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Calculate total number of additional guests needed, capped at 6
  const totalGuests =
    (form.watch('numberOfAdults') || 1) + (form.watch('numberOfChildren') || 0);
  const additionalGuestsNeeded = Math.min(3, Math.max(0, totalGuests - 1)); // Cap at 3 additional guests

  // Handle "Same as Facebook Name" checkbox
  useEffect(() => {
    if (sameAsFacebookName) {
      const facebookName = form.getValues('guestFacebookName');
      form.setValue('primaryGuestName', sameAsFacebookName ? facebookName : '');
    }
  }, [sameAsFacebookName, form.watch('guestFacebookName')]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative p-4 space-y-8 md:p-6"
      >
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 space-y-2">
            <Loader2 className="w-10 h-10 animate-spin text-primary sm:w-12 sm:h-12" />
            <p className="text-base text-muted-foreground">
              Loading form data...
            </p>
          </div>
        ) : invalidBookingId ? (
          <div className="flex flex-col justify-center items-center py-20 space-y-4">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-destructive">
                Booking Not Found
              </h2>
              <p className="max-w-md text-muted-foreground">
                The booking ID you provided is invalid or no guest form data
                exists for this booking. Please screenshot this error message
                and contact us on Facebook for further assistance.
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
          <div className="pt-10 space-y-6 md:pt-14">
            {/* logo here */}
            <img
              src="/images/logo.png"
              alt="Kame Home"
              className="absolute top-[-3.5rem] md:top-[-4.5rem] right-0 left-0 mx-auto w-[120px] md:w-[160px] border-4 border-white rounded-full"
            />
            <h2 className="text-2xl font-bold text-center md:text-3xl text-primary">
              Guest Advise Form
            </h2>
            {/* Guest Information Section */}
            <div className="form-section">
              <div className="form-section-header">
                <User className="form-section-icon" />
                <h2 className="form-section-title">Primary Guest Info</h2>
              </div>

              <FormField
                control={form.control}
                name="guestFacebookName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Facebook Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your exact full name in Facebook"
                        {...field}
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

              <FormField
                control={form.control}
                name="guestEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email Address <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Ex. juandelacruz@gmail.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value && !form.formState.errors.guestEmail && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Please ensure you have access to this email. The guest
                        advice form (GAF) will be sent there, which is required
                        for Azure entry and check-in.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phone Number <span className="text-destructive">*</span>
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
                      Address <span className="text-destructive">*</span>
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
            </div>

            {/* Booking Details Section */}
            <div className="form-section">
              <div className="form-section-header">
                <CalendarDays className="form-section-icon" />
                <h2 className="form-section-title">Booking Details</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Check-in Date{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          date={
                            field.value ? stringToDate(field.value) : undefined
                          }
                          rangeEnd={
                            form.watch('checkOutDate')
                              ? stringToDate(form.watch('checkOutDate'))
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              const dateStr = dateToString(date);
                              field.onChange(dateStr);
                              // Always auto-set checkout to next day when check-in changes
                              form.setValue(
                                'checkOutDate',
                                getNextDay(dateStr)
                              );
                            }
                          }}
                          disabled={(date) => {
                            // Disable past dates
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (date < today) {
                              return true;
                            }

                            // Disable booked dates
                            return createDisabledDateMatcher(
                              bookedDates,
                              currentBookingId
                            )(date);
                          }}
                          minDate={new Date()}
                          placeholder="Select check-in date"
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
                    className="px-4 py-3 bg-blue-50 rounded-lg border-2 border-blue-200"
                    role="alert"
                  >
                    <p className="text-sm font-medium">
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
                        Check-out Date{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          date={
                            field.value ? stringToDate(field.value) : undefined
                          }
                          rangeEnd={
                            form.watch('checkInDate')
                              ? stringToDate(form.watch('checkInDate'))
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              const dateStr = dateToString(date);
                              field.onChange(dateStr);
                              form.trigger('checkOutTime');
                            }
                          }}
                          disabled={(date) => {
                            // Use checkout-specific matcher that allows checkout on check-in dates
                            const isBooked = createDisabledCheckoutDateMatcher(
                              bookedDates,
                              currentBookingId
                            )(date);

                            // Disable dates before or equal to check-in date
                            const checkInDate = form.watch('checkInDate');
                            if (checkInDate) {
                              const checkIn = stringToDate(checkInDate);
                              if (date <= checkIn) {
                                return true;
                              }
                            }

                            return isBooked;
                          }}
                          minDate={
                            form.watch('checkInDate')
                              ? stringToDate(
                                  getNextDay(form.watch('checkInDate'))
                                )
                              : new Date()
                          }
                          placeholder="Select check-out date"
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
                    className="px-4 py-3 bg-blue-50 rounded-lg border-2 border-blue-200"
                    role="alert"
                  >
                    <p className="text-sm font-medium">
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
                            const newValue = Math.max(
                              1,
                              (field.value || 1) - 1
                            );
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
                            const newValue = Math.min(
                              4,
                              (field.value || 1) + 1
                            );
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
                            const newValue = Math.max(
                              0,
                              (field.value || 0) - 1
                            );
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
                  className="px-4 py-3 bg-blue-50 rounded-lg border-2 border-blue-200"
                  role="alert"
                >
                  <p className="text-sm font-medium">
                    Please note that Azure North only allows a maximum of 4 pax
                    on the guest form. However, our unit can accommodate up to 4
                    adults and 2 children. But if you're more than 4 adults,
                    please inform us directly on our Facebook page so that we
                    can accommodate you.
                  </p>
                </div>
              )}
              <FormField
                control={form.control}
                name="primaryGuestName"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col mb-2 space-y-2">
                      <FormLabel>
                        1. Primary Guest - Name{' '}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="sameAsFacebookName"
                          checked={sameAsFacebookName}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setSameAsFacebookName(isChecked);
                            if (isChecked) {
                              const facebookName =
                                form.getValues('guestFacebookName');
                              if (facebookName) {
                                form.setValue('primaryGuestName', facebookName);
                              }
                            }
                          }}
                          className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <label
                          htmlFor="sameAsFacebookName"
                          className="text-sm cursor-pointer text-muted-foreground"
                        >
                          Same as Facebook Name
                        </label>
                      </div>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="Complete name of Primary Guest"
                        {...field}
                        disabled={sameAsFacebookName}
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
                              Guest - Name{' '}
                              <span className="text-red-500">*</span>
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
            </div>

            {/* Parking Information Section */}
            <div className="form-section">
              <div className="form-section-header">
                <Car className="form-section-icon" />
                <h2 className="form-section-title">Parking Information</h2>
              </div>
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
                <div className="space-y-4">
                  <div
                    className="px-4 py-3 bg-blue-50 rounded-lg border-2 border-blue-200"
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
                        North, please fill out your car details below and pay{' '}
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
            </div>

            {/* Pet Information Section */}
            <div className="form-section">
              <div className="form-section-header">
                <PawPrint className="form-section-icon" />
                <h2 className="form-section-title">Pet Information</h2>
              </div>

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
                        className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">
                      Bringing Pets?
                    </FormLabel>
                  </FormItem>
                )}
              />

              {form.watch('hasPets') && (
                <div className="mt-4 space-y-5">
                  <div
                    className="px-4 py-3 bg-blue-50 rounded-lg border-2 border-blue-200"
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
                            <span className="text-destructive">*</span>
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
                    name="petType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Pet Type{' '}
                          {form.watch('hasPets') && (
                            <span className="text-destructive">*</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex. Dog, Cat"
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
                            <span className="text-destructive">*</span>
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
                            <span className="text-destructive">*</span>
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
                            <span className="text-destructive">*</span>
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
                            <span className="text-destructive">*</span>
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

            {/* Required Documents Section */}
            <div className="form-section">
              <div className="form-section-header">
                <FileText className="form-section-icon" />
                <h2 className="form-section-title">Required Documents</h2>
              </div>

              <FormField
                control={form.control}
                name="validId"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      Valid ID <span className="text-destructive">*</span>
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
                      Payment Receipt{' '}
                      <span className="text-destructive">*</span>
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

            {/* Dev/Testing API Controls Card */}
            {showDevControls && (
              <div className="form-section">
                <div className="form-section-header">
                  <Settings className="form-section-icon" />
                  <h2 className="form-section-title">
                    {isTestingMode
                      ? 'Testing Controls (Testing Mode)'
                      : 'Developer Controls (Dev Mode)'}
                  </h2>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Control which API actions are performed when submitting the
                    form. All actions are{' '}
                    <span className="font-semibold">disabled by default</span>{' '}
                    in {isTestingMode ? 'testing' : 'development'} mode.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center p-3 space-x-3 rounded-lg transition-colors bg-muted/30 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id="saveToDatabase"
                        checked={devApiControls.saveToDatabase}
                        onChange={(e) =>
                          setDevApiControls({
                            ...devApiControls,
                            saveToDatabase: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <label
                        htmlFor="saveToDatabase"
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        Save data to database
                      </label>
                    </div>

                    <div className="flex items-center p-3 space-x-3 rounded-lg transition-colors bg-muted/30 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id="saveImagesToStorage"
                        checked={devApiControls.saveImagesToStorage}
                        onChange={(e) =>
                          setDevApiControls({
                            ...devApiControls,
                            saveImagesToStorage: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <label
                        htmlFor="saveImagesToStorage"
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        Save image assets to Supabase Storage
                      </label>
                    </div>

                    <div className="flex items-center p-3 space-x-3 rounded-lg transition-colors bg-muted/30 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id="generatePdf"
                        checked={devApiControls.generatePdf}
                        onChange={(e) =>
                          setDevApiControls({
                            ...devApiControls,
                            generatePdf: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <label
                        htmlFor="generatePdf"
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        Generate PDF
                      </label>
                    </div>

                    <div className="flex items-center p-3 space-x-3 rounded-lg transition-colors bg-muted/30 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id="sendEmail"
                        checked={devApiControls.sendEmail}
                        onChange={(e) =>
                          setDevApiControls({
                            ...devApiControls,
                            sendEmail: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <label
                        htmlFor="sendEmail"
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        Send email notification
                      </label>
                    </div>

                    <div className="flex items-center p-3 space-x-3 rounded-lg transition-colors bg-muted/30 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id="updateCalendar"
                        checked={devApiControls.updateCalendar}
                        onChange={(e) =>
                          setDevApiControls({
                            ...devApiControls,
                            updateCalendar: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <label
                        htmlFor="updateCalendar"
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        Update Google Calendar
                      </label>
                    </div>

                    <div className="flex items-center p-3 space-x-3 rounded-lg transition-colors bg-muted/30 hover:bg-muted/50">
                      <input
                        type="checkbox"
                        id="updateGoogleSheets"
                        checked={devApiControls.updateGoogleSheets}
                        onChange={(e) =>
                          setDevApiControls({
                            ...devApiControls,
                            updateGoogleSheets: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <label
                        htmlFor="updateGoogleSheets"
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        Update Google Sheets
                      </label>
                    </div>
                  </div>

                  {/* Paste Booking Info from Clipboard Button */}
                  {!bookingId && (
                    <div className="pt-4 border-t">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handlePasteFromClipboard}
                        className="w-full"
                      >
                        <ClipboardPaste className="mr-2 w-4 h-4" />
                        Paste Booking Info from Clipboard
                      </Button>
                      <p className="mt-2 text-xs text-center text-muted-foreground">
                        Load booking information copied from an error message
                      </p>
                    </div>
                  )}

                  {/* Generate New Data Button */}
                  {!bookingId && (
                    <div className="pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateNewData}
                        className="w-full"
                      >
                        Generate New Data
                      </Button>
                      <p className="mt-2 text-xs text-center text-muted-foreground">
                        Populate form with random test data
                      </p>
                    </div>
                  )}

                  {/* Cleanup Test Data Button */}
                  <div className="pt-4 border-t">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleCleanupTestData}
                      disabled={isCleaningUp}
                      className="w-full"
                    >
                      {isCleaningUp ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Cleaning up test data...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 w-4 h-4" />
                          Clean Up All Test Data
                        </>
                      )}
                    </Button>
                    <p className="mt-2 text-xs text-center text-muted-foreground">
                      Removes all test data from database, storage, calendar,
                      and sheets
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="success"
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Submitting Form...
                  </>
                ) : (
                  'Submit Guest Form'
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
