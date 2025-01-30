import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"

const formatTimeToAMPM = (time: string, isCheckIn: boolean = false): string => {
  try {
    // Handle empty or invalid input
    if (!time) {
      return isCheckIn ? "02:00 pm" : "11:00 am"
    }
    
    // Split the time into hours and minutes
    const [hours, minutes] = time.split(':').map(num => parseInt(num))
    
    // Handle invalid numbers
    if (isNaN(hours) || isNaN(minutes)) {
      return isCheckIn ? "02:00 pm" : "11:00 am"
    }
    
    // Determine period and format hour
    const period = hours >= 12 ? 'pm' : 'am'
    const formattedHour = (hours % 12 || 12).toString().padStart(2, '0')
    const formattedMinutes = minutes.toString().padStart(2, '0')
    
    // Return formatted time
    return `${formattedHour}:${formattedMinutes} ${period}`
  } catch (error) {
    console.error('Error formatting time:', error)
    return isCheckIn ? "02:00 pm" : "11:00 am"
  }
}

const formSchema = z.object({
  guestFacebookName: z.string().min(2, "Facebook name must be at least 2 characters"),
  primaryGuestName: z.string().min(2, "Full name must be at least 2 characters"),
  guestEmail: z.string().email("Invalid email address"),
  guestPhoneNumber: z.string().min(10, "Contact number must be at least 10 digits"),
  guestAddress: z.string().min(5, "Address must be at least 5 characters"),
  checkInDate: z.string().min(1, "Please select check-in date"),
  checkOutDate: z.string().min(1, "Please select check-out date"),
  guest2Name: z.string().optional(),
  guest3Name: z.string().optional(),
  guest4Name: z.string().optional(),
  guest5Name: z.string().optional(),
  guestSpecialRequests: z.string().optional(),
  findUs: z.string().min(1, "Please select how you found us"),
  needParking: z.boolean().default(false),
  carPlateNumber: z.string().optional(),
  carBrandModel: z.string().optional(),
  carColor: z.string().optional(),
  hasPets: z.boolean().default(false),
  petName: z.string().optional(),
  petBreed: z.string().optional(),
  petAge: z.string().optional(),
  petVaccinationDate: z.string().optional(),
  checkInTime: z.string().default("14:00"),
  checkOutTime: z.string().default("11:00"),
  nationality: z.string().default("Filipino"),
  numberOfAdults: z.number().min(1),
  numberOfChildren: z.number().min(0),
})

const generateRandomData = () => {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Chris', 'Lisa']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
  const streets = ['Main St', 'Oak Ave', 'Maple Rd', 'Cedar Ln', 'Pine Dr', 'Elm St', 'Park Ave']
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia']
  const findUsSources = ['Facebook', 'Instagram', 'Friend', 'Google', 'Other']
  const requests = [
    'Early check-in if possible',
    'Late check-out needed',
    'Extra towels please',
    'Ground floor preferred',
    'Quiet room requested',
    ''
  ]
  const carBrands = ['Toyota Camry', 'Honda Civic', 'Ford Mustang', 'BMW 3 Series', 'Mercedes C-Class']
  const carColors = ['Black', 'White', 'Silver', 'Red', 'Blue', 'Gray']
  const petNames = ['Max', 'Luna', 'Bella', 'Charlie', 'Lucy', 'Milo', 'Daisy', 'Rocky']
  const petBreeds = ['Labrador', 'Golden Retriever', 'German Shepherd', 'Bulldog', 'Poodle', 'Persian Cat', 'Siamese Cat', 'Maine Coon']

  const randomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
  const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)
  const generateRandomName = () => `${randomElement(firstNames)} ${randomElement(lastNames)}`
  const generateRandomPlate = () => `${randomElement(['A', 'B', 'C', 'D', 'E'])}${randomNumber(100, 999)}${randomElement(['X', 'Y', 'Z'])}${randomNumber(10, 99)}`
  
  const firstName = randomElement(firstNames)
  const lastName = randomElement(lastNames)
  const fullName = `${firstName} ${lastName}`
  
  // Generate a date between today and next 30 days for check-in
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + randomNumber(1, 30))
  const checkIn = futureDate.toISOString().split('T')[0]
  
  // Generate check-out date 1-7 days after check-in
  const checkOutDate = new Date(futureDate)
  checkOutDate.setDate(futureDate.getDate() + randomNumber(1, 7))
  const checkOut = checkOutDate.toISOString().split('T')[0]

  // Generate vaccination date between 1-12 months ago
  const vaccinationDate = new Date()
  vaccinationDate.setMonth(vaccinationDate.getMonth() - randomNumber(1, 12))
  const lastVaccination = vaccinationDate.toISOString().split('T')[0]

  // Randomly decide how many additional guests (0-4)
  const numAdditionalGuests = randomNumber(0, 4)
  const additionalGuests = Array(4).fill('').map((_, index) => 
    index < numAdditionalGuests ? generateRandomName() : ''
  )

  const needParking = Math.random() > 0.5
  const hasPets = Math.random() > 0.5

  return {
    guestFacebookName: `${fullName} FB`,
    primaryGuestName: fullName,
    guestEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    guestPhoneNumber: `${randomNumber(100, 999)}${randomNumber(100, 999)}${randomNumber(1000, 9999)}`,
    guestAddress: `${randomNumber(1, 999)} ${randomElement(streets)}, ${randomElement(cities)}`,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    guest2Name: additionalGuests[0],
    guest3Name: additionalGuests[1],
    guest4Name: additionalGuests[2],
    guest5Name: additionalGuests[3],
    guestSpecialRequests: randomElement(requests),
    findUs: randomElement(findUsSources),
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
    numberOfAdults: randomNumber(1, 4),
    numberOfChildren: randomNumber(0, 3),
  }
}

export function GuestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: generateRandomData()
  })

  // Generate new random data on page load
  useEffect(() => {
    form.reset(generateRandomData())
  }, [])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const formData = {
        unitOwner: 'Arianna Perez',
        towerAndUnitNumber: 'Monaco 2604',
        ownerOnsiteContactPerson: 'Arianna Perez',
        guestFacebookName: values.guestFacebookName,
        primaryGuestName: values.primaryGuestName,
        guestEmail: values.guestEmail,
        guestPhoneNumber: values.guestPhoneNumber,
        guestAddress: values.guestAddress,
        checkInDate: values.checkInDate,
        checkOutDate: values.checkOutDate,
        guest2Name: values.guest2Name ?? '',
        guest3Name: values.guest3Name ?? '',
        guest4Name: values.guest4Name ?? '',
        guest5Name: values.guest5Name ?? '',
        guestSpecialRequests: values.guestSpecialRequests ?? '',
        findUs: values.findUs,
        needParking: values.needParking,
        carPlateNumber: values.carPlateNumber ?? '',
        carBrandModel: values.carBrandModel ?? '',
        carColor: values.carColor ?? '',
        hasPets: values.hasPets,
        petName: values.petName ?? '',
        petBreed: values.petBreed ?? '',
        petAge: values.petAge ?? '',
        petVaccinationDate: values.petVaccinationDate ?? '',
        checkInTime: formatTimeToAMPM(values.checkInTime, true),
        checkOutTime: formatTimeToAMPM(values.checkOutTime, false),
        nationality: values.nationality,
        numberOfAdults: values.numberOfAdults,
        numberOfChildren: values.numberOfChildren,
      }

      const apiUrl = import.meta.env.VITE_API_URL

      const response = await fetch(`${apiUrl}/api/submit-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (!result.success) {
        const errorMessage = result.error ?? result.details ?? `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      form.reset(generateRandomData())
      setSubmitError(null)
      alert('Form submitted successfully!')
    } catch (error) {
      console.error('Error submitting form:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred. Please try again.'
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate total number of additional guests needed, capped at 4
  const totalGuests = (form.watch("numberOfAdults") || 1) + (form.watch("numberOfChildren") || 0)
  const additionalGuestsNeeded = Math.min(4, Math.max(0, totalGuests - 1)) // Cap at 4 additional guests

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex justify-end mb-4">
          <Button type="button" variant="outline" onClick={() => form.reset(generateRandomData())}>
            Generate New Data
          </Button>
        </div>

        {submitError && (
          <div className="relative px-4 py-3 mb-4 text-red-700 bg-red-50 rounded border border-red-200" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{submitError}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="guestFacebookName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Facebook Name *</FormLabel>
              <FormControl>
                <Input placeholder="Your username/name in Facebook" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="primaryGuestName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Guest Name *</FormLabel>
              <FormControl>
                <Input placeholder="Full name of Primary Guest" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guestEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Ex. juandelacruz@gmail.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guestPhoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Phone Number *</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="Ex. 0987 654 3210" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guestAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Address *</FormLabel>
              <FormControl>
                <Input placeholder="City, Province" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkInDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkInTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Time</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    placeholder="02:00 pm"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Will be formatted as "02:00 pm"
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkOutDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-out Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkOutTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-out Time</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    placeholder="11:00 am"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Will be formatted as "11:00 am"
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nationality</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex. Filipino" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="numberOfAdults"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Adults</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    {...field}
                    onChange={e => {
                      const value = parseInt(e.target.value) || 1;
                      const validValue = Math.max(1, value);
                      field.onChange(validValue);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numberOfChildren" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Children</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0"
                    {...field}
                    onChange={e => {
                      const value = parseInt(e.target.value) || 0;
                      const validValue = Math.max(0, value);
                      field.onChange(validValue);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dynamic Additional Guests Fields */}
        {additionalGuestsNeeded > 0 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">Additional Guests</label>
            {Array.from({ length: additionalGuestsNeeded }).map((_, index) => (
              <FormField
                key={index}
                control={form.control}
                name={`guest${index + 2}Name` as keyof z.infer<typeof formSchema>}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder={`Guest ${index + 2} Name`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        )}

        <FormField
          control={form.control}
          name="guestSpecialRequests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Requests</FormLabel>
              <FormControl>
                <Textarea placeholder="Any special requests or notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="findUs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How did you find us? *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select how you found us" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Google">Tiktok</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="needParking"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Input
                    type="checkbox"
                    checked={field.value as boolean}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Need Parking?</FormLabel>
              </FormItem>
            )}
          />

          {form.watch("needParking") && (
            <div className="pl-6 space-y-4">
              <FormField
                control={form.control}
                name="carPlateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Plate Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. ABC123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carBrandModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Brand & Model</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Honda Civic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car Color</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Red" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <FormField
            control={form.control}
            name="hasPets"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Input
                    type="checkbox"
                    checked={field.value as boolean}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">Bringing Pets?</FormLabel>
              </FormItem>
            )}
          />

          {form.watch("hasPets") && (
            <div className="pl-6 space-y-4">
              <FormField
                control={form.control}
                name="petName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Max" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="petBreed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Breed</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. Labrador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="petAge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Age</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex. 2 years old" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="petVaccinationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Vaccination Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </Form>
  )
}