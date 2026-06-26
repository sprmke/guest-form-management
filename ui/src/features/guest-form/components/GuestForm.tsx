import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { KameFormBrandHeader } from '@/components/KameFormBrandHeader';
import { GuestFormPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';
import type { GuestNavState } from '@/layouts/guestNavState';
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
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { toCapitalCase, transformFieldValues } from '@/utils/formatters';
import { generateRandomData, setDummyFile } from '@/utils/mockData';
import {
  createGuestFormSchema,
  type GuestFormData,
} from '@/features/guest-form/schemas/guestFormSchema';
import {
  defaultFormValues,
  getGuestFormDefaultValuesFromSearchParams,
} from '@/features/guest-form/constants/guestFormData';
import {
  bookingSourceFromUrlSearchParams,
  stripLegacyFromQueryParam,
} from '@/features/guest-form/lib/bookingSourceFromSearchParams';
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
  normalizeDateString,
  getManilaYmdToday,
  DATE_PICKER_DISPLAY_FORMAT,
  type BookedDateRange,
} from '@/utils/dates';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  Loader2,
  Settings,
  ClipboardPaste,
  XCircle,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { IsoDateInput } from '@/components/ui/iso-date-input';
import {
  formatBookingInfoForClipboard,
  parseBookingInfoFromClipboard,
} from '@/utils/bookingFormatter';
import { GuestFormParkingDates } from '@/features/guest-form/components/GuestFormParkingDates';
import { GuestFormPaymentStepContent } from '@/features/guest-form/components/GuestFormPaymentStepContent';
import {
  DEFAULT_GUEST_PAYMENT_INFO,
  useGuestPaymentInfo,
} from '@/features/guest-form/hooks/useGuestPaymentInfo';
import { GuestFormStepper } from '@/features/guest-form/components/GuestFormStepper';
import { GuestFormStepNavigation } from '@/features/guest-form/components/GuestFormStepNavigation';
import {
  GuestFormInfoCallout,
  GuestFormOptionCard,
} from '@/features/guest-form/components/GuestFormOptionCard';
import { GuestFormGuestsSection } from '@/features/guest-form/components/GuestFormGuestsSection';
import { computeGuestCountsByAge } from '@/features/guest-form/lib/guestCounts';
import {
  clampGuestFormStep,
  getFieldsForGuestFormStep,
  isGuestFormStepComplete,
  getGuestFormSteps,
  getGuestFormStepCount,
  type GuestFormStepId,
} from '@/features/guest-form/lib/guestFormSteps';

const isProduction = import.meta.env.VITE_NODE_ENV === 'production';
const apiUrl = import.meta.env.VITE_API_URL;

export function GuestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [invalidBookingId, setInvalidBookingId] = useState(false);
  const [validIdPreviews, setValidIdPreviews] = useState<
    Record<string, string | null>
  >({});
  const [validIdImageErrors, setValidIdImageErrors] = useState<
    Record<string, boolean>
  >({});
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
  const [guestSectionSeedKey, setGuestSectionSeedKey] = useState(0);
  const [currentStep, setCurrentStep] = useState<GuestFormStepId>(1);
  const [submitReady, setSubmitReady] = useState(false);
  const stepPanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const petVaccinationInputRef = useRef<HTMLInputElement>(null);
  const petImageInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const navigate = useNavigate();
  const { data: guestFormSettings = DEFAULT_GUEST_PAYMENT_INFO } =
    useGuestPaymentInfo();

  // `?source=airbnb` → Airbnb labels + DB `booking_source`
  const bookingSource = bookingSourceFromUrlSearchParams(searchParams);
  const isAirbnb = bookingSource === 'Airbnb';

  /** Snapshot once per mount so RHF defaults match calendar URL (not overwritten by object identity). */
  const seededDefaultsRef = useRef<Partial<GuestFormData> | null>(null);
  if (seededDefaultsRef.current === null) {
    const defaults = getGuestFormDefaultValuesFromSearchParams(searchParams);
    if (isAirbnb) {
      defaults.findUs = 'Airbnb';
    }
    seededDefaultsRef.current = defaults;
  }

  const isDevMode = searchParams.get('dev') === 'true';

  // Get pre-selected dates from URL params (from calendar page)
  const urlCheckInDate = searchParams.get('checkInDate');
  const urlCheckOutDate = searchParams.get('checkOutDate');

  const showDevControls = !isProduction || isDevMode;

  // Dev API action controls — all on by default; uncheck to skip (matches admin dev-control UX).
  const [devApiControls, setDevApiControls] = useState({
    saveToDatabase: true,
    saveImagesToStorage: true,
    updateCalendar: true,
    updateGoogleSheets: true,
    sendEmail: true,
  });

  const guestFormSteps = useMemo(() => getGuestFormSteps(isAirbnb), [isAirbnb]);
  const guestFormStepCount = getGuestFormStepCount(isAirbnb);

  const form = useForm<GuestFormData>({
    resolver: zodResolver(createGuestFormSchema(isAirbnb), undefined, {
      raw: true,
      mode: 'sync',
    }),
    defaultValues: seededDefaultsRef.current ?? defaultFormValues,
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

  // Legacy `?from=airbnb` → `replace` with `?source=airbnb`; any other `from` is dropped only
  useEffect(() => {
    if (!searchParams.has('from')) return;
    const next = stripLegacyFromQueryParam(new URLSearchParams(searchParams));
    if (searchParams.get('from')?.trim().toLowerCase() === 'airbnb') {
      next.set('source', 'airbnb');
    }
    navigate({ pathname: '/form', search: next.toString() }, { replace: true });
  }, [navigate, searchParams]);

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
        // Normalize all date strings to YYYY-MM-DD format
        const normalizedDates = result.data.map((booking: BookedDateRange) => ({
          ...booking,
          checkInDate: normalizeDateString(booking.checkInDate),
          checkOutDate: normalizeDateString(booking.checkOutDate),
        }));
        setBookedDates(normalizedDates);
        console.log(
          '✅ Loaded booked dates:',
          normalizedDates.length,
          'bookings',
        );
        console.log('📅 Booked date ranges:', normalizedDates);
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

  // Set dates from URL params (from calendar page)
  useEffect(() => {
    if (urlCheckInDate && urlCheckOutDate && !bookingId) {
      // Normalize and set the dates from URL
      const normalizedCheckIn = normalizeDateString(urlCheckInDate);
      const normalizedCheckOut = normalizeDateString(urlCheckOutDate);

      if (normalizedCheckIn && normalizedCheckOut) {
        form.setValue('checkInDate', normalizedCheckIn);
        form.setValue('checkOutDate', normalizedCheckOut);
      }
    }
  }, [urlCheckInDate, urlCheckOutDate, bookingId, form]);

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
            formData.primaryGuestName,
          );
          if (paymentReceiptFile) {
            formData.paymentReceipt = paymentReceiptFile;
            setPaymentReceiptPreview(formData.paymentReceiptUrl);
          }
        }

        const loadValidIdAsset = async (
          url: string | undefined,
          field: keyof GuestFormData,
          previewKey: string,
          guestName: string,
        ) => {
          if (!url) return;
          setValidIdImageErrors((prev) => ({ ...prev, [previewKey]: false }));
          const file = await fetchImageAsFile(url, guestName);
          if (file) {
            (formData as Record<string, unknown>)[field] = file;
          }
          setValidIdPreviews((prev) => ({ ...prev, [previewKey]: url }));
        };

        await loadValidIdAsset(
          formData.validIdUrl,
          'validId',
          'validId',
          formData.primaryGuestName,
        );
        await loadValidIdAsset(
          formData.guest2ValidIdUrl,
          'guest2ValidId',
          'guest2ValidId',
          formData.guest2Name || formData.primaryGuestName,
        );
        await loadValidIdAsset(
          formData.guest3ValidIdUrl,
          'guest3ValidId',
          'guest3ValidId',
          formData.guest3Name || formData.primaryGuestName,
        );
        await loadValidIdAsset(
          formData.guest4ValidIdUrl,
          'guest4ValidId',
          'guest4ValidId',
          formData.guest4Name || formData.primaryGuestName,
        );
        await loadValidIdAsset(
          formData.guest5ValidIdUrl,
          'guest5ValidId',
          'guest5ValidId',
          formData.guest5Name || formData.primaryGuestName,
        );

        if (formData.petVaccinationUrl) {
          // Fetch the image and convert it to a File object
          const petVaccinationFile = await fetchImageAsFile(
            formData.petVaccinationUrl,
            formData.primaryGuestName,
          );
          if (petVaccinationFile) {
            formData.petVaccination = petVaccinationFile;
            setPetVaccinationPreview(formData.petVaccinationUrl);
          }
        }

        if (formData.petImageUrl) {
          const petImageFile = await fetchImageAsFile(
            formData.petImageUrl,
            formData.primaryGuestName,
          );
          if (petImageFile) {
            formData.petImage = petImageFile;
            setPetImagePreview(formData.petImageUrl);
          }
        }

        if (formData.petVaccinationDate) {
          formData.petVaccinationDate = normalizeDateString(
            formData.petVaccinationDate,
          );
        } else if (formData.hasPets) {
          formData.petVaccinationDate = getManilaYmdToday();
        }

        // Reset form with the modified data
        form.reset(formData);
        setGuestSectionSeedKey((key) => key + 1);
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

  // Paste booking info from clipboard
  const handlePasteFromClipboard = async () => {
    if (!showDevControls) return;

    try {
      const clipboardText = await navigator.clipboard.readText();
      const parsedData = parseBookingInfoFromClipboard(clipboardText);

      if (!parsedData) {
        toast.error('Invalid clipboard data');
        return;
      }

      // Populate the form with parsed data
      Object.entries(parsedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // @ts-ignore - Dynamic form field setting
          form.setValue(key as keyof GuestFormData, value);
        }
      });

      toast.success('Form filled from clipboard');
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      toast.error('Could not read clipboard');
    }
  };

  // Update file input when generating new data
  const handleGenerateNewData = useCallback(
    async (opts?: { preserveCalendarStayDates?: boolean }) => {
      if (!showDevControls) return;

      try {
        const randomData = await generateRandomData();

        if (opts?.preserveCalendarStayDates) {
          const rawIn = urlCheckInDate;
          const rawOut = urlCheckOutDate;
          if (rawIn && rawOut) {
            const checkInDate = normalizeDateString(rawIn);
            const checkOutDate = normalizeDateString(rawOut);
            if (checkInDate && checkOutDate) {
              randomData.checkInDate = checkInDate;
              randomData.checkOutDate = checkOutDate;
              randomData.numberOfNights = dayjs(checkOutDate).diff(
                dayjs(checkInDate),
                'day',
              );
            }
          }
        }

        form.reset(randomData);
        setGuestSectionSeedKey((key) => key + 1);

        const nextValidIdPreviews: Record<string, string | null> = {};
        for (const field of [
          'validId',
          'guest2ValidId',
          'guest3ValidId',
          'guest4ValidId',
          'guest5ValidId',
        ] as const) {
          const file = randomData[field];
          if (file) {
            nextValidIdPreviews[field] = URL.createObjectURL(file);
          }
        }
        setValidIdPreviews(nextValidIdPreviews);
        setValidIdImageErrors({});

        // Set the dummy files in the file inputs
        if (randomData.paymentReceipt) {
          setDummyFile(fileInputRef, randomData.paymentReceipt);
        }

        if (randomData.petVaccination) {
          setDummyFile(petVaccinationInputRef, randomData.petVaccination);
        }
        if (randomData.petImage) {
          setDummyFile(petImageInputRef, randomData.petImage);
        }
      } catch (error) {
        toast.error('Could not generate sample data');
      }
    },
    [showDevControls, urlCheckInDate, urlCheckOutDate, form.reset],
  );

  // Generate random sample payload on load in dev; calendar URL dates stay on the row above.
  useEffect(() => {
    if (showDevControls && !bookingId && !isLoading) {
      void handleGenerateNewData({ preserveCalendarStayDates: true });
    }
  }, [isLoading, bookingId, showDevControls, handleGenerateNewData]);

  const handleCancelBooking = async () => {
    if (!showDevControls || !bookingId) return;

    // Confirmation dialog
    if (
      !window.confirm(
        '⚠️ Are you sure you want to CANCEL this booking?\n\n' +
          'This will:\n' +
          '• Mark booking status as "Canceled" in database\n' +
          '• Update Google Calendar event with [CANCELED] label (red color)\n' +
          '• Update Google Sheets status to "Canceled"\n' +
          '• Free up the booked dates for new bookings\n\n' +
          'All booking data will be preserved for records.',
      )
    ) {
      return;
    }

    setIsCancellingBooking(true);

    try {
      const response = await fetch(`${apiUrl}/cancel-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ bookingId, confirm: true }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to cancel booking');
      }


      toast.success('Booking cancelled');

      // Refresh booked dates after cancellation
      await fetchBookedDates();

      // Back to calendar; drop bookingId + legacy `from`; keep source=airbnb, dev, dates, etc.
      const next = stripLegacyFromQueryParam(searchParams);
      next.delete('bookingId');
      navigate(next.toString() ? `/?${next.toString()}` : '/', {
        state: { guestEnter: 'back' } satisfies GuestNavState,
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
      toast.error('Could not cancel booking');
    } finally {
      setIsCancellingBooking(false);
    }
  };

  async function onSubmit(values: GuestFormData) {
    setIsSubmitting(true);

    try {
      const transformedValues = transformFieldValues(values, {
        gafUnitOwner: guestFormSettings.gafUnitOwner,
        gafTowerAndUnitNumber: guestFormSettings.gafTowerAndUnitNumber,
        gafGuestsOnsiteContactPerson: guestFormSettings.gafGuestsOnsiteContactPerson,
        gafOwnerContactNumber: guestFormSettings.gafOwnerContactNumber,
      });
      const formData = new FormData();

      // Add the booking ID to form data
      formData.append('bookingId', currentBookingId || '');

      // Add all form values to FormData, excluding file upload fields
      const fileFields = new Set([
        'paymentReceipt',
        'validId',
        'guest2ValidId',
        'guest3ValidId',
        'guest4ValidId',
        'guest5ValidId',
        'petVaccination',
        'petImage',
      ]);

      Object.entries(transformedValues).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          !fileFields.has(key)
        ) {
          formData.append(key, value.toString());
        }
      });

      formData.append('bookingSource', bookingSource);

      const guestFileUploads: Array<{
        prefix: string;
        file: File | null | undefined;
        guestName: string;
        required: boolean;
      }> = [
        {
          prefix: 'paymentReceipt',
          file: values.paymentReceipt,
          guestName: values.primaryGuestName,
          required: !isAirbnb,
        },
        {
          prefix: 'validId',
          file: values.validId,
          guestName: values.primaryGuestName,
          required:
            values.primaryGuestAge != null &&
            values.primaryGuestAge >= 18,
        },
        {
          prefix: 'guest2ValidId',
          file: values.guest2ValidId,
          guestName: values.guest2Name || values.primaryGuestName,
          required:
            values.guest2Age != null && values.guest2Age >= 18,
        },
        {
          prefix: 'guest3ValidId',
          file: values.guest3ValidId,
          guestName: values.guest3Name || values.primaryGuestName,
          required:
            values.guest3Age != null && values.guest3Age >= 18,
        },
        {
          prefix: 'guest4ValidId',
          file: values.guest4ValidId,
          guestName: values.guest4Name || values.primaryGuestName,
          required:
            values.guest4Age != null && values.guest4Age >= 18,
        },
        {
          prefix: 'guest5ValidId',
          file: values.guest5ValidId,
          guestName: values.guest5Name || values.primaryGuestName,
          required:
            values.guest5Age != null && values.guest5Age >= 18,
        },
        {
          prefix: 'petVaccination',
          file: values.petVaccination,
          guestName: values.primaryGuestName,
          required: values.hasPets,
        },
        {
          prefix: 'petImage',
          file: values.petImage,
          guestName: values.primaryGuestName,
          required: values.hasPets,
        },
      ];

      guestFileUploads.forEach(({ prefix, file, guestName, required }) => {
        handleFileUpload(
          formData,
          file,
          prefix,
          guestName,
          values.checkInDate,
          values.checkOutDate,
          required,
        );
      });

      // Build URL with query parameters
      const queryParams = new URLSearchParams();

      if (showDevControls) {
        queryParams.append(
          'saveToDatabase',
          devApiControls.saveToDatabase ? 'true' : 'false',
        );
        queryParams.append(
          'saveImagesToStorage',
          devApiControls.saveImagesToStorage ? 'true' : 'false',
        );
        queryParams.append(
          'updateGoogleCalendar',
          devApiControls.updateCalendar ? 'true' : 'false',
        );
        queryParams.append(
          'updateGoogleSheets',
          devApiControls.updateGoogleSheets ? 'true' : 'false',
        );
        queryParams.append(
          'sendEmail',
          devApiControls.sendEmail ? 'true' : 'false',
        );
      } else {
        queryParams.append('saveToDatabase', 'true');
        queryParams.append('saveImagesToStorage', 'true');
        queryParams.append('updateGoogleCalendar', 'true');
        queryParams.append('updateGoogleSheets', 'true');
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
              errorData,
            )}`,
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
          state: { bookingData, guestEnter: 'success' } satisfies GuestNavState & {
            bookingData: typeof bookingData;
          },
        });
        return;
      }

      // Reset form and redirect to success page
      // Only reset form in normal production mode (not dev controls)
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
        state: { bookingData, guestEnter: 'success' } satisfies GuestNavState & {
          bookingData: typeof bookingData;
        },
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
            currentBookingId,
          );
          await navigator.clipboard.writeText(bookingInfo);

          // Dismiss all existing toasts (including the error toast) before showing success
          toast.dismiss();

          toast.success('Booking info copied');
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);

          // Dismiss all existing toasts before showing the new error
          toast.dismiss();

          toast.error('Could not copy to clipboard');
        }
      };

      // Check if it's a booking overlap error
      if (
        errorMessage.includes('BOOKING_OVERLAP') ||
        errorMessage.includes('already booked')
      ) {
        // Show prominent warning toast for booking overlap
        toast.error('Those dates are already booked', {
          id: 'booking-error',
          duration: 7000,
        });
      } else {
        // Show regular error toast for other errors
        const cleanedMessage = errorMessage
          .replace('Error: ', '')
          .replace('BOOKING_OVERLAP: ', '');

        toast.error('Could not submit form', {
          id: 'submission-error',
          description: (
            <div className="space-y-3 text-foreground">
              <p className="text-sm font-semibold leading-relaxed text-foreground">
                {cleanedMessage}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isAirbnb
                  ? 'Copy your form below and share with your host so we can help. Sorry!'
                  : 'Copy your form below and paste on Facebook Messenger so we can help. Sorry!'}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-10 min-h-[44px] w-full bg-card text-foreground hover:bg-muted"
                onClick={handleCopyBookingInfo}
              >
                Copy Booking Information
              </Button>
            </div>
          ),
          duration: 7000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const watchedValues = useWatch({ control: form.control });

  // Keep adults/children counts in sync with per-guest ages for downstream consumers.
  useEffect(() => {
    const counts = computeGuestCountsByAge([
      { age: form.getValues('primaryGuestAge') },
      { age: form.getValues('guest2Age') },
      { age: form.getValues('guest3Age') },
      { age: form.getValues('guest4Age') },
      { age: form.getValues('guest5Age') },
    ]);
    form.setValue('numberOfAdults', Math.max(counts.adults, 1));
    form.setValue('numberOfChildren', counts.children);
  }, [
    watchedValues?.primaryGuestName,
    watchedValues?.primaryGuestAge,
    watchedValues?.guest2Name,
    watchedValues?.guest2Age,
    watchedValues?.guest3Name,
    watchedValues?.guest3Age,
    watchedValues?.guest4Name,
    watchedValues?.guest4Age,
    watchedValues?.guest5Name,
    watchedValues?.guest5Age,
    form,
  ]);

  // Handle "Same as Facebook/Airbnb Name" checkbox
  useEffect(() => {
    if (sameAsFacebookName) {
      const facebookName = form.getValues('guestFacebookName');
      form.setValue('primaryGuestName', sameAsFacebookName ? facebookName : '');
    }
  }, [sameAsFacebookName, form.watch('guestFacebookName')]);

  const canProceed = useMemo(
    () => isGuestFormStepComplete(currentStep, form.getValues(), isAirbnb),
    [currentStep, watchedValues, form, isAirbnb],
  );

  const handleNextStep = async () => {
    if (!canProceed) {
      const values = form.getValues();
      const fields = getFieldsForGuestFormStep(currentStep, values);
      await form.trigger(fields);
      toast.error('Please complete all required fields before continuing.');
      return;
    }
    setCurrentStep((step) => clampGuestFormStep(step + 1, isAirbnb));
  };

  const handleBackStep = () => {
    setCurrentStep((step) => clampGuestFormStep(step - 1, isAirbnb));
  };

  useEffect(() => {
    stepPanelRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== guestFormStepCount) {
      setSubmitReady(false);
      return;
    }
    setSubmitReady(false);
    const timer = window.setTimeout(() => setSubmitReady(true), 400);
    return () => window.clearTimeout(timer);
  }, [currentStep]);

  const handleSubmitGuestForm = () => {
    if (!submitReady || isSubmitting || !canProceed) return;
    void form.handleSubmit(onSubmit)();
  };

  const activeStepConfig = guestFormSteps[currentStep - 1];
  const StepIcon = activeStepConfig.icon;

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (currentStep < guestFormStepCount) {
            if (canProceed) void handleNextStep();
          }
        }}
        className="relative space-y-6 p-4 sm:p-6 lg:p-8 guest-inner-enter"
      >
        {isLoading ? (
          <GuestFormPageSkeleton />
        ) : invalidBookingId ? (
          <div className="flex flex-col justify-center items-center py-20 space-y-4">
            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold text-destructive">
                Booking Not Found
              </h2>
              <p className="max-w-md text-muted-foreground">
                Invalid booking link or no form data. Screenshot this and
                contact us {isAirbnb ? 'on Airbnb' : 'on Facebook'}.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setInvalidBookingId(false);
                  const next = stripLegacyFromQueryParam(searchParams);
                  next.delete('bookingId');
                  navigate(next.toString() ? `/?${next.toString()}` : '/', {
                    replace: true,
                    state: { guestEnter: 'back' } satisfies GuestNavState,
                  });
                }}
                className="mt-4"
              >
                Return to calendar
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
          <div className="space-y-6">
            <KameFormBrandHeader />
            <GuestFormStepper activeStep={currentStep} steps={guestFormSteps} />

            <div
              ref={stepPanelRef}
              id="guest-form-step-panel"
              tabIndex={-1}
              className="space-y-5 rounded-xl border border-border/80 bg-card px-4 py-5 shadow-sm outline-none sm:px-6 sm:py-6"
              aria-labelledby="guest-form-step-heading"
            >
              <header className="flex items-center gap-3 border-b border-separator pb-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <StepIcon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2
                    id="guest-form-step-heading"
                    className="text-base font-bold text-foreground sm:text-lg"
                  >
                    {activeStepConfig.label}
                  </h2>
                </div>
              </header>

            {currentStep === 1 && (
            <div className="space-y-4">

              <FormField
                control={form.control}
                name="guestFacebookName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isAirbnb ? 'Airbnb Name' : 'Facebook Name'}{' '}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`Your exact full name in ${isAirbnb ? 'Airbnb' : 'Facebook'}`}
                        {...field}
                        onChange={(e) =>
                          handleNameInputChange(
                            e,
                            field.onChange,
                            toCapitalCase,
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
                        Use an email you can access. Your GAF will be sent
                        there for Azure check-in.
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
            )}

            {currentStep === 2 && (
            <div className="space-y-4">

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
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
                                getNextDay(dateStr),
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
                              currentBookingId,
                            )(date);
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
                  name="checkInTime"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
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
                    className="rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/30 dark:bg-blue-500/10"
                    role="alert"
                  >
                    <p className="text-sm font-medium">
                      Check-in is 2:00 PM. Early arrival needs approval and may
                      cost extra.{' '}
                      {isAirbnb
                        ? 'Message host via Airbnb.'
                        : 'Message us on Facebook.'}
                    </p>
                  </div>
                )}

              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:[&>*]:min-w-0">
                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
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
                              currentBookingId,
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
                                  getNextDay(form.watch('checkInDate')),
                                )
                              : new Date()
                          }
                          placeholder={DATE_PICKER_DISPLAY_FORMAT}
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
                    <FormItem className="min-w-0">
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
                    className="rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/30 dark:bg-blue-500/10"
                    role="alert"
                  >
                    <p className="text-sm font-medium">
                      Check-out is 11:00 AM. Late departure needs approval and
                      may cost extra.{' '}
                      {isAirbnb
                        ? 'Contact host via Airbnb.'
                        : 'Contact us on Facebook.'}
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

              <GuestFormGuestsSection
                form={form}
                isAirbnb={isAirbnb}
                sameAsFacebookName={sameAsFacebookName}
                onSameAsFacebookNameChange={setSameAsFacebookName}
                validIdPreviews={validIdPreviews}
                validIdImageErrors={validIdImageErrors}
                seedKey={guestSectionSeedKey}
                onValidIdPreviewChange={(field, preview) =>
                  setValidIdPreviews((prev) => ({ ...prev, [field]: preview }))
                }
                onValidIdImageErrorChange={(field, hasError) =>
                  setValidIdImageErrors((prev) => ({
                    ...prev,
                    [field]: hasError,
                  }))
                }
              />

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

              <FormField
                control={form.control}
                name="guestRequestsSurpriseDecor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Has surprise decor / room setup?</FormLabel>
                    <div className="flex items-start gap-3 min-h-[44px]">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="mt-1 w-4 h-4 shrink-0"
                          aria-describedby="surprise-decor-hint"
                        />
                      </FormControl>
                      <div className="min-w-0 flex-1 space-y-2">
                        <FormLabel className="!mt-0 text-sm font-medium leading-snug cursor-pointer">
                          <span className="inline-flex items-center gap-1.5">
                            Yes, I requested a surprise decor / room setup
                            <PartyPopper
                              className="size-4 shrink-0 text-violet-600"
                              aria-hidden
                            />
                          </span>
                        </FormLabel>
                        {field.value ? (
                          <div
                            id="surprise-decor-hint"
                            className="rounded-lg border-2 border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/30 dark:bg-blue-500/10"
                            role="status"
                          >
                            <p className="text-sm text-foreground leading-relaxed">
                              You confirm you messaged us on{' '}
                              <span className="font-semibold">
                                {isAirbnb ? 'Airbnb' : 'Facebook'}
                              </span>{' '}
                              and agreed on theme and price before your stay.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            )}

            {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Do you need paid parking?
                </p>
                <div className="flex flex-col gap-2">
                  <GuestFormOptionCard
                    selected={!form.watch('needParking')}
                    onSelect={() => form.setValue('needParking', false)}
                    title="No paid parking needed"
                    description="No slot: tower drop-off only. Free parking outside Azure by Home Depot (3–5 min walk)."
                  />
                  <GuestFormOptionCard
                    selected={form.watch('needParking')}
                    onSelect={() => form.setValue('needParking', true)}
                    title="Yes, reserve paid parking"
                    description="₱400 per night inside Azure North residence and is subject to availability."
                  />
                </div>
              </div>

              {form.watch('needParking') && (
                <div className="space-y-4 pt-5">
                  <FormField
                    control={form.control}
                    name="carPlateNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Car Plate Number{' '}
                          <span className="text-destructive">*</span>
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
                          <span className="text-destructive">*</span>
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
                          <span className="text-destructive">*</span>
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

                  <GuestFormParkingDates form={form} />
                </div>
              )}
            </div>
            )}

            {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Will a pet join your stay?
                </p>
                <div className="flex flex-col gap-2">
                  <GuestFormOptionCard
                    selected={!form.watch('hasPets')}
                    onSelect={() => form.setValue('hasPets', false)}
                    title="No pets on this stay"
                  />
                  <GuestFormOptionCard
                    selected={form.watch('hasPets')}
                    onSelect={() => {
                      form.setValue('hasPets', true);
                      if (!form.getValues('petVaccinationDate')?.trim()) {
                        form.setValue('petVaccinationDate', getManilaYmdToday());
                      }
                    }}
                    title="Yes, I'm bringing a pet"
                  />
                </div>
              </div>

              {form.watch('hasPets') && (
                <div className="space-y-5">
                  <GuestFormInfoCallout title="🐶 Azure North Pet Policy">
                    <ul className="list-disc list-inside space-y-2">
                      <li>Only one toy/small dog is allowed. <span className="font-semibold text-foreground">Pet fee: P300</span></li>
                      <li>Use the service elevator only. Keep pets leashed outside the unit.</li>
                      <li>Azure North requires complete pet details and vaccination records for PMO approval.</li>
                      <li>No pets allowed in: Main Lobby, Viewing Deck, Common/Amenity Areas, Roof Deck</li>
                    </ul>
                  </GuestFormInfoCallout>

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
                          <IsoDateInput
                            {...field}
                            className="h-11 rounded-xl border-border/50 bg-muted/40 focus-within:border-primary/40 focus-within:bg-background focus-within:ring-ring/30"
                          />
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
                          <div className="guest-image-upload-dropzone group">
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
                                  <label className="guest-image-upload-replace">
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
                                            URL.createObjectURL(file),
                                          );
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </>
                            ) : (
                              <div className="flex absolute inset-0 justify-center items-center">
                                <label className="guest-image-upload-trigger">
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
                                          URL.createObjectURL(file),
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
                          <div className="guest-image-upload-dropzone group">
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
                                  <label className="guest-image-upload-replace">
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
                                            URL.createObjectURL(file),
                                          );
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </>
                            ) : (
                              <div className="flex absolute inset-0 justify-center items-center">
                                <label className="guest-image-upload-trigger">
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
                                          URL.createObjectURL(file),
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
            )}

            {currentStep === 5 && !isAirbnb && (
            <div className="space-y-4">

              <GuestFormPaymentStepContent form={form} />

              <FormField
                control={form.control}
                name="paymentReceipt"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      Downpayment receipt{' '}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="guest-image-upload-dropzone group">
                        {paymentReceiptPreview || value ? (
                          <>
                            <img
                              src={
                                paymentReceiptPreview ||
                                (value && URL.createObjectURL(value))
                              }
                              alt="Downpayment receipt preview"
                              className="object-cover w-full h-full"
                            />
                            <div className="flex absolute inset-0 justify-center items-center opacity-0 transition-opacity bg-black/50 group-hover:opacity-100">
                              <label className="guest-image-upload-replace">
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
                                        URL.createObjectURL(file),
                                      );
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </>
                        ) : (
                          <div className="flex absolute inset-0 justify-center items-center">
                            <label className="guest-image-upload-trigger">
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
                                      URL.createObjectURL(file),
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

            {/* Developer API Controls (non-production or ?dev=true) — shown on the last step */}
            {showDevControls && currentStep === guestFormStepCount && (
              <div className="space-y-4 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-4">
                <div className="flex items-center gap-3 border-b border-separator pb-3">
                  <Settings className="size-5 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold text-foreground">
                    Developer controls
                  </h3>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Control which actions run upon form submission.
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
                        title="New Booking Request email to owners (EMAIL_REPLY_TO)"
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        Send email
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
                        onClick={() => void handleGenerateNewData()}
                        className="w-full"
                      >
                        Generate New Data
                      </Button>
                      <p className="mt-2 text-xs text-center text-muted-foreground">
                        Populate form with random sample data
                      </p>
                    </div>
                  )}

                  {/* Cancel Booking Button - Only show when viewing an existing booking */}
                  {bookingId && (
                    <div className="pt-4 border-t">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleCancelBooking}
                        disabled={isCancellingBooking}
                        className="w-full"
                      >
                        {isCancellingBooking ? (
                          <>
                            <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                            Cancelling booking...
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 w-4 h-4" />
                            Cancel This Booking
                          </>
                        )}
                      </Button>
                      <p className="mt-2 text-xs text-center text-muted-foreground">
                        Cancels the booking and frees dates. Data stays on
                        file.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <GuestFormStepNavigation
              currentStep={currentStep}
              stepCount={guestFormStepCount}
              isSubmitting={isSubmitting}
              canProceed={canProceed}
              submitReady={submitReady}
              onBack={handleBackStep}
              onNext={handleNextStep}
              onSubmit={handleSubmitGuestForm}
            />
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
