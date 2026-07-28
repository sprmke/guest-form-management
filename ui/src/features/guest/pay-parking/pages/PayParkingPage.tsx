import { useEffect, useMemo, useState } from 'react';

import { Link, useParams, useSearchParams } from 'react-router-dom';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { PayParkingOwnerEmailDialog } from '@/features/guest/pay-parking/components/PayParkingOwnerEmailDialog';
import {
  PayParkingIntro,
  PayParkingLastMinuteWarning,
  PayParkingRateCard,
  PayParkingVehicleSection,
} from '@/features/guest/pay-parking/components/PayParkingSections';
import { PayParkingUpdateBroadcastDialog } from '@/features/guest/pay-parking/components/PayParkingUpdateBroadcastDialog';
import { fetchPayParking, submitPayParking } from '@/features/guest/pay-parking/lib/api';
import { isLastMinutePayParkingRequest } from '@/features/guest/pay-parking/lib/payParkingHelpers';
import { payParkingVehicleSchema } from '@/features/guest/pay-parking/lib/payParkingSchema';
import type { PayParkingVehicleValues } from '@/features/guest/pay-parking/lib/payParkingSchema';

import { KameFormBrandHeader } from '@/components/branding/KameFormBrandHeader';
import { PayParkingPageSkeleton } from '@/components/skeletons/GuestPageSkeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';
import { toCapitalCase } from '@/utils/text/formatters';

const PAY_PARKING_BRAND_TITLE = 'Pay Parking Form';

const PAY_PARKING_SHELL = 'relative space-y-6 p-4 sm:p-6 lg:p-8';

export function PayParkingPage() {
  const { bookingId: routeBookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const bookingId = (routeBookingId ?? searchParams.get('bookingId') ?? '').trim();

  const isAdminMode = searchParams.get('admin') === 'true';

  const [carPlateNumber, setCarPlateNumber] = useState('');
  const [carBrandModel, setCarBrandModel] = useState('');
  const [carColor, setCarColor] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedBroadcastSent, setSubmittedBroadcastSent] = useState(true);
  const [submittedOwnerEmail, setSubmittedOwnerEmail] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [ownerEmailDialogOpen, setOwnerEmailDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<PayParkingVehicleValues | null>(null);
  const [touched, setTouched] = useState({
    carPlateNumber: false,
    carBrandModel: false,
    carColor: false,
  });

  const query = useQuery({
    queryKey: ['pay-parking', bookingId],
    queryFn: () => fetchPayParking(bookingId),
    enabled: bookingId.length > 0,
    retry: false,
  });

  useEffect(() => {
    const d = query.data;
    if (!d) return;
    setCarPlateNumber(d.car_plate_number ?? '');
    setCarBrandModel(d.car_brand_model ?? '');
    setCarColor(d.car_color ?? '');
  }, [query.data]);

  const submitMut = useMutation({
    mutationFn: async (input: {
      values: PayParkingVehicleValues;
      sendParkingBroadcast: boolean;
      parkingOwnerEmail?: string;
    }) => {
      return submitPayParking(bookingId, input.values, {
        sendParkingBroadcast: input.sendParkingBroadcast,
        parkingOwnerEmail: input.parkingOwnerEmail,
      });
    },
    onSuccess: (result) => {
      setSubmittedBroadcastSent(result.broadcastSent);
      setSubmittedOwnerEmail(result.sentToOwnerEmail);
      setSubmitted(true);
      setUpdateDialogOpen(false);
      setOwnerEmailDialogOpen(false);
      setPendingSubmit(null);
    },
    onError: (err: Error) => {
      toast.error(friendlyToastError(err, 'Could not submit'));
    },
  });

  function runSubmit(
    values: PayParkingVehicleValues,
    options: {
      sendParkingBroadcast: boolean;
      parkingOwnerEmail?: string;
    }
  ) {
    submitMut.mutate({
      values,
      sendParkingBroadcast: options.sendParkingBroadcast,
      parkingOwnerEmail: options.parkingOwnerEmail,
    });
  }

  function handleFormSubmit(values: PayParkingVehicleValues) {
    if (isAdminMode) {
      setPendingSubmit(values);
      setUpdateDialogOpen(true);
      return;
    }
    runSubmit(values, { sendParkingBroadcast: true });
  }

  const validation = useMemo(() => {
    const r = payParkingVehicleSchema.safeParse({
      carPlateNumber,
      carBrandModel,
      carColor,
    });
    if (r.success) return { canSubmit: true, errors: {} as Record<string, string> };
    const errors: Record<string, string> = {};
    for (const iss of r.error.issues) {
      const k = iss.path[0];
      if (typeof k === 'string' && !errors[k]) errors[k] = iss.message;
    }
    return { canSubmit: false, errors };
  }, [carPlateNumber, carBrandModel, carColor]);

  const showError = (field: keyof typeof touched) =>
    touched[field] && Boolean(validation.errors[field]);

  if (!bookingId) {
    return (
      <div className={cn(PAY_PARKING_SHELL, 'text-center')}>
        <KameFormBrandHeader title={PAY_PARKING_BRAND_TITLE} />
        <div className="space-y-3">
          <h1 className="text-foreground text-base font-bold">Missing booking link</h1>
          <p className="text-muted-foreground text-sm">
            Use the link your host sent, or contact us on Facebook for help.
          </p>
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (query.isLoading) {
    return <PayParkingPageSkeleton title={PAY_PARKING_BRAND_TITLE} />;
  }

  if (query.isError || !query.data) {
    return (
      <div className={cn(PAY_PARKING_SHELL, 'text-center')}>
        <KameFormBrandHeader title={PAY_PARKING_BRAND_TITLE} />
        <div className="space-y-3">
          <h1 className="text-foreground text-base font-bold">Form not available</h1>
          <p className="text-muted-foreground text-sm">
            {(query.error as Error)?.message ??
              'This form is not available. Please contact your host if you need help.'}
          </p>
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const data = query.data;
  const brandLogo = data.email_logo_url;
  const emailChoiceVariant = data.already_submitted ? 'update' : 'submit';
  const showLastMinuteParkingWarning = isLastMinutePayParkingRequest(data.parking_check_in_date);

  if (submitted) {
    return (
      <div className={cn(PAY_PARKING_SHELL, 'text-center')}>
        <KameFormBrandHeader title={PAY_PARKING_BRAND_TITLE} logoSrc={brandLogo} />
        <div className="mx-auto flex w-4/6 flex-col items-center gap-5">
          <div className="bg-primary/15 text-primary flex size-14 shrink-0 items-center justify-center rounded-full">
            <Check className="size-7" strokeWidth={2.5} aria-hidden />
          </div>
          <div className="space-y-3 px-3 sm:px-0">
            <h1 className="text-foreground text-base font-bold sm:text-lg">
              {isAdminMode && submittedOwnerEmail
                ? 'Parking details updated'
                : isAdminMode && !submittedBroadcastSent
                  ? 'Parking details updated'
                  : 'Parking request sent'}
            </h1>
            <p className="text-xl leading-relaxed sm:text-2xl">
              Thank you, <strong>{data.primary_guest_name}</strong>
            </p>
            {submittedOwnerEmail ? (
              <p className="text-muted-foreground">
                Vehicle details were saved and sent to <strong>{submittedOwnerEmail}</strong>.
              </p>
            ) : submittedBroadcastSent ? (
              <p className="text-muted-foreground">
                We shared your vehicle details with parking owners. We&apos;ll send parking info to
                you shortly.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Vehicle details saved. No parking broadcast email was sent.
              </p>
            )}
            {showLastMinuteParkingWarning ? <PayParkingLastMinuteWarning /> : null}
          </div>
          <Button asChild className="mt-3 min-h-[44px] w-full min-w-[44px] sm:w-auto">
            {isAdminMode && <Link to={`/bookings/${bookingId}`}>Back to booking</Link>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={PAY_PARKING_SHELL}>
      <KameFormBrandHeader title={PAY_PARKING_BRAND_TITLE} logoSrc={brandLogo} />

      <PayParkingIntro data={data} />
      <PayParkingRateCard data={data} />

      <PayParkingVehicleSection>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched({
              carPlateNumber: true,
              carBrandModel: true,
              carColor: true,
            });
            if (!validation.canSubmit) return;
            const parsed = payParkingVehicleSchema.parse({
              carPlateNumber,
              carBrandModel,
              carColor,
            });
            handleFormSubmit(parsed);
          }}
        >
          <Field
            id="pp-plate"
            label="Car plate number"
            required
            error={showError('carPlateNumber') ? validation.errors.carPlateNumber : undefined}
          >
            <Input
              id="pp-plate"
              value={carPlateNumber}
              onChange={(e) => {
                setTouched((t) => ({ ...t, carPlateNumber: true }));
                setCarPlateNumber(e.target.value.toUpperCase());
              }}
              onBlur={() => setTouched((t) => ({ ...t, carPlateNumber: true }))}
              className={inputClass(showError('carPlateNumber'))}
              placeholder="Ex. ABC123"
              autoComplete="off"
              aria-invalid={showError('carPlateNumber')}
            />
          </Field>

          <Field
            id="pp-brand"
            label="Car brand & model"
            required
            error={showError('carBrandModel') ? validation.errors.carBrandModel : undefined}
          >
            <Input
              id="pp-brand"
              value={carBrandModel}
              onChange={(e) => {
                setTouched((t) => ({ ...t, carBrandModel: true }));
                setCarBrandModel(toCapitalCase(e.target.value));
              }}
              onBlur={() => setTouched((t) => ({ ...t, carBrandModel: true }))}
              className={inputClass(showError('carBrandModel'))}
              placeholder="Ex. Honda Civic"
              autoComplete="off"
              aria-invalid={showError('carBrandModel')}
            />
          </Field>

          <Field
            id="pp-color"
            label="Car color"
            required
            error={showError('carColor') ? validation.errors.carColor : undefined}
          >
            <Input
              id="pp-color"
              value={carColor}
              onChange={(e) => {
                setTouched((t) => ({ ...t, carColor: true }));
                setCarColor(toCapitalCase(e.target.value));
              }}
              onBlur={() => setTouched((t) => ({ ...t, carColor: true }))}
              className={inputClass(showError('carColor'))}
              placeholder="Ex. Red"
              autoComplete="off"
              aria-invalid={showError('carColor')}
            />
          </Field>

          <Button
            type="submit"
            className="min-h-[44px] w-full text-base font-semibold shadow-sm"
            disabled={submitMut.isPending || !validation.canSubmit}
          >
            {submitMut.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Submitting…
              </>
            ) : data.already_submitted ? (
              'Update parking details'
            ) : (
              'Submit parking request'
            )}
          </Button>
        </form>
      </PayParkingVehicleSection>

      <PayParkingUpdateBroadcastDialog
        open={updateDialogOpen}
        pending={submitMut.isPending}
        variant={emailChoiceVariant}
        onOpenChange={(open) => {
          if (submitMut.isPending) return;
          setUpdateDialogOpen(open);
          if (!open) setPendingSubmit(null);
        }}
        onSaveWithBroadcast={() => {
          if (!pendingSubmit) return;
          runSubmit(pendingSubmit, { sendParkingBroadcast: true });
        }}
        onSaveWithOwnerEmail={() => {
          setUpdateDialogOpen(false);
          setOwnerEmailDialogOpen(true);
        }}
        onSaveOnly={() => {
          if (!pendingSubmit) return;
          runSubmit(pendingSubmit, { sendParkingBroadcast: false });
        }}
      />

      <PayParkingOwnerEmailDialog
        open={ownerEmailDialogOpen}
        pending={submitMut.isPending}
        submitLabel={emailChoiceVariant === 'submit' ? 'Save & send email' : 'Update & send email'}
        onOpenChange={(open) => {
          if (submitMut.isPending) return;
          setOwnerEmailDialogOpen(open);
          if (!open && pendingSubmit) {
            setUpdateDialogOpen(true);
          }
        }}
        onSubmit={(email) => {
          if (!pendingSubmit) return;
          runSubmit(pendingSubmit, {
            sendParkingBroadcast: false,
            parkingOwnerEmail: email,
          });
        }}
        onGoBack={() => {
          setOwnerEmailDialogOpen(false);
          setUpdateDialogOpen(true);
        }}
      />
    </div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground text-sm font-normal">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    hasError &&
      'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
  );
}
