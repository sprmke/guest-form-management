import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { formatDateToLongFormat, formatTimeToAMPM } from '@/utils/dates';
import {
  CalendarDays,
  Users,
  User,
  PawPrint,
  Mail,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import dayjs from 'dayjs';

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
  const bookingId = searchParams.get('bookingId');
  const bookingData = location.state?.bookingData as BookingData | undefined;

  const handleViewForm = () => {
    if (bookingId) {
      navigate(`/?bookingId=${bookingId}`);
    }
  };

  // Calculate number of nights
  const numberOfNights = bookingData
    ? Math.ceil(
        (dayjs(bookingData.checkOutDate).valueOf() -
          dayjs(bookingData.checkInDate).valueOf()) /
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

  const totalGuests = bookingData
    ? bookingData.numberOfAdults + bookingData.numberOfChildren
    : 0;

  return (
    <div className="flex flex-col justify-center items-center px-5 pt-14 pb-10 space-y-8 text-center">
      <img
        src="/images/logo.png"
        alt="Kame Home"
        className="absolute top-[-3.5rem] md:top-[-4.5rem] right-0 left-0 mx-auto w-[120px] md:w-[160px] border-4 border-white rounded-full"
      />

      <div className="space-y-8 w-full max-w-xl">
        {/* Success Header */}
        <div className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold md:text-3xl text-foreground">
              Booking Confirmed!
            </h1>
            <p className="text-base text-muted-foreground">
              Thank you for booking with us,{' '}
              <strong className="text-primary">Ka-Homies!</strong>
            </p>
          </div>
        </div>

        {bookingData && (
          <div className="space-y-6">
            {/* Booking Summary Card */}
            <div className="overflow-hidden rounded-xl border shadow-sm border-border bg-card">
              <div className="px-6 py-3 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Booking Summary
                </h2>
              </div>

              <div className="p-6 space-y-6 text-left">
                {/* Total Nights Badge */}
                <div className="flex justify-center">
                  <div className="inline-flex gap-2 items-center px-4 py-2 rounded-full bg-primary/10 text-primary">
                    <span className="text-3xl font-bold">{numberOfNights}</span>
                    <span className="font-medium">
                      {numberOfNights === 1 ? 'Night' : 'Nights'}
                    </span>
                  </div>
                </div>

                {/* Check-in and Check-out Dates - Side by Side on Desktop */}
                <div className="grid gap-4">
                  <div className="flex justify-between p-3 rounded-lg border border-border bg-muted/50">
                    <div className="flex-1 px-3 border-r border-border">
                      <div className="flex gap-2 items-center text-muted-foreground">
                        <p className="text-xs font-medium uppercase">
                          Check-in
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {formatDateToLongFormat(bookingData.checkInDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeToAMPM(bookingData.checkInTime, true)}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 px-3">
                      <div className="flex gap-2 items-center text-muted-foreground">
                        <p className="text-xs font-medium uppercase">
                          Check-out
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {formatDateToLongFormat(bookingData.checkOutDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeToAMPM(bookingData.checkOutTime, false)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-5 border-t">
                  {/* Number of Guests */}
                  <div className="flex gap-4 items-start">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                        Guests
                      </p>
                      <p className="font-bold text-foreground">
                        {totalGuests} {totalGuests === 1 ? 'Guest' : 'Guests'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {bookingData.numberOfAdults}{' '}
                        {bookingData.numberOfAdults === 1 ? 'Adult' : 'Adults'}
                        {bookingData.numberOfChildren > 0 &&
                          ` • ${bookingData.numberOfChildren} ${
                            bookingData.numberOfChildren === 1
                              ? 'Child'
                              : 'Children'
                          }`}
                      </p>
                    </div>
                  </div>

                  {/* Guest Names */}
                  <div className="flex gap-4 items-start">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                        Guest Names
                      </p>
                      <div className="space-y-1.5">
                        {guestNames.map((name, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <div
                              className={`w-1.5 h-1.5 rounded-full bg-muted-foreground`}
                            />
                            <p
                              className={`text-base ${
                                index === 0
                                  ? 'font-bold text-foreground'
                                  : 'text-foreground'
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
                  <div className="pt-5 space-y-4 border-t">
                    <div className="flex gap-4 items-start">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                          Email
                        </p>
                        <p className="text-sm break-all text-foreground">
                          {bookingData.guestEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                          Phone
                        </p>
                        <p className="text-sm text-foreground">
                          {bookingData.guestPhoneNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pet Information */}
                  {bookingData.hasPets && bookingData.petName && (
                    <div className="pt-5 border-t">
                      <div className="flex gap-4 items-start p-4 bg-amber-50 rounded-lg border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
                        <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/40">
                          <PawPrint className="w-5 h-5 text-amber-700 dark:text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="mb-1 text-xs font-medium text-amber-700 uppercase dark:text-amber-500">
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
      </div>

      <div className="space-y-3 w-full max-w-xl">
        <Button
          className="w-full h-12 text-base font-medium"
          variant="outline"
          onClick={handleViewForm}
        >
          View or Update Information
        </Button>
      </div>
    </div>
  );
}
