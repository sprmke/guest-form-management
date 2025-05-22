import { z } from "zod";
import dayjs from "dayjs";
import { guestFormSchema } from "@/lib/schemas/guestFormSchema";

const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa', 'Juan', 'Maria', 'Pedro', 'Ana', 'Luis', 'Elena', 'Miguel', 'Laura', 'Diego', 'Sofia', 'Gabriel', 'Camila', 'Daniel', 'Valeria', 'Alejandro', 'Isabella', 'Juan', 'Maria', 'Pedro', 'Ana', 'Luis', 'Elena', 'Miguel', 'Laura', 'Diego', 'Sofia', 'Gabriel', 'Camila', 'Daniel', 'Valeria', 'Alejandro', 'Isabella'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const cities = ['San Fernando', 'Angeles', 'Mabalacat', 'Manila', 'Quezon', 'Makati', 'Pasig', 'Taguig'];
const provinces = ['Pampanga', 'Metro Manila', 'Bulacan', 'Bataan', 'Zambales', 'Cavite', 'Laguna', 'Batangas'];
const findUsSources = ['Facebook', 'Airbnb', 'Tiktok', 'Instagram', 'Friend', 'Others'];
const carBrands = ['Toyota Vios', 'Honda Civic', 'Ford Ranger', 'Mitsubishi Xpander', 'Nissan Navara'];
const carColors = ['Black', 'White', 'Silver', 'Red', 'Blue', 'Gray'];
const petNames = ['Max', 'Luna', 'Bella', 'Charlie', 'Lucy', 'Milo', 'Daisy', 'Rocky'];
const petBreeds = ['Labrador', 'Golden Retriever', 'German Shepherd', 'Bulldog', 'Poodle', 'Persian Cat', 'Siamese Cat', 'Maine Coon'];
const petAges = ['1 year old', '2 years old', '3 years old', '4 years old', '5 years old', '6 months old', '8 months old'];
const requests = [
  'Early check-in if possible',
  'Late check-out needed',
  'Extra towels please',
  'Ground floor preferred',
  'Quiet room requested',
  'Need extra pillows',
  'Prefer higher floor',
  'No pets allowed',
  'No smoking allowed',
  'No parties allowed',
  'No loud music allowed',
  'No late check-out',
  'No early check-in',
  'No pets allowed',
];

const randomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

// Generate a valid name with at least 2 words, each word >= 2 characters
const generateRandomName = () => {
  const firstName = randomElement(firstNames);
  const middleInitial = randomElement(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  const lastName = randomElement(lastNames);
  return `${firstName} ${middleInitial}. ${lastName}`;
};

// Generate a valid plate number format
const generateRandomPlate = () => {
  const letters = randomElement(['ABC', 'XYZ', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', 'YZA']);
  const numbers = randomNumber(100, 999);
  return `${letters} ${numbers}`;
};

// Generate a valid phone number starting with 09
const generateRandomPhoneNumber = () => {
  return `09${randomNumber(100000000, 999999999)}`;
};

// Generate a valid address in "City, Province" format
const generateRandomAddress = () => {
  return `${randomElement(cities)}, ${randomElement(provinces)}`;
};

const generateDummyImage = (prefix: string) => {
  const formattedDateTime = dayjs().format('YYYY-MM-DD_HH-mm-ss');
  
  const width = 800;
  const height = 600;
  const backgroundColor = '808080';
  const textColor = 'FFFFFF';
  return `https://dummyimage.com/${width}x${height}/${backgroundColor}/${textColor}&text=${prefix}_${formattedDateTime}`;
};

const generateDummyFile = async (prefix: string): Promise<File> => {
  const url = generateDummyImage(prefix);
  const filename = `${prefix.toLowerCase()}_${dayjs().valueOf()}.jpg`;
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'image/jpeg' });
};

// Set dummy file in file input
export const setDummyFile = (fileInputRef: React.RefObject<HTMLInputElement>, file: File | null) => {
  if (!fileInputRef.current || !file) return;

  // Create a DataTransfer object
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  // Set the files
  fileInputRef.current.files = dataTransfer.files;
};

export const generateRandomData = async (): Promise<z.infer<typeof guestFormSchema>> => {
  const fullName = generateRandomName();
  
  // Generate a date between today and next 30 days for check-in
  const today = dayjs();
  const checkIn = today.add(randomNumber(1, 30), 'day').format('YYYY-MM-DD');
  
  // Generate check-out date 1-7 days after check-in
  const checkOut = dayjs(checkIn).add(randomNumber(1, 7), 'day').format('YYYY-MM-DD');

  // Generate vaccination date between 1-12 months ago
  const lastVaccination = today.subtract(randomNumber(1, 12), 'month').format('YYYY-MM-DD');

  // Generate random number of adults (1-3) and children (0-3) with total <= 4
  const numberOfAdults = Math.max(1, Math.min(3, Math.floor(Math.random() * 3) + 1));
  const maxChildren = Math.min(3, 4 - numberOfAdults);
  const numberOfChildren = Math.floor(Math.random() * (maxChildren + 1));

  // Generate additional guest names based on total guests
  const totalGuests = numberOfAdults + numberOfChildren;
  const guest2Name = totalGuests >= 2 ? generateRandomName() : undefined;
  const guest3Name = totalGuests >= 3 ? generateRandomName() : undefined;
  const guest4Name = totalGuests >= 4 ? generateRandomName() : undefined;

  const needParking = Math.random() > 0.5;
  const hasPets = Math.random() > 0.5;

  // Generate dummy files
  const paymentReceipt = await generateDummyFile('PaymentReceipt');
  const validId = await generateDummyFile('ValidId');
  const petVaccination = hasPets ? await generateDummyFile('PetVaccination') : undefined;
  const petImage = hasPets ? await generateDummyFile('PetImage') : undefined;

  // Calculate number of nights using dayjs
  const numberOfNights = dayjs(checkOut).diff(dayjs(checkIn), 'day');

  const findUs = randomElement(findUsSources);
  const findUsDetails = findUs === 'Friend' 
    ? `${generateRandomName()} recommended your place`
    : findUs === 'Others'
    ? randomElement([
        'Google search',
        'Walk-in inquiry',
        'Property agent referral',
        'Local community group',
        'Travel blog recommendation',
        'Instagram ad',
        'Facebook Marketplace',
        'TikTok video',
        'YouTube vlog',
        'Real estate website',
        'Airbnb listing',
        'Travel agency',
        'Corporate booking',
        'Previous guest'
      ])
    : undefined;

  return {
    guestFacebookName: fullName,
    primaryGuestName: fullName,
    guestEmail: `${fullName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
    guestPhoneNumber: generateRandomPhoneNumber(),
    guestAddress: generateRandomAddress(),
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guest2Name,
    guest3Name,
    guest4Name,
    guestSpecialRequests: randomElement(requests),
    findUs,
    findUsDetails,
    needParking,
    carPlateNumber: needParking ? generateRandomPlate() : undefined,
    carBrandModel: needParking ? randomElement(carBrands) : undefined,
    carColor: needParking ? randomElement(carColors) : undefined,
    hasPets,
    petName: hasPets ? randomElement(petNames) : undefined,
    petBreed: hasPets ? randomElement(petBreeds) : undefined,
    petAge: hasPets ? randomElement(petAges) : undefined,
    petVaccinationDate: hasPets ? lastVaccination : undefined,
    petVaccination,
    petImage,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    nationality: "Filipino",
    numberOfAdults,
    numberOfChildren,
    numberOfNights,
    paymentReceipt,
    validId,
    unitOwner: "Arianna Perez",
    towerAndUnitNumber: "Monaco 2604",
    ownerOnsiteContactPerson: "Arianna Perez",
    ownerContactNumber: "0962 541 2941"
  };
};
