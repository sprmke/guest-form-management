import { z } from "zod";
import { guestFormSchema } from "@/lib/schemas/guestFormSchema";

const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const streets = ['Main St', 'Oak Ave', 'Maple Rd', 'Cedar Ln', 'Pine Dr', 'Elm St', 'Park Ave'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
const findUsSources = ['Facebook', 'Instagram', 'Friend', 'Google', 'Other'];
const findUsDetails = [
  'John Smith recommended us',
  'Maria Garcia told me about your place',
  'Found through local community',
  'Travel blog recommendation',
  ''
];
const requests = [
  'Early check-in if possible',
  'Late check-out needed',
  'Extra towels please',
  'Ground floor preferred',
  'Quiet room requested',
  ''
];
const carBrands = ['Toyota Camry', 'Honda Civic', 'Ford Mustang', 'BMW 3 Series', 'Mercedes C-Class'];
const carColors = ['Black', 'White', 'Silver', 'Red', 'Blue', 'Gray'];
const petNames = ['Max', 'Luna', 'Bella', 'Charlie', 'Lucy', 'Milo', 'Daisy', 'Rocky'];
const petBreeds = ['Labrador', 'Golden Retriever', 'German Shepherd', 'Bulldog', 'Poodle', 'Persian Cat', 'Siamese Cat', 'Maine Coon'];

const randomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
const generateRandomName = () => `${randomElement(firstNames)} ${randomElement(lastNames)}`;
const generateRandomPlate = () => `${randomElement(['A', 'B', 'C', 'D', 'E'])}${randomNumber(100, 999)}${randomElement(['X', 'Y', 'Z'])}${randomNumber(10, 99)}`;

const generateDummyImage = (prefix: string) => {
  const now = new Date();
  const formattedDateTime = now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).replace(/[/,]/g, '-').replace(/:/g, '-').replace(/\s/g, '_');
  
  const width = 800;
  const height = 600;
  const backgroundColor = '808080';
  const textColor = 'FFFFFF';
  return `https://dummyimage.com/${width}x${height}/${backgroundColor}/${textColor}&text=${prefix}_${formattedDateTime}`;
};

const generateDummyFile = async (prefix: string): Promise<File> => {
  const url = generateDummyImage(prefix);
  const filename = `${prefix.toLowerCase()}_${new Date().getTime()}.jpg`;
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

export async function generateRandomData(): Promise<z.infer<typeof guestFormSchema>> {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const fullName = `${firstName} ${lastName}`;
  
  // Generate a date between today and next 30 days for check-in
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + randomNumber(1, 30));
  const checkIn = futureDate.toISOString().split('T')[0];
  
  // Generate check-out date 1-7 days after check-in
  const checkOutDate = new Date(futureDate);
  checkOutDate.setDate(futureDate.getDate() + randomNumber(1, 7));
  const checkOut = checkOutDate.toISOString().split('T')[0];

  // Generate vaccination date between 1-12 months ago
  const vaccinationDate = new Date();
  vaccinationDate.setMonth(vaccinationDate.getMonth() - randomNumber(1, 12));
  const lastVaccination = vaccinationDate.toISOString().split('T')[0];

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
  const paymentReceipt = await generateDummyFile('Receipt');
  const validId = await generateDummyFile('ValidID');

  return {
    guestFacebookName: `${fullName} FB`,
    primaryGuestName: fullName,
    guestEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    guestPhoneNumber: `${randomNumber(100, 999)}${randomNumber(100, 999)}${randomNumber(1000, 9999)}`,
    guestAddress: `${randomNumber(1, 999)} ${randomElement(streets)}, ${randomElement(cities)}`,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guest2Name,
    guest3Name,
    guest4Name,
    guestSpecialRequests: randomElement(requests),
    findUs: randomElement(findUsSources),
    findUsDetails: randomElement(findUsDetails),
    needParking,
    carPlateNumber: needParking ? generateRandomPlate() : '',
    carBrandModel: needParking ? randomElement(carBrands) : '',
    carColor: needParking ? randomElement(carColors) : '',
    hasPets,
    petName: hasPets ? randomElement(petNames) : '',
    petBreed: hasPets ? randomElement(petBreeds) : '',
    petAge: hasPets ? `${randomNumber(1, 15)} years` : '',
    petVaccinationDate: hasPets ? lastVaccination : '',
    checkInTime: "14:00",
    checkOutTime: "11:00",
    nationality: "Filipino",
    numberOfAdults,
    numberOfChildren,
    numberOfNights: Math.ceil((checkOutDate.getTime() - futureDate.getTime()) / (1000 * 60 * 60 * 24)),
    paymentReceipt,
    validId,
    unitOwner: "Arianna Perez",
    towerAndUnitNumber: "Monaco 2604",
    ownerOnsiteContactPerson: "Arianna Perez",
    ownerContactNumber: "0962 541 2941"
  };
}
