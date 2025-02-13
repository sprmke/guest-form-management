import { GuestFormData } from "@/lib/schemas/guestFormSchema";

export const defaultFormValues: GuestFormData = {
    guestFacebookName: '',
    primaryGuestName: '',
    guestEmail: '',
    guestPhoneNumber: '',
    guestAddress: '',
    checkInDate: '',
    checkOutDate: '',
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
