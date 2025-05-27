import { GuestFormData } from "@/features/guest-form/schemas/guestFormSchema";
import { formatDateToMMDDYYYY, formatTimeToAMPM } from "./dates";
import dayjs from "dayjs";

export const toCapitalCase = (text: string): string => {
  if (!text) return text;
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper to handle empty strings
export const handleEmptyString = (value: string | undefined): string | undefined => {
  if (!value || value.trim() === '') return undefined;
  return value;
};

export const transformFieldValues = (values: GuestFormData) => {
  // Calculate number of nights
  const checkIn = dayjs(values.checkInDate);
  const checkOut = dayjs(values.checkOutDate);
  const numberOfNights = Math.ceil((checkOut.valueOf() - checkIn.valueOf()) / (1000 * 60 * 60 * 24));

  return {
    ...values,
    // Unit and Owner Information (with defaults)
    unitOwner: 'Arianna Perez',
    towerAndUnitNumber: 'Monaco 2604',
    ownerOnsiteContactPerson: 'Arianna Perez',
    ownerContactNumber: '0962 541 2941',
    
    // Primary Guest Information
    guestFacebookName: toCapitalCase(values.guestFacebookName),
    primaryGuestName: toCapitalCase(values.primaryGuestName),
    guestEmail: values.guestEmail,
    guestPhoneNumber: values.guestPhoneNumber,
    guestAddress: toCapitalCase(values.guestAddress),
    nationality: toCapitalCase(values.nationality || 'Filipino'),
    
    // Check-in/out Information
    checkInDate: formatDateToMMDDYYYY(values.checkInDate),
    checkOutDate: formatDateToMMDDYYYY(values.checkOutDate),
    checkInTime: formatTimeToAMPM(values.checkInTime, true),
    checkOutTime: formatTimeToAMPM(values.checkOutTime, false),
    numberOfNights: numberOfNights,
    
    // Guest Count
    numberOfAdults: Math.max(1, Number(values.numberOfAdults) || 1),
    numberOfChildren: Math.max(0, Number(values.numberOfChildren) || 0),
    
    // Additional Guests
    guest2Name: handleEmptyString(values.guest2Name ? toCapitalCase(values.guest2Name) : undefined),
    guest3Name: handleEmptyString(values.guest3Name ? toCapitalCase(values.guest3Name) : undefined),
    guest4Name: handleEmptyString(values.guest4Name ? toCapitalCase(values.guest4Name) : undefined),
    guest5Name: handleEmptyString(values.guest5Name ? toCapitalCase(values.guest5Name) : undefined),
    
    // Parking Information
    carPlateNumber: values.needParking ? handleEmptyString(values.carPlateNumber) : undefined,
    carBrandModel: values.needParking ? handleEmptyString(values.carBrandModel ? toCapitalCase(values.carBrandModel) : undefined) : undefined,
    carColor: values.needParking ? handleEmptyString(values.carColor ? toCapitalCase(values.carColor) : undefined) : undefined,
    
    // Pet Information
    petName: values.hasPets ? handleEmptyString(values.petName ? toCapitalCase(values.petName) : undefined) : undefined,
    petBreed: values.hasPets ? handleEmptyString(values.petBreed ? toCapitalCase(values.petBreed) : undefined) : undefined,
    petAge: values.hasPets ? handleEmptyString(values.petAge) : undefined,
    petVaccinationDate: values.hasPets ? (values.petVaccinationDate ? formatDateToMMDDYYYY(values.petVaccinationDate) : undefined) : undefined,
    
    // Other Information
    findUs: values.findUs,
    findUsDetails: handleEmptyString(values.findUsDetails ? toCapitalCase(values.findUsDetails) : undefined),
    guestSpecialRequests: handleEmptyString(values.guestSpecialRequests)
  }
}
