export interface GuestFormData {
  // Unit and Owner Information
  unitOwner: string;
  towerAndUnitNumber: string;
  ownerOnsiteContactPerson: string;
  ownerContactNumber: string;

  // Guest Information
  guestFacebookName: string;
  primaryGuestName: string;
  guestEmail: string;
  guestPhoneNumber: string;
  guestAddress: string;
  nationality: string;

  // Check-in/out Information
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  checkOutTime: string;
  numberOfNights: number;

  // Guest Count
  numberOfAdults: number;
  numberOfChildren: number;

  // Additional Guests
  guest2Name?: string;
  guest3Name?: string;
  guest4Name?: string;
  guest5Name?: string;

  // Special Requests
  guestSpecialRequests?: string;

  // Marketing Information
  findUs?: string;
  findUsDetails?: string;

  // Parking Information
  needParking: boolean;
  carPlateNumber?: string;
  carBrandModel?: string;
  carColor?: string;

  // Pet Information
  hasPets: boolean;
  petName?: string;
  petBreed?: string;
  petAge?: string;
  petVaccinationDate?: string;

  // Payment Information
  paymentReceiptUrl?: string;
  paymentReceiptFileName?: string;
} 