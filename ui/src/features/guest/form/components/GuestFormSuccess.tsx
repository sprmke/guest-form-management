import { useEffect } from 'react';

import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import dayjs from 'dayjs';
import { Users, User, PawPrint, Mail, Phone, Info } from 'lucide-react';

import { useGuestPaymentInfo } from '@/features/guest/form/hooks/useGuestPaymentInfo';
import { useGuestPropertySlug } from '@/features/guest/hooks/useGuestPropertySlug';
import { guestCalendarPath } from '@/features/guest/lib/guestPublicPaths';

import { formatDateToLongFormat, formatTimeToAMPM } from '@/utils/format/dates';

interface BookingData {
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  checkOutTime: string;
  numberOfAdults: number;
  numberOfChildren: number;
  primaryGuestName: string;
  guest2Name?: string;
  guest3Name?: string;
  guest4Name?: string;
  guest5Name?: string;
  hasPets: boolean;
  petName?: string;
  needParking: boolean;
  guestEmail: string;
  guestPhoneNumber: string;
}

export function GuestFormSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const propertySlug = useGuestPropertySlug();
  const bookingId = searchParams.get('bookingId');
  const bookingData = location.state?.bookingData as BookingData | undefined;
  const { data: guestBrand } = useGuestPaymentInfo();
  const brandLogo = guestBrand?.emailLogoUrl;

  // Redirect to root if no booking ID
  useEffect(() => {
    if (!bookingId) {
      navigate(propertySlug ? guestCalendarPath(propertySlug) : '/properties', { replace: true });
    }
  }, [bookingId, navigate, propertySlug]);

  // Calculate number of nights
  const numberOfNights = bookingData
    ? Math.ceil(
        (dayjs(bookingData.checkOutDate).valueOf() - dayjs(bookingData.checkInDate).valueOf()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  // Get all guest names
  const guestNames = bookingData
    ? [
        bookingData.primaryGuestName,
        bookingData.guest2Name,
        bookingData.guest3Name,
        bookingData.guest4Name,
        bookingData.guest5Name,
      ].filter(Boolean)
    : [];

  const totalGuests = bookingData ? bookingData.numberOfAdults + bookingData.numberOfChildren : 0;

  return (
    <div className="guest-inner-enter relative flex flex-col items-center justify-center px-5 pb-10 pt-14 text-center">
      <div className="absolute left-0 right-0 top-[-3.25rem] mx-auto flex justify-center md:top-[-4.25rem]">
        <div className="bg-card shadow-elevated ring-card rounded-full p-1 ring-4">
          <img
            src={brandLogo?.trim() || '/images/logo.png'}
            alt="Kame Home"
            className="h-[88px] w-[88px] rounded-full object-cover md:h-[120px] md:w-[120px]"
          />
        </div>
      </div>

      <div className="w-full max-w-xl space-y-8">
        <div className="space-y-3">
          <p className="section-eyebrow">Booking submitted</p>
          <div className="space-y-1">
            <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
              Booking Confirmed!
            </h1>
            <p className="text-muted-foreground text-base">
              Thank you for booking with us, <strong className="text-primary">Ka-Homies!</strong>
            </p>
          </div>
        </div>

        {bookingData && (
          <div className="space-y-6">
            {/* Booking Summary Card */}
            <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
              <div className="border-separator border-b px-6 py-3">
                <h2 className="text-foreground text-lg font-semibold">Booking Summary</h2>
              </div>

              <div className="space-y-6 p-6 text-left">
                {/* Total Nights Badge */}
                <div className="flex justify-center">
                  <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-4 py-2">
                    <span className="text-3xl font-bold">{numberOfNights}</span>
                    <span className="font-medium">{numberOfNights === 1 ? 'Night' : 'Nights'}</span>
                  </div>
                </div>

                {/* Check-in and Check-out Dates - Side by Side on Desktop */}
                <div className="grid gap-4">
                  <div className="border-border bg-muted/50 flex justify-between rounded-lg border p-3">
                    <div className="border-border flex-1 border-r px-3">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <p className="text-xs font-medium uppercase">Check-in</p>
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-bold">
                          {formatDateToLongFormat(bookingData.checkInDate)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatTimeToAMPM(bookingData.checkInTime, true)}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 px-3">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <p className="text-xs font-medium uppercase">Check-out</p>
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-bold">
                          {formatDateToLongFormat(bookingData.checkOutDate)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatTimeToAMPM(bookingData.checkOutTime, false)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 border-t pt-6">
                  {/* Number of Guests */}
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Users className="text-primary h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                        Guests
                      </p>
                      <p className="text-foreground font-bold">
                        {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {bookingData.numberOfAdults}{' '}
                        {bookingData.numberOfAdults === 1 ? 'Adult' : 'Adults'}
                        {bookingData.numberOfChildren > 0 &&
                          ` • ${bookingData.numberOfChildren} ${
                            bookingData.numberOfChildren === 1 ? 'Child' : 'Children'
                          }`}
                      </p>
                    </div>
                  </div>

                  {/* Guest Names */}
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <User className="text-primary h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
                        Guest Names
                      </p>
                      <div className="space-y-1.5">
                        {guestNames.map((name, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className={`bg-muted-foreground h-1.5 w-1.5 rounded-full`} />
                            <p
                              className={`text-base ${
                                index === 0 ? 'text-foreground font-bold' : 'text-foreground'
                              }`}
                            >
                              {name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4 border-t pt-5">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <Mail className="text-primary h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                          Email
                        </p>
                        <p className="text-foreground break-all text-sm">
                          {bookingData.guestEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <Phone className="text-primary h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                          Phone
                        </p>
                        <p className="text-foreground text-sm">{bookingData.guestPhoneNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pet Information */}
                  {bookingData.hasPets && bookingData.petName && (
                    <div className="border-t pt-5">
                      <div className="flex items-start gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                        <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/40">
                          <PawPrint className="h-5 w-5 text-amber-700 dark:text-amber-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs font-medium uppercase text-amber-700 dark:text-amber-500">
                            Bringing Pet
                          </p>
                          <p className="text-base font-bold text-amber-900 dark:text-amber-400">
                            {bookingData.petName}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps Info Box */}
        <div className="border-primary/25 bg-primary/5 dark:border-primary/30 dark:bg-primary/10 overflow-hidden rounded-xl border shadow-sm">
          <div className="flex-1 space-y-2 p-5 text-left">
            <div className="flex items-center space-x-2">
              <div className="bg-primary/15 dark:bg-primary/20 flex-shrink-0 rounded-lg p-1">
                <Info className="text-primary dark:text-primary h-4 w-4" />
              </div>
              <h3 className="text-primary dark:text-primary text-base font-semibold">Next Steps</h3>
            </div>
            <div className="text-foreground dark:text-foreground space-y-2 text-sm leading-relaxed">
              <p>
                We will now review your booking request. Please wait for our booking acknowledgment
                email. Once confirmed, we will forward your Guest Advice Form (GAF) to the property
                administration (Azure) for approval.
              </p>
              <p>
                <span className="font-semibold">
                  Kindly return to our conversation on Facebook Messenger / Airbnb
                </span>{' '}
                to review our policies and important reminders, or if you need to update your
                booking details.
              </p>
              <p className="pt-1 font-medium">
                See you soon, <span className="font-semibold">Ka-Homies</span>! 🐢💚
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
