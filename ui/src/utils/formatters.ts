import { GuestFormData } from "@/lib/schemas/guestFormSchema";

export const toCapitalCase = (text: string): string => {
  if (!text) return text;
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}-${day}-${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const formatTimeToAMPM = (time: string, isCheckIn: boolean = false): string => {
  try {
    // Handle empty or invalid input
    if (!time) {
      return isCheckIn ? "02:00 PM" : "11:00 AM"
    }
    
    // Split the time into hours and minutes
    const [hours, minutes] = time.split(':').map(num => parseInt(num))
    
    // Handle invalid numbers
    if (isNaN(hours) || isNaN(minutes)) {
      return isCheckIn ? "02:00 PM" : "11:00 AM"
    }
    
    // Determine period and format hour
    const period = hours >= 12 ? 'PM' : 'AM'
    const formattedHour = (hours % 12 || 12).toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')
    
    // Return formatted time
    return `${formattedHour}:${formattedMinutes} ${period}`
  } catch (error) {
    console.error('Error formatting time:', error)
    return isCheckIn ? "02:00 PM" : "11:00 AM"
  }
} 

// Helper to handle empty strings
export const handleEmptyString = (value: string | undefined): string | undefined => {
  if (!value || value.trim() === '') return undefined;
  return value;
};

export const transformFieldValues = (values: GuestFormData) => {
  // Calculate number of nights
  const checkIn = new Date(values.checkInDate);
  const checkOut = new Date(values.checkOutDate);
  const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

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
    checkInDate: formatDate(values.checkInDate),
    checkOutDate: formatDate(values.checkOutDate),
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
    petVaccinationDate: values.hasPets ? (values.petVaccinationDate ? formatDate(values.petVaccinationDate) : undefined) : undefined,
    
    // Other Information
    findUs: values.findUs,
    findUsDetails: handleEmptyString(values.findUsDetails ? toCapitalCase(values.findUsDetails) : undefined),
    guestSpecialRequests: handleEmptyString(values.guestSpecialRequests)
  }
}
