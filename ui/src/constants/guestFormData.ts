import { GuestFormData } from "@/lib/schemas/guestFormSchema";
import { getDefaultDates, formatDateToYYYYMMDD } from "@/utils/dates";

const { today, tomorrow } = getDefaultDates();

export const defaultFormValues: Partial<GuestFormData> = {
    guestFacebookName: '',
    primaryGuestName: '',
    guestEmail: '',
    guestPhoneNumber: '',
    guestAddress: '',
    checkInDate: formatDateToYYYYMMDD(today),
    checkOutDate: formatDateToYYYYMMDD(tomorrow),
    checkInTime: '14:00',
    checkOutTime: '11:00',
    nationality: 'Filipino',
    numberOfAdults: 2,
    numberOfChildren: 0,
    guestSpecialRequests: '',
    findUs: 'Facebook',
    needParking: false,
    hasPets: false,
  };
